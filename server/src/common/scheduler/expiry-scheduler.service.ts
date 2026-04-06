import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { QueueService } from '../queue/queue.service'

@Injectable()
export class ExpirySchedulerService {
  private readonly logger = new Logger(ExpirySchedulerService.name)

  constructor(private readonly queueService: QueueService) {}


  @Cron(CronExpression.EVERY_30_MINUTES)
  async checkExpiredScripts() {
    this.logger.log('Запуск автоматической проверки истекших скриптов...')

    try {
      await this.queueService.addExpiryCheckJob()
      this.logger.log('Задача проверки истечения успешно добавлена в очередь')
    } catch (error) {
      this.logger.error(`Ошибка при запуске проверки истечения: ${error.message}`)
    }
  }


  @Cron('0 0 * * *')
  async dailyExpiryCheck() {
    this.logger.log('Запуск ежедневной проверки истекших скриптов...')

    try {
      await this.queueService.addExpiryCheckJob()
      this.logger.log('Ежедневная задача проверки истечения успешно добавлена в очередь')
    } catch (error) {
      this.logger.error(`Ошибка при запуске ежедневной проверки истечения: ${error.message}`)
    }
  }
}
