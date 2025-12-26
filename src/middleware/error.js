export function notFound(_req, _res, next) {
  const err = new Error('Not found');
  err.statusCode = 404;
  next(err);
}

export function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || 500;
  const message = err.message || 'Erreur inattendue';
  res.status(status).json({ error: message });
}
