import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const isCsrfEnabled = this.configService.get<boolean>('CSRF_ENABLED', false);

    if (!isCsrfEnabled) {
      return true;
    }


    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      return true;
    }


    const csrfToken = request.headers['x-csrf-token'] || request.body?.csrfToken;


    const cookieToken = request.cookies?.['csrf-token'];

    if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    return true;
  }
}

