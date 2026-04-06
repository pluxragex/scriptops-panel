import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { ScriptsService } from '../../scripts/scripts.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @Inject(forwardRef(() => ScriptsService))
    private scriptsService: ScriptsService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.query?.apiKey;
    const scriptId = request.params?.id;

    if (!apiKey) {
      throw new UnauthorizedException('API ключ не предоставлен');
    }

    if (!scriptId) {
      throw new UnauthorizedException('ID скрипта не предоставлен');
    }

    try {


      await this.scriptsService.validateApiKey(scriptId, apiKey);
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error.status === 401) {
        throw error;
      }
      throw new UnauthorizedException('Неверный API ключ');
    }
  }
}

