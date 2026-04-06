import { NestFactory } from '@nestjs/core';
import { ValidationPipe, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);


  (BigInt.prototype as any).toJSON = function() {
    return this.toString();
  };


  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: {
        action: 'deny',
      },
      xssFilter: true,
      noSniff: true,
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
    }),
  );


  app.use(
    compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
    }),
  );

  app.use(cookieParser());


  app.getHttpAdapter().getInstance().set('trust proxy', true);


  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  const allowedOrigins = [
    frontendUrl,
    'https://222prod.cc',
    'http://222prod.cc',
  ];


  if (corsOrigin) {
    allowedOrigins.push(corsOrigin);
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });


  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: process.env.NODE_ENV === 'production',
      exceptionFactory: (errors) => {
        return new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Validation failed',
            errors: errors.map((err) => ({
              property: err.property,
              constraints: err.constraints,
            })),
          },
          HttpStatus.BAD_REQUEST,
        );
      },
    }),
  );


  app.useGlobalFilters(new HttpExceptionFilter());


  const config = new DocumentBuilder()
    .setTitle('222prod.cc API')
    .setDescription('API для управления Discord скриптами')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);


  app.setGlobalPrefix('api');


  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });

  const port = configService.get('PORT', 3001);
  const nodeEnv = configService.get('NODE_ENV', 'development');
  const logger = new Logger('Bootstrap');

  await app.listen(port);


  logger.log(`Application started on port ${port} [${nodeEnv}]`);
  if (nodeEnv !== 'production') {
    logger.log(`API: http://localhost:${port}/api`);
    logger.log(`Swagger: http://localhost:${port}/api/docs`);
  }
}

bootstrap();
