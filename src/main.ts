import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    bodyParser: false, // Disable default body parser
  });
  app.use(cookieParser());

  // Configure JSON parser with raw body access for webhook route
  app.use('/webhooks/clerk', json({
    limit: '10mb',
    verify: (req: any, res: any, buf: Buffer) => {
      req.rawBody = buf.toString('utf8');
    }
  }));

  // Default JSON parser for other routes
  app.use(json({ limit: '5mb' }));

  // Add request logging middleware
  app.use((req: any, res: any, next: any) => {
    console.log(`Incoming ${req.method} request to ${req.url}`);
    next();
  });

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
