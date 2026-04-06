import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {


    super({
      log: ['warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }


  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Нельзя очищать базу данных в продакшене!');
    }

    const models = Reflect.ownKeys(this).filter(key => key[0] !== '_');

    return Promise.all(
      models.map((modelKey) => this[modelKey].deleteMany()),
    );
  }
}
