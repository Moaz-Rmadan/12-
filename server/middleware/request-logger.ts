import { Request, Response, NextFunction } from 'express';
import { logger, resolveRequestId } from '../logging/logger';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

/**
 * Express Middleware: Request tracing, safe ID attribution, and structured finish logging
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = resolveRequestId(req.headers['x-request-id']);

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const status = res.statusCode;
    const userId = req.user?.uid;

    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

    logger.log(level, `HTTP ${req.method} ${req.originalUrl || req.url}`, {
      requestId,
      method: req.method,
      url: req.baseUrl + (req.route?.path || req.path),
      status,
      durationMs,
      ...(userId ? { userId } : {}),
    });
  });

  next();
}
