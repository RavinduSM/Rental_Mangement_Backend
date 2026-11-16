import type { ErrorRequestHandler } from 'express';
import { UniqueConstraintError, ValidationError } from 'sequelize';
import { env } from '../config/env';
import AppError from '../utils/AppError';

// Converts errors we can recognise into an AppError so they get a proper 4xx
// instead of a generic 500. Anything unrecognised is returned unchanged.
function normalise(err: unknown): unknown {
  // Checked first: UniqueConstraintError is a subclass of ValidationError.
  if (err instanceof UniqueConstraintError) {
    return new AppError('That value is already in use', 409);
  }
  if (err instanceof ValidationError) {
    return new AppError(err.errors.map((e) => e.message).join('; '), 400);
  }
  return err;
}

// Centralised error handler. Every next(err) in the app ends up here.
// Express identifies error handlers by their four parameters, so `_next`
// must stay in the signature even though it is unused.
const errorHandler: ErrorRequestHandler = (rawErr, _req, res, _next) => {
  const err = normalise(rawErr);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(env.isProduction ? {} : { stack: err.stack }),
    });
    return;
  }

  // Not an error we threw on purpose: a bug. Log it; hide details in production.
  console.error('UNEXPECTED ERROR:', err);
  res.status(500).json({
    status: 'error',
    message: env.isProduction
      ? 'Something went wrong'
      : err instanceof Error
        ? err.message
        : String(err),
    ...(!env.isProduction && err instanceof Error ? { stack: err.stack } : {}),
  });
};

export default errorHandler;
