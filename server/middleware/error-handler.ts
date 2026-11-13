import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error';

export interface StandardErrorResponse {
  code: string;
  error: string;
  message: string;
  details?: unknown;
  requestId?: string;
  stack?: string;
}

/**
 * Format Zod validation errors without leaking sensitive field values
 */
function formatZodIssues(error: ZodError): Array<{ path: string; message: string; code: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}

/**
 * Central Express Error-Handling Middleware
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const requestId = (req as any).id || req.headers['x-request-id']?.toString();

  // 1. Known AppError instances
  if (err instanceof AppError) {
    const response: StandardErrorResponse = {
      code: err.code,
      error: getHttpErrorTitle(err.statusCode),
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
      ...(requestId ? { requestId } : {}),
      ...(!isProduction && err.stack ? { stack: err.stack } : {}),
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // 2. Direct Zod validation errors
  if (err instanceof ZodError) {
    const response: StandardErrorResponse = {
      code: 'VALIDATION_ERROR',
      error: 'Bad Request',
      message: 'Request input validation failed',
      details: formatZodIssues(err),
      ...(requestId ? { requestId } : {}),
    };
    res.status(400).json(response);
    return;
  }

  // 3. SyntaxError (e.g. malformed JSON in body)
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      code: 'MALFORMED_JSON_BODY',
      error: 'Bad Request',
      message: 'Request body contains malformed JSON syntax',
      ...(requestId ? { requestId } : {}),
    });
    return;
  }

  // 4. Unexpected server exceptions (Fail-safe, non-leaking)
  const rawMessage = err instanceof Error ? err.message : String(err);
  console.error('[Central Error Handler] Unexpected exception:', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    error: rawMessage.replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=[REDACTED]'),
  });

  const response: StandardErrorResponse = {
    code: 'INTERNAL_SERVER_ERROR',
    error: 'Internal Server Error',
    message: isProduction
      ? 'An unexpected error occurred while processing your request'
      : rawMessage,
    ...(requestId ? { requestId } : {}),
    ...(!isProduction && err instanceof Error && err.stack ? { stack: err.stack } : {}),
  };

  res.status(500).json(response);
}

function getHttpErrorTitle(status: number): string {
  switch (status) {
    case 400: return 'Bad Request';
    case 401: return 'Unauthorized';
    case 403: return 'Forbidden';
    case 404: return 'Not Found';
    case 409: return 'Conflict';
    case 422: return 'Unprocessable Entity';
    default: return status >= 500 ? 'Internal Server Error' : 'Error';
  }
}

/**
 * Async handler wrapper to forward promise rejections to next()
 */
export function asyncHandler<T = any>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
