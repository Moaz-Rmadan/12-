import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { ValidationError } from '../errors/app-error';

export interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Format Zod validation issues without echoing raw sensitive input
 */
function sanitizeZodIssues(error: ZodError): Array<{ path: string; message: string; code: string }> {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}

/**
 * Express Middleware factory for request validation using Zod schemas
 */
export function validateRequest(schemas: ValidationSchemas) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // 1. Validate route params
      if (schemas.params) {
        const parsedParams = await schemas.params.parseAsync(req.params);
        (req as any).params = parsedParams;
      }

      // 2. Validate query params
      if (schemas.query) {
        const parsedQuery = await schemas.query.parseAsync(req.query);
        (req as any).query = parsedQuery;
      }

      // 3. Validate body
      if (schemas.body) {
        const parsedBody = await schemas.body.parseAsync(req.body);
        req.body = parsedBody;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = sanitizeZodIssues(error);
        const hasUnrecognized = issues.some((i) => i.code === 'unrecognized_keys');
        const message = hasUnrecognized
          ? 'Request contains unrecognized or unauthorized fields'
          : 'Request validation failed';

        next(new ValidationError(message, issues));
        return;
      }
      next(error);
    }
  };
}
