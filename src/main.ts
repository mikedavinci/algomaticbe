import { AppModule } from './app.module';
import express from 'express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    bodyParser: true, // Enable default body parser
  });
  app.use(cookieParser());

  // Configure JSON body parser with increased limit for webhooks
  app.use(json({
    limit: '5mb'
  }));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Algomatic API')
    .setDescription('The Algomatic API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 8001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
