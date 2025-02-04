import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    bodyParser: false, // Disable default body parser
  });
  app.use(cookieParser());

  // Parse raw body for webhooks
  app.use(
    json({
      verify: (req: any, res, buf) => {
        // Make raw body available for webhook signature verification
        req.rawBody = buf;
      },
    }),
  );

  // Configure JSON parser with higher limit for webhooks
  app.use('/webhooks/clerk', json({
    limit: '5mb',
  }));

  app.useGlobalPipes(new ValidationPipe());

  const port = process.env.PORT || 8001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
