import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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
  const allowedOrigins = ['http://localhost:3000'];
  
  // Add ngrok URL if configured (mainly for TikTok OAuth)
  if (process.env.FRONTEND_NGROK_URL) {
    allowedOrigins.push(process.env.FRONTEND_NGROK_URL);
    console.log(`CORS: Added ngrok URL for TikTok OAuth: ${process.env.FRONTEND_NGROK_URL}`);
  }
  
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
