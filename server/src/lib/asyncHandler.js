/**
 * Wraps an async Express route handler so rejected promises become a clean
 * JSON error response instead of an unhandled rejection / raw stack trace
 * leaking to the client. Full error detail always goes to the server
 * console for debugging; the client only gets a short, safe message plus a
 * timestamp it can show in its own (collapsible) debug panel.
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} failed:`, err);
      if (res.headersSent) {
        next(err);
        return;
      }
      res.status(err.statusCode || 500).json({
        error: {
          message: err.publicMessage || err.message || 'Unexpected server error.',
          timestamp: new Date().toISOString(),
        },
      });
    });
  };
}

export class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.publicMessage = message;
  }
}
