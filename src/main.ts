import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { raw } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Enable CORS - allow all origins for webhooks
  app.enableCors({
    origin: '*',  // Allow all origins for webhooks
    credentials: true,
  });

  app.use(cookieParser());

  // Add raw body parser for webhook routes
  app.use('/webhook/clerk', raw({ 
    type: 'application/json',
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    }
  }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    })
  );

  const port = process.env.PORT || 8001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
