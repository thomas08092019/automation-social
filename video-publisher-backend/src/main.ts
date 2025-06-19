import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import * as express from 'express';
// Phase 5: Error Handling Middleware
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { RequestContextInterceptor } from './shared/interceptors/request-context.interceptor';
import { AppLoggerService } from './shared/services/logger.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Configure Express middleware for JSON parsing
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Phase 5: Setup enhanced logging
  const logger = app.get(AppLoggerService);
  app.useLogger(logger);

  // Phase 5: Setup global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Phase 5: Setup request context interceptor
  const requestContextInterceptor = app.get(RequestContextInterceptor);
  app.useGlobalInterceptors(requestContextInterceptor);

  // Enable validation pipes globally (but allow query params for OAuth)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Changed to false to allow OAuth query params
      transform: true,
    }),
  );

  // Serve static files from uploads directory
  app.useStaticAssets(path.join(__dirname, '..', 'uploads'), {
    prefix: '/api/uploads/',
  });

  // Enable CORS
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];

  // Add ngrok URL if configured (mainly for TikTok OAuth)
  if (process.env.FRONTEND_NGROK_URL) {
    allowedOrigins.push(process.env.FRONTEND_NGROK_URL);
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
