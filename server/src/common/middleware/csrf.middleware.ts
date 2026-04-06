import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const isCsrfEnabled = this.configService.get<boolean>('CSRF_ENABLED', false);

    if (!isCsrfEnabled) {
      return next();
    }


    let csrfToken = req.cookies?.['csrf-token'];

    if (!csrfToken) {

      csrfToken = crypto.randomBytes(32).toString('hex');


      const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
      res.cookie('csrf-token', csrfToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
      });
    }


    res.setHeader('X-CSRF-Token', csrfToken);

    next();
  }
}


