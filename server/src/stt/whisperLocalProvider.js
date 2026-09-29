import { spawn } from 'node:child_process';
import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';

const WORKER_SCRIPT = path.join(config.rootDir, 'server', 'python', 'worker.py');

class WhisperLocalProvider {
  constructor() {
    this.child = null;
    this.rl = null;
    this.pending = new Map(); // id -> { resolve, reject, timeout }
    this.readyPromise = null;
    this.startFailure = null;
  }

  _checkPythonExists() {
    if (!fs.existsSync(config.whisper.pythonExecutable)) {
      throw new Error(
        `Python environment for local speech-to-text was not found at ` +
          `"${config.whisper.pythonExecutable}". Run "npm run setup:python" inside the ` +
          `server/ directory first (creates a venv and installs faster-whisper).`
      );
    }
  }

  /** Lazily spawn the worker process the first time it's needed. */
  _ensureStarted() {
    if (this.readyPromise) return this.readyPromise;

    this.readyPromise = new Promise((resolve, reject) => {
      try {
        this._checkPythonExists();
      } catch (err) {
        this.startFailure = err;
        reject(err);
        return;
      }

      const child = spawn(
        config.whisper.pythonExecutable,
        [WORKER_SCRIPT, config.whisper.model, config.whisper.device, config.whisper.computeType],
        { stdio: ['pipe', 'pipe', 'pipe'] }
      );
      this.child = child;

      const rl = readline.createInterface({ input: child.stdout });
      this.rl = rl;

      let resolvedReady = false;

      rl.on('line', (line) => {
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          return; // ignore non-JSON stdout noise
        }
        const pending = this.pending.get(msg.id);
        if (!pending) return;
        clearTimeout(pending.timeout);
        this.pending.delete(msg.id);
        if (msg.ok) {
          pending.resolve(msg);
        } else {
          pending.reject(new Error(msg.error || 'Unknown transcription error'));
        }
      });

      child.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        process.stderr.write(text);
        if (!resolvedReady && text.includes('MODEL_READY')) {
          resolvedReady = true;
          resolve();
        }
      });

      child.on('exit', (code) => {
        const err = new Error(`Local Whisper worker exited unexpectedly (code ${code}).`);
        if (!resolvedReady) reject(err);
        for (const [, pending] of this.pending) {
          clearTimeout(pending.timeout);
          pending.reject(err);
        }
        this.pending.clear();
        // Allow a future transcribe() call to respawn the worker.
        this.child = null;
        this.rl = null;
        this.readyPromise = null;
      });

      child.on('error', (err) => {
        this.startFailure = err;
        reject(err);
      });
    });

    return this.readyPromise;
  }

  async transcribe(filePath) {
    await this._ensureStarted();

    const id = crypto.randomUUID();
    const payload = JSON.stringify({ id, audio_path: filePath }) + '\n';

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Local speech-to-text timed out.'));
      }, config.whisper.requestTimeoutMs);

      this.pending.set(id, { resolve, reject, timeout });
      this.child.stdin.write(payload, (err) => {
        if (err) {
          clearTimeout(timeout);
          this.pending.delete(id);
          reject(err);
        }
      });
    });
  }
}

export const whisperLocalProvider = new WhisperLocalProvider();
