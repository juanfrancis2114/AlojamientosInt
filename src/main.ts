import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  ValidationPipe,
  HttpException,
  Catch,
  ExceptionFilter,
  ArgumentsHost,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { originalContract } from './modules/alojamientos/contract';
import { static as serveStatic } from 'express';
import { join } from 'path';
import { allowedOrigins } from './common/origins';

@Catch()
class ProblemFilter implements ExceptionFilter {
  catch(error: any, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const req = host.switchToHttp().getRequest();
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const body: any = error instanceof HttpException ? error.getResponse() : {};
    if (status === 500) console.error('Internal request failure', error.message);
    res
      .status(status)
      .type('application/problem+json')
      .json({
        type: 'about:blank',
        title: status === 500 ? 'Error interno' : error.message,
        status,
        detail: typeof body === 'string' ? body : body.message || 'La solicitud no pudo procesarse',
        instance: req.path,
        ...(body.errors ? { errors: body.errors } : {}),
      });
  }
}
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.setGlobalPrefix('api/v1');
  const origins = allowedOrigins();
  app.enableCors({
    origin: (origin, callback) => callback(null, !origin || origins.has(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Device-Fingerprint'],
    exposedHeaders: ['Location'],
    maxAge: 600,
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new ProblemFilter());
  const counters = new Map<string, { count: number; end: number }>();
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    if (!req.path.startsWith('/api/docs'))
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
      );
    if (req.path.startsWith('/api/v1')) res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
      let origin: string;
      try {
        origin = new URL(req.headers.origin).host;
      } catch {
        return res.status(403).json({ detail: 'Origen inválido' });
      }
      if (origin !== req.headers.host && !origins.has(req.headers.origin))
        return res.status(403).json({ detail: 'Origen no permitido' });
    }
    if (req.path.startsWith('/api/v1/auth/') && req.method === 'POST') {
      const key = req.ip;
      const old = counters.get(key);
      const item = old && old.end > Date.now() ? old : { count: 0, end: Date.now() + 60000 };
      item.count++;
      counters.set(key, item);
      if (counters.size > 10000)
        for (const [k, v] of counters) if (v.end < Date.now()) counters.delete(k);
      if (item.count > 20)
        return res.status(429).json({ detail: 'Demasiados intentos; espera un minuto' });
    }
    next();
  });
  app.use(serveStatic(join(process.cwd(), 'public')));
  const config = new DocumentBuilder()
    .setTitle('Kawsay Estancias · Alojamientos')
    .setDescription(
      'RDA 1 + seguridad RDA 3. JWT HS256, 1 hora, issuer/audience verificados y revocación al cerrar sesión. Cookie HttpOnly o Authorization Bearer. Reservas de demostración sin cobros reales; OAuth2 externo es futuro.',
    )
    .setVersion('1.1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .addCookieAuth('booking_session')
    .build();
  const document: any = SwaggerModule.createDocument(app, config);
  for (const path of Object.values(document.paths) as any[])
    for (const operation of Object.values(path) as any[]) {
      if (operation.security?.some((entry: any) => entry.cookie))
        operation.security = [{ bearer: [] }, { cookie: [] }];
    }
  document.components.schemas = {
    ...originalContract.components.schemas,
    ...document.components.schemas,
    AdminAccommodation: {
      type: 'object',
      required: [
        'nombre',
        'cityId',
        'descripcion',
        'direccion',
        'tipo',
        'image',
        'published',
        'precioPorNoche',
        'capacidadAdultos',
        'capacidadNinos',
        'habitaciones',
        'tienePiscina',
      ],
      properties: {
        nombre: { type: 'string' },
        cityId: { type: 'integer' },
        descripcion: { type: 'string' },
        direccion: { type: 'string' },
        tipo: { type: 'string' },
        image: { type: 'string', format: 'uri' },
        published: { type: 'boolean' },
        precioPorNoche: { type: 'number', minimum: 0.01 },
        capacidadAdultos: { type: 'integer', minimum: 1 },
        capacidadNinos: { type: 'integer', minimum: 0 },
        habitaciones: { type: 'integer', minimum: 1 },
        tienePiscina: { type: 'boolean' },
      },
    },
  };
  document.components.responses = originalContract.components.responses;
  for (const [path, value] of Object.entries(originalContract.paths)) {
    const operation: any = JSON.parse(JSON.stringify(value));
    for (const op of Object.values(operation) as any[])
      if (op.security?.length) op.security = [{ bearer: [] }, { cookie: [] }];
    document.paths['/api/v1' + path] = operation;
  }
  delete document.paths['/api/v1/{action}'];
  document.servers = [{ url: '/' }];
  SwaggerModule.setup('api/docs', app, document, { ui: false });
  app.use('/swagger', serveStatic(join(process.cwd(), 'public/swagger')));
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get(['/api/docs', '/api/docs/'], (_req: any, res: any) => res.sendFile(join(process.cwd(), 'public/swagger/index.html')));
  expressApp.get('/api/openapi.json', (_req: any, res: any) => res.json(document));
  expressApp.get('/admin', (_req: any, res: any) =>
    res.sendFile(join(process.cwd(), 'public/index.html')),
  );
  expressApp.get(['/reservas', '/login', '/perfil'], (_req: any, res: any) =>
    res.sendFile(join(process.cwd(), 'public/index.html')),
  );
  await app.listen(Number(process.env.PORT) || 3000, '0.0.0.0');
}
bootstrap();
