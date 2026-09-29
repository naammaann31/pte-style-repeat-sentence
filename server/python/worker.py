"""
Long-running local speech-to-text worker used by the Node backend.

Keeps a faster-whisper model loaded in memory and transcribes audio files on
demand via a tiny line-delimited JSON protocol over stdin/stdout:

  request  (stdin,  one JSON object per line): {"id": "...", "audio_path": "..."}
  response (stdout, one JSON object per line): {"id": "...", "ok": true, "text": "...",
                                                 "words": [...], "language": "en", "duration": 3.9}

Running as a single persistent process (rather than spawning python fresh per
request) avoids reloading the model on every transcription, which matters
once there are many reference audios and many user attempts.

Runs fully offline after the first model download - no API key, no network
calls per request, no data leaving the machine.
"""
import sys
import json

from faster_whisper import WhisperModel


def log(message):
    sys.stderr.write(message + "\n")
    sys.stderr.flush()


def main():
    model_name = sys.argv[1] if len(sys.argv) > 1 else "small.en"
    device = sys.argv[2] if len(sys.argv) > 2 else "cpu"
    compute_type = sys.argv[3] if len(sys.argv) > 3 else "int8"

    log(f"[whisper-worker] loading model '{model_name}' (device={device}, compute_type={compute_type})...")
    model = WhisperModel(model_name, device=device, compute_type=compute_type)
    log("[whisper-worker] MODEL_READY")

    for raw_line in sys.stdin:
        line = raw_line.strip().lstrip("﻿")
        if not line:
            continue

        req_id = None
        try:
            req = json.loads(line)
            req_id = req.get("id")
            audio_path = req["audio_path"]

            segments, info = model.transcribe(audio_path, word_timestamps=True, vad_filter=True)

            words = []
            text_parts = []
            for seg in segments:
                text_parts.append(seg.text)
                if seg.words:
                    for w in seg.words:
                        words.append(
                            {
                                "word": w.word.strip(),
                                "start": round(w.start, 3),
                                "end": round(w.end, 3),
                                "probability": round(w.probability, 4),
                            }
                        )

            response = {
                "id": req_id,
                "ok": True,
                "text": "".join(text_parts).strip(),
                "words": words,
                "language": info.language,
                "duration": info.duration,
            }
        except Exception as exc:  # noqa: BLE001 - report back to Node, never crash the worker
            response = {"id": req_id, "ok": False, "error": str(exc)}

        print(json.dumps(response))
        sys.stdout.flush()


if __name__ == "__main__":
    main()
