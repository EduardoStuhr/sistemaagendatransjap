const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET não definido em produção. Encerrando.');
  process.exit(1);
}

export const config = {
  port:       parseInt(process.env.PORT || '3001'),
  jwtSecret:  process.env.JWT_SECRET || 'dev_only_secret_change_in_production',
  jwtExpires: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl:  process.env.CLIENT_URL || 'http://localhost:5173',
  isProd,
};
