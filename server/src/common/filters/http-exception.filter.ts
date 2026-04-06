import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.headers['x-request-id'] as string;

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      requestId,
      message: typeof message === 'string' ? message : (message as any).message || 'Error',
    };


    const errorMessage = exception instanceof Error ? exception.message : String(exception);
    const errorStack = exception instanceof Error ? exception.stack : undefined;

    if (status >= 500) {

      this.logger.error(
        `${request.method} ${request.url} [${status}] ${errorMessage}`,
        errorStack,
        { requestId, userId: (request as any).user?.id },
      );
    } else if (status >= 400 && status !== 401) {

      this.logger.warn(
        `${request.method} ${request.url} [${status}] ${errorResponse.message}`,
        { requestId, userId: (request as any).user?.id },
      );
    }


    response.status(status).json(errorResponse);
  }
}

