import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { SchedulerRegistry } from '@nestjs/schedule'
import { CronJob } from 'cron'
import { PrismaService } from '../prisma/prisma.service'
import { TemplateUpdateService } from '../template-update/template-update.service'
import { QueueService } from '../queue/queue.service'
import { SshService } from '../../ssh/ssh.service'

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name)
  private readonly activeJobs = new Map<string, CronJob>()

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly prisma: PrismaService,
    private readonly templateUpdateService: TemplateUpdateService,
    private readonly queueService: QueueService,
    private readonly sshService: SshService,
  ) {}

  async onModuleInit() {

    await this.loadActiveTasks()
  }


  async loadActiveTasks() {
    try {
      const tasks = await this.prisma.scheduledTask.findMany({
        where: { isActive: true },
      })

      this.logger.log(`Загрузка ${tasks.length} активных задач планировщика...`)


      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i]
        try {
          await this.scheduleTask(task)

          if (i < tasks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        } catch (error) {
          this.logger.error(`Ошибка загрузки задачи ${task.id}: ${error.message}`)

          if (i < tasks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
      }

      this.logger.log(`Успешно загружено ${this.activeJobs.size} задач`)
    } catch (error) {
      this.logger.error(`Ошибка загрузки задач: ${error.message}`)
    }
  }


  async scheduleTask(task: any) {

    if (this.activeJobs.has(task.id)) {
      await this.unscheduleTask(task.id)
    }

    try {

      const timezone = task.timezone || 'Europe/Moscow'


      const job = new CronJob(
        task.cronExpression,
        async () => {
          await this.executeTask(task)
        },
        null,
        true,
        timezone,
      )


      this.schedulerRegistry.addCronJob(`task-${task.id}`, job)
      this.activeJobs.set(task.id, job)


      const nextRun = this.calculateNextRun(task.cronExpression, timezone)


      const currentNextRun = task.nextRunAt ? new Date(task.nextRunAt) : null
      const needsUpdate = !currentNextRun ||
        Math.abs(currentNextRun.getTime() - nextRun.getTime()) > 60000

      if (needsUpdate) {


        try {
          await this.prisma.scheduledTask.updateMany({
            where: {
              id: task.id,
              isRunning: false,
            },
            data: { nextRunAt: nextRun },
          })
        } catch (updateError: any) {

          if (updateError.code === 'P2034' ||
              updateError.message?.includes('Lock wait timeout') ||
              updateError.message?.includes('connection pool')) {
            this.logger.warn(`Не удалось обновить nextRunAt для задачи ${task.id}: ${updateError.message}`)
          } else {
            this.logger.error(`Ошибка обновления nextRunAt для задачи ${task.id}: ${updateError.message}`)
          }
        }
      }

      this.logger.log(
        `Задача "${task.name}" (${task.id}) запланирована. Следующий запуск: ${nextRun.toLocaleString('ru-RU', { timeZone: timezone })}`,
      )
    } catch (error) {
      this.logger.error(`Ошибка планирования задачи ${task.id}: ${error.message}`)
      throw error
    }
  }


  async unscheduleTask(taskId: string) {
    try {
      const jobName = `task-${taskId}`

      if (this.schedulerRegistry.doesExist('cron', jobName)) {
        const job = this.schedulerRegistry.getCronJob(jobName)
        job.stop()
        this.schedulerRegistry.deleteCronJob(jobName)
      }

      this.activeJobs.delete(taskId)
      this.logger.log(`Задача ${taskId} отменена`)
    } catch (error) {
      this.logger.error(`Ошибка отмены задачи ${taskId}: ${error.message}`)
    }
  }


  async executeTask(task: any) {
    const startTime = Date.now()
    this.logger.log(`Выполнение задачи "${task.name}" (${task.id})...`)


    try {
      await this.prisma.scheduledTask.update({
        where: { id: task.id },
        data: {
          isRunning: true,
          lastRunAt: new Date(),
        },
      })
    } catch (error: any) {

      if (error.code === 'P2034' || error.message?.includes('Lock wait timeout')) {
        this.logger.warn(`Не удалось обновить статус задачи ${task.id} из-за блокировки БД, продолжаем выполнение`)
      } else {

        throw error
      }
    }

    try {
      let result: any = { success: true }


      switch (task.taskType) {
        case 'CHECK_AUTO_UPDATE':
          result = await this.executeCheckAutoUpdate(task)
          break
        case 'CHECK_SCRIPT_EXPIRY':
          result = await this.executeCheckScriptExpiry(task)
          break
        case 'AUTO_RELOAD_SCRIPTS':
          result = await this.executeAutoReloadScripts(task)
          break
        case 'CLEANUP_OLD_LOGS':
          result = await this.executeCleanupOldLogs(task)
          break
        case 'BACKUP_DATABASE':
          result = await this.executeBackupDatabase(task)
          break
        case 'HEALTH_CHECK':
          result = await this.executeHealthCheck(task)
          break
        default:
          throw new Error(`Неизвестный тип задачи: ${task.taskType}`)
      }

      const duration = Date.now() - startTime


      try {
        await this.prisma.scheduledTask.update({
          where: { id: task.id },
          data: {
            isRunning: false,
            lastRunStatus: 'SUCCESS',
            lastRunError: null,
            runCount: { increment: 1 },
            nextRunAt: this.calculateNextRun(task.cronExpression, task.timezone),
          },
        })
      } catch (updateError: any) {

        if (updateError.code === 'P2034' || updateError.message?.includes('Lock wait timeout')) {
          this.logger.warn(`Не удалось обновить статистику задачи ${task.id} из-за блокировки БД`)
        } else {

          this.logger.error(`Ошибка обновления статистики задачи ${task.id}: ${updateError.message}`)
        }
      }

      this.logger.log(
        `Задача "${task.name}" выполнена успешно за ${duration}ms`,
      )
    } catch (error) {
      const duration = Date.now() - startTime


      try {
        await this.prisma.scheduledTask.update({
          where: { id: task.id },
          data: {
            isRunning: false,
            lastRunStatus: 'FAILED',
            lastRunError: error.message,
            failCount: { increment: 1 },
            nextRunAt: this.calculateNextRun(task.cronExpression, task.timezone),
          },
        })
      } catch (updateError: any) {

        if (updateError.code === 'P2034' || updateError.message?.includes('Lock wait timeout')) {
          this.logger.warn(`Не удалось обновить статистику ошибки задачи ${task.id} из-за блокировки БД`)
        } else {

          this.logger.error(`Ошибка обновления статистики ошибки задачи ${task.id}: ${updateError.message}`)
        }
      }

      this.logger.error(
        `Ошибка выполнения задачи "${task.name}": ${error.message} (${duration}ms)`,
      )
    }
  }


  private async executeCheckAutoUpdate(task: any) {

    await this.templateUpdateService.checkAndUpdateTemplates()
    return { message: 'Проверка автообновления выполнена' }
  }


  private async executeCheckScriptExpiry(task: any) {

    await this.queueService.addExpiryCheckJob()
    return { message: 'Проверка истечения скриптов добавлена в очередь' }
  }


  private async executeAutoReloadScripts(task: any) {
    const parameters = task.parameters || {}
    const onlyRunning = parameters.onlyRunning !== false
    const scriptTypes = parameters.scriptTypes || null


    const where: any = {}

    if (onlyRunning) {
      where.status = 'RUNNING'
    } else {
      where.status = { in: ['RUNNING', 'STOPPED'] }
    }


    if (scriptTypes && Array.isArray(scriptTypes) && scriptTypes.length > 0) {
      where.type = { in: scriptTypes }
    }


    const scripts = await this.prisma.script.findMany({
      where,
    })

    let reloadedCount = 0
    let failedCount = 0

    for (const script of scripts) {
      try {
        if (script.status === 'RUNNING') {

          await this.queueService.addScriptJob({
            scriptId: script.id,
            action: 'RELOAD',
          })
          reloadedCount++
        }
      } catch (error) {
        this.logger.error(`Ошибка перезагрузки скрипта ${script.id}: ${error.message}`)
        failedCount++
      }
    }

    return {
      message: `Перезагружено ${reloadedCount} скриптов, ошибок: ${failedCount}`,
      reloadedCount,
      failedCount,
    }
  }


  private async executeCleanupOldLogs(task: any) {
    const parameters = task.parameters || {}
    const scriptTypes = parameters.scriptTypes || null
    const onlyRunning = parameters.onlyRunning !== false


    let scriptsClearedCount = 0
    let scriptsFailedCount = 0


    const where: any = {}

    if (onlyRunning) {
      where.status = 'RUNNING'
    } else {
      where.status = { in: ['RUNNING', 'STOPPED'] }
    }


    if (scriptTypes && Array.isArray(scriptTypes) && scriptTypes.length > 0) {
      where.type = { in: scriptTypes }
    }


    const scripts = await this.prisma.script.findMany({
      where,
      include: {
        server: true,
      },
    })


    for (const script of scripts) {
      try {
        const pm2Name = `user-${script.ownerId}-script-${script.id}`
        await this.sshService.pm2ClearLogs(script.serverId, pm2Name)
        scriptsClearedCount++
      } catch (error) {
        this.logger.error(`Ошибка очистки логов скрипта ${script.id}: ${error.message}`)
        scriptsFailedCount++
      }
    }

    const messages = [`Очищены логи у ${scriptsClearedCount} скриптов`]

    if (scriptsFailedCount > 0) {
      messages.push(`Ошибок при очистке логов скриптов: ${scriptsFailedCount}`)
    }

    return {
      message: messages.join(', '),
      scriptsCleared: scriptsClearedCount,
      scriptsFailed: scriptsFailedCount,
    }
  }


  private async executeBackupDatabase(task: any) {

    return { message: 'Резервное копирование БД (не реализовано)' }
  }


  private async executeHealthCheck(task: any) {

    const [scriptsCount, serversCount, activeScriptsCount] = await Promise.all([
      this.prisma.script.count(),
      this.prisma.server.count({ where: { isActive: true } }),
      this.prisma.script.count({ where: { status: 'RUNNING' } }),
    ])

    return {
      message: 'Проверка здоровья системы выполнена',
      stats: {
        totalScripts: scriptsCount,
        activeServers: serversCount,
        runningScripts: activeScriptsCount,
      },
    }
  }


  private calculateNextRun(cronExpression: string, timezone: string = 'Europe/Moscow'): Date {
    try {

      const tempJob = new CronJob(
        cronExpression,
        () => {},
        null,
        false,
        timezone,
      )


      const nextDates = tempJob.nextDates(1)
      if (nextDates && nextDates.length > 0) {
        return nextDates[0].toJSDate()
      }


      const nextRun = new Date()
      nextRun.setHours(nextRun.getHours() + 1)
      return nextRun
    } catch (error) {
      this.logger.error(`Ошибка вычисления следующего запуска: ${error.message}`)

      const nextRun = new Date()
      nextRun.setHours(nextRun.getHours() + 1)
      return nextRun
    }
  }


  getTaskStatus(taskId: string) {
    const job = this.activeJobs.get(taskId)
    return {
      isScheduled: !!job,
      isRunning: job?.running || false,
    }
  }
}

