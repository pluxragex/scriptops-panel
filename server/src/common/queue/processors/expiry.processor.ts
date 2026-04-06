import { Process, Processor } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { SshService } from '../../../ssh/ssh.service'
import { TelegramNotificationService } from '../../notifications/telegram-notification.service'

@Processor('expiry')
export class ExpiryProcessor {
  private readonly logger = new Logger(ExpiryProcessor.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly sshService: SshService,
    private readonly telegramNotificationService: TelegramNotificationService,
  ) {}

  @Process('check-expiry')
  async processExpiryCheck(job: any) {

    if (process.env.LOG_LEVEL === 'debug') {
      this.logger.debug('Checking expired scripts...');
    }

    try {

      const activeScripts = await this.prisma.script.findMany({
        where: {
          status: {
            in: ['RUNNING', 'STOPPED']
          },
          expiryDate: {
            not: null
          }
        },
        select: {
          id: true,
          name: true,
          ownerId: true,
          serverId: true,
          status: true,
          expiryDate: true,
          frozenAt: true,
          frozenUntil: true,
          updatedAt: true,
          server: {
            select: {
              id: true,
              name: true,
              host: true,
            }
          },
          owner: {
            select: {
              id: true,
              username: true,
              email: true,
            }
          }
        }
      })

      const now = new Date()
      let expiredCount = 0


      const BATCH_SIZE = 10
      for (let i = 0; i < activeScripts.length; i += BATCH_SIZE) {
        const batch = activeScripts.slice(i, i + BATCH_SIZE)

        for (const script of batch) {

        const isCurrentlyFrozen = script.frozenAt &&
          (!script.frozenUntil || new Date(script.frozenUntil) > now)


        if (isCurrentlyFrozen) {
          try {


            const lastUpdate = script.updatedAt ? new Date(script.updatedAt) : now
            const hoursSinceLastUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)


            if (hoursSinceLastUpdate >= 23) {
              const newExpiryDate = new Date(script.expiryDate)
              newExpiryDate.setDate(newExpiryDate.getDate() + 1)

              try {

                await this.prisma.script.update({
                  where: { id: script.id },
                  data: {
                    expiryDate: newExpiryDate,
                  }
                })

                if (process.env.LOG_LEVEL === 'debug') {
                  this.logger.debug(`Frozen script extended: ${script.id} (${script.name}) - new expiry: ${newExpiryDate.toISOString()}`)
                }


                script.expiryDate = newExpiryDate
              } catch (updateError: any) {

                if (updateError.code === 'P2034' || updateError.message?.includes('Lock wait timeout')) {
                  this.logger.warn(`Не удалось продлить замороженный скрипт ${script.id} из-за блокировки БД, будет попытка позже`)
                } else {

                  throw updateError
                }
              }
            }


            continue
          } catch (error) {
            this.logger.error(`Ошибка при продлении замороженного скрипта ${script.id}: ${error.message}`)

          }
        }


        let expiryDate = new Date(script.expiryDate)

        if (script.frozenAt) {
          const frozenAt = new Date(script.frozenAt)

          if (!script.frozenUntil) {
            continue
          }
          const frozenUntil = new Date(script.frozenUntil)

          if (now > frozenUntil) {
            const freezeDuration = frozenUntil.getTime() - frozenAt.getTime()
            expiryDate = new Date(expiryDate.getTime() + freezeDuration)
          }
        }

        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))


        if (now > expiryDate) {
          this.logger.warn(`Script expired: ${script.id} (${script.name}) - auto-disabling`);

          try {

            const pm2Name = `user-${script.ownerId}-script-${script.id}`
            await this.sshService.pm2Stop(script.serverId, pm2Name)


            try {
              await this.prisma.script.update({
                where: { id: script.id },
                data: {
                  status: 'EXPIRED',
                  pid: null,
                  uptime: null
                }
              })
            } catch (updateError: any) {
              if (updateError.code === 'P2034' || updateError.message?.includes('Lock wait timeout')) {
                this.logger.warn(`Не удалось обновить статус истекшего скрипта ${script.id} из-за блокировки БД`)
                continue
              } else {
                throw updateError
              }
            }


            try {
              await this.prisma.auditLog.create({
                data: {
                  actorId: script.ownerId,
                  actionType: 'SCRIPT_EXPIRED',
                  targetScriptId: script.id,
                  details: {
                    scriptName: script.name,
                    expiryDate: script.expiryDate,
                    autoDisabled: true
                  }
                }
              })
            } catch (logError: any) {

              if (logError.code === 'P2034' || logError.message?.includes('Lock wait timeout')) {
                this.logger.warn(`Не удалось создать audit log для истекшего скрипта ${script.id} из-за блокировки БД`)
              } else {
                this.logger.error(`Ошибка создания audit log для скрипта ${script.id}: ${logError.message}`)
              }
            }


            try {
              await this.telegramNotificationService.sendScriptExpiredNotification(
                script.ownerId,
                script.name,
                script.id
              )
            } catch (notifyError) {
              this.logger.warn(`Не удалось отправить уведомление об истечении скрипта ${script.id}: ${notifyError.message}`)
            }

            expiredCount++


          } catch (error) {
            this.logger.error(`Ошибка при отключении истекшего скрипта ${script.id}: ${error.message}`)
          }
        } else if (daysUntilExpiry > 0 && daysUntilExpiry <= 7) {

          const shouldNotify = daysUntilExpiry === 7 || daysUntilExpiry === 3 || daysUntilExpiry === 1

          if (shouldNotify) {
            try {


              const lastNotification = await this.prisma.auditLog.findFirst({
                where: {
                  actorId: script.ownerId,
                  targetScriptId: script.id,
                  createdAt: {
                    gte: new Date(now.getTime() - 24 * 60 * 60 * 1000)
                  },

                },
                orderBy: {
                  createdAt: 'desc'
                }
              })


              const wasNotifiedToday = lastNotification &&
                lastNotification.details &&
                typeof lastNotification.details === 'object' &&
                'expiringSoon' in (lastNotification.details as any) &&
                (lastNotification.details as any).expiringSoon === daysUntilExpiry

              if (!wasNotifiedToday) {

                await this.telegramNotificationService.sendScriptExpiringNotification(
                  script.ownerId,
                  script.name,
                  script.id,
                  daysUntilExpiry
                )


                await this.prisma.auditLog.create({
                  data: {
                    actorId: script.ownerId,
                    actionType: 'SCRIPT_SETTINGS_UPDATE',
                    targetScriptId: script.id,
                    details: {
                      expiringSoon: daysUntilExpiry,
                      scriptName: script.name,
                      daysLeft: daysUntilExpiry,
                      expiryDate: script.expiryDate,
                      notificationOnly: true
                    }
                  }
                })


                if (process.env.LOG_LEVEL === 'debug') {
                  this.logger.debug(`Expiry notification sent: script ${script.id}, ${daysUntilExpiry} days left`);
                }
              }
            } catch (error) {
              this.logger.error(`Failed to send expiry notification for script ${script.id}: ${error.message}`, {
                scriptId: script.id,
                daysUntilExpiry,
              });
            }
          }
        }
        }


        if (i + BATCH_SIZE < activeScripts.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }


      if (expiredCount > 0 || process.env.LOG_LEVEL === 'debug') {
        this.logger.log(`Expiry check completed: ${expiredCount} expired, ${activeScripts.length} checked`);
      }

      return {
        success: true,
        expiredCount,
        totalChecked: activeScripts.length
      }

    } catch (error) {
      this.logger.error(`Expiry check failed: ${error.message}`, error.stack);
      throw error
    }
  }
}
