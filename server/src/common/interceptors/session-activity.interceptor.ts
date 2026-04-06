import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class SessionActivityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SessionActivityInterceptor.name);

  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const authHeader = request.headers.authorization;


    if (user && authHeader) {
      const token = authHeader.replace('Bearer ', '');


      this.updateSessionActivity(user.id).catch((error) => {

        this.logger.error(`Failed to update session activity for user ${user.id}`, error.stack);
      });
    }

    return next.handle();
  }

  private async updateSessionActivity(userId: string) {
    try {


      await this.prisma.session.updateMany({
        where: {
          userId,
          expiresAt: { gt: new Date() },
        },
        data: {
          lastActivityAt: new Date(),
        },
      });
    } catch (error) {

    }
  }
}

