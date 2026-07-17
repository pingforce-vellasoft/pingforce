/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app/app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { PrismaClientExceptionFilter } from './common/filters/prisma-client-exception.filter';
import { DatabaseRetryInterceptor } from './common/interceptors/database-retry.interceptor';
import helmet from 'helmet';
import compression from 'compression';
import type { NextFunction, Request, Response } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';

// Audit hash-chain sequences are BigInt columns; JSON.stringify throws on
// bigint, so serialize them as strings in API responses.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function (
  this: bigint,
) {
  return this.toString();
};

async function bootstrap() {
  // rawBody: true preserves the untouched request buffer so payment-gateway
  // webhook signatures (billing module) can be verified against it.
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  app.useLogger(app.get(Logger));

  // Security Headers
  app.use(helmet());

  // Response compression — large JSON payloads (attendance logs, reports)
  // shrink ~80% for mobile clients on cellular links
  app.use(compression());

  // Bull Board (/queues) exposes job payloads — hidden entirely unless
  // BULL_BOARD_USER/BULL_BOARD_PASS are set, then guarded by basic auth
  const bbUser = process.env.BULL_BOARD_USER;
  const bbPass = process.env.BULL_BOARD_PASS;
  app.use(
    '/queues',
    (req: Request, res: Response, next: NextFunction): void => {
      if (!bbUser || !bbPass) {
        res.status(404).end();
        return;
      }
      const [scheme, encoded] = (req.headers.authorization ?? '').split(' ');
      if (scheme === 'Basic' && encoded) {
        const [user, pass] = Buffer.from(encoded, 'base64')
          .toString()
          .split(':');
        if (user === bbUser && pass === bbPass) {
          next();
          return;
        }
      }
      res.setHeader('WWW-Authenticate', 'Basic realm="queues"');
      res.status(401).end();
    },
  );

  // CORS — origins from env var (comma-separated)
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? [
      'http://localhost:4200',
    ],
    credentials: true,
  });

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(
    new GlobalExceptionFilter(),
    new PrismaClientExceptionFilter(),
  );

  app.useGlobalInterceptors(new DatabaseRetryInterceptor());

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('PingForce API')
    .setDescription('The PingForce HRMS API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  const logger = app.get(Logger);
  logger.log(
    `🚀 Application is running on: http://localhost:${port}/${globalPrefix}/v1`,
  );
}

bootstrap();
