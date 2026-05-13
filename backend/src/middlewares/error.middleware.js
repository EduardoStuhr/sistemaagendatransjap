const isProd = process.env.NODE_ENV === 'production';

export function errorMiddleware(err, _req, res, _next) {
  const status = err.status || err.statusCode || 500;

  // Em produção nunca expõe stack trace ou detalhes internos
  if (isProd) {
    if (status >= 500) console.error('[ERROR]', err);
    return res.status(status).json({
      error: status >= 500 ? 'Erro interno do servidor' : err.message,
    });
  }

  console.error(err);
  res.status(status).json({ error: err.message, stack: err.stack });
}
