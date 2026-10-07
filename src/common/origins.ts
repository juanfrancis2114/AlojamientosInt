export function allowedOrigins(env: NodeJS.ProcessEnv = process.env): Set<string> {
  const configured = [
    env.APP_ORIGIN,
    env.VERCEL_URL && 'https://' + env.VERCEL_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL && 'https://' + env.VERCEL_PROJECT_PRODUCTION_URL,
    ...(env.CORS_ORIGINS || '').split(','),
  ];
  if (!env.VERCEL && env.NODE_ENV !== 'production')
    configured.push(
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3101',
      'http://127.0.0.1:3102',
    );
  return new Set(
    configured.filter(Boolean).map((origin) => {
      const url = new URL(origin.trim());
      if (url.origin !== origin.trim() || !['http:', 'https:'].includes(url.protocol))
        throw new Error('CORS_ORIGINS y APP_ORIGIN deben contener orígenes exactos');
      return url.origin;
    }),
  );
}
