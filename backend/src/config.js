export const config = {
  port:       process.env.PORT       || 3001,
  jwtSecret:  process.env.JWT_SECRET || 'opsagenda_secret',
  jwtExpires: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl:  process.env.CLIENT_URL || 'http://localhost:5173',
};
