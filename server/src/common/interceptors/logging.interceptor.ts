import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const requestId = (request.headers['x-request-id'] as string) || uuidv4();


    response.setHeader('X-Request-ID', requestId);

    const startTime = Date.now();
    const userId = (request as any).user?.id;
    const isProduction = process.env.NODE_ENV === 'production';
    const logLevel = process.env.LOG_LEVEL || 'info';


    if (logLevel === 'debug') {
      this.logger.debug(`${method} ${url}`, { requestId, userId });
    }

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        const { statusCode } = response;
        const logLevel = process.env.LOG_LEVEL || 'info';


        if (duration > 1000) {
          this.logger.warn(`Slow: ${method} ${url} [${statusCode}] ${duration}ms`, {
            requestId,
            userId,
          });
        } else if (logLevel === 'debug' && statusCode >= 400) {

          this.logger.warn(`${method} ${url} [${statusCode}]`, { requestId, userId });
        }
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        const statusCode = error.status || 500;


        const errorMsg = error.message || 'Unknown error';
        const logLevel = process.env.LOG_LEVEL || 'info';
        this.logger.error(
          `Error: ${method} ${url} [${statusCode}] ${duration}ms - ${errorMsg}`,
          logLevel === 'debug' ? error.stack : undefined,
          { requestId, userId },
        );

        throw error;
      }),
    );
  }
}

