/**
 * Standard Application Error Architecture
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
    isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown, code = 'VALIDATION_ERROR') {
    super(400, code, message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(code = 'UNAUTHORIZED', message = 'Authentication is required') {
    super(401, code, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(code = 'FORBIDDEN', message = 'You do not have permission to perform this action') {
    super(403, code, message);
  }
}

export class NotFoundError extends AppError {
  constructor(code = 'NOT_FOUND', message = 'The requested resource was not found') {
    super(404, code, message);
  }
}

export class ConflictError extends AppError {
  constructor(code = 'CONFLICT', message = 'Conflict detected with current resource state') {
    super(409, code, message);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(code = 'UNPROCESSABLE_ENTITY', message = 'The request payload is unprocessable') {
    super(422, code, message);
  }
}

export class InternalServerError extends AppError {
  constructor(
    message = 'An unexpected internal server error occurred',
    details?: unknown,
    code = 'INTERNAL_SERVER_ERROR'
  ) {
    super(500, code, message, details, false);
  }
}
