import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, JobStatus } from 'bull';

export interface DeploymentJobData {
  scriptId: string;
  type: 'UPLOAD' | 'GIT_PULL' | 'MANUAL';
  filePath?: string;
  repoUrl?: string;
  version?: string;
}

export interface ScriptJobData {
  scriptId: string;
  action: 'START' | 'STOP' | 'RESTART' | 'RELOAD' | 'DELETE';
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('deployment') private deploymentQueue: Queue,
    @InjectQueue('script') private scriptQueue: Queue,
    @InjectQueue('expiry') private expiryQueue: Queue,
  ) {}


  async addDeploymentJob(data: DeploymentJobData) {
    const job = await this.deploymentQueue.add('deploy', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    });

    this.logger.log(`Задача деплоймента добавлена: ${job.id} для скрипта ${data.scriptId}`);
    return job;
  }


  async addScriptJob(data: ScriptJobData) {
    const job = await this.scriptQueue.add('manage', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 10,
      removeOnFail: 5,
    });

    this.logger.log(`Задача управления скриптом добавлена: ${job.id} для скрипта ${data.scriptId}`);
    return job;
  }


  async getDeploymentJobStatus(jobId: string) {
    const job = await this.deploymentQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      data: job.data,
      progress: job.progress(),
      state: await job.getState(),
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }


  async getScriptJobStatus(jobId: string) {
    const job = await this.scriptQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      data: job.data,
      progress: job.progress(),
      state: await job.getState(),
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }


  async cancelDeploymentJob(jobId: string) {
    const job = await this.deploymentQueue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Задача деплоймента отменена: ${jobId}`);
    }
  }


  async cancelScriptJob(jobId: string) {
    const job = await this.scriptQueue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.log(`Задача управления скриптом отменена: ${jobId}`);
    }
  }


  async addExpiryCheckJob() {
    const job = await this.expiryQueue.add('check-expiry', {}, {
      attempts: 1,
      removeOnComplete: 5,
      removeOnFail: 3,
    });

    this.logger.log(`Задача проверки истечения добавлена: ${job.id}`);
    return job;
  }


  async getQueueStats() {
    const [deploymentStats, scriptStats, expiryStats] = await Promise.all([
      this.deploymentQueue.getJobCounts(),
      this.scriptQueue.getJobCounts(),
      this.expiryQueue.getJobCounts(),
    ]);

    return {
      deployment: deploymentStats,
      script: scriptStats,
      expiry: expiryStats,
    };
  }


  async getQueueJobs(queueName: 'deployment' | 'script' | 'expiry', state?: string[], limit: number = 50) {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`Очередь ${queueName} не найдена`);
    }

    const states = state || ['waiting', 'active', 'delayed', 'failed', 'completed'];
    const allJobs = [];

    for (const s of states) {
      try {
        const jobs = await queue.getJobs([s as JobStatus], 0, limit);
        allJobs.push(...jobs.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          state: s,
          progress: job.progress(),
          createdAt: new Date(job.timestamp),
          processedAt: job.processedOn ? new Date(job.processedOn) : null,
          finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
          failedReason: job.failedReason,
          attemptsMade: job.attemptsMade,
          delay: (job.opts as any)?.delay || 0,
        })));
      } catch (error) {
        this.logger.warn(`Не удалось получить задачи в состоянии ${s}: ${error.message}`);
      }
    }

    return allJobs;
  }


  async clearQueue(queueName: 'deployment' | 'script' | 'expiry', states?: string[]) {
    const queue = this.getQueueByName(queueName);
    if (!queue) {
      throw new Error(`Очередь ${queueName} не найдена`);
    }

    const statesToClear = states || ['waiting', 'active', 'delayed', 'failed', 'completed'];
    const allJobs = [];

    for (const state of statesToClear) {
      try {
        const jobs = await queue.getJobs([state as JobStatus], 0, -1);
        allJobs.push(...jobs);
      } catch (error) {
        this.logger.warn(`Не удалось получить задачи в состоянии ${state}: ${error.message}`);
      }
    }

    const removeJobs = async (jobs: any[]) => {
      const results = await Promise.allSettled(
        jobs.map(job => job.remove())
      );
      return results.filter(r => r.status === 'fulfilled').length;
    };

    const removed = await removeJobs(allJobs);


    await Promise.all([
      queue.clean(0, 'completed').catch(() => null),
      queue.clean(0, 'failed').catch(() => null),
    ]);

    this.logger.log(`Очищено задач из очереди ${queueName}: ${removed}`);

    return {
      message: `Очередь ${queueName} очищена`,
      removed,
    };
  }


  private getQueueByName(queueName: 'deployment' | 'script' | 'expiry'): Queue | null {
    switch (queueName) {
      case 'deployment':
        return this.deploymentQueue;
      case 'script':
        return this.scriptQueue;
      case 'expiry':
        return this.expiryQueue;
      default:
        return null;
    }
  }


  async clearAllQueues() {
    try {
      const states = ['waiting', 'active', 'delayed', 'failed', 'completed'] as const;


      const getAllJobs = async (queue: Queue) => {
        const allJobs = [];
        for (const state of states) {
          try {
            const jobs = await queue.getJobs([state], 0, -1);
            allJobs.push(...jobs);
          } catch (error) {

            this.logger.warn(`Не удалось получить задачи в состоянии ${state}: ${error.message}`);
          }
        }
        return allJobs;
      };

      const [deploymentJobs, scriptJobs, expiryJobs] = await Promise.all([
        getAllJobs(this.deploymentQueue),
        getAllJobs(this.scriptQueue),
        getAllJobs(this.expiryQueue),
      ]);


      const removeJobs = async (jobs: any[]) => {
        const results = await Promise.allSettled(
          jobs.map(job => job.remove())
        );
        return results.filter(r => r.status === 'fulfilled').length;
      };

      const [deploymentRemoved, scriptRemoved, expiryRemoved] = await Promise.all([
        removeJobs(deploymentJobs),
        removeJobs(scriptJobs),
        removeJobs(expiryJobs),
      ]);


      await Promise.all([
        this.deploymentQueue.clean(0, 'completed').catch(() => null),
        this.deploymentQueue.clean(0, 'failed').catch(() => null),
        this.scriptQueue.clean(0, 'completed').catch(() => null),
        this.scriptQueue.clean(0, 'failed').catch(() => null),
        this.expiryQueue.clean(0, 'completed').catch(() => null),
        this.expiryQueue.clean(0, 'failed').catch(() => null),
      ]);

      const totalRemoved = deploymentRemoved + scriptRemoved + expiryRemoved;

      this.logger.log(`Очищено задач: deployment=${deploymentRemoved}, script=${scriptRemoved}, expiry=${expiryRemoved}, всего=${totalRemoved}`);

      return {
        message: 'Все задачи очищены',
        removed: {
          deployment: deploymentRemoved,
          script: scriptRemoved,
          expiry: expiryRemoved,
          total: totalRemoved,
        },
      };
    } catch (error) {
      this.logger.error(`Ошибка очистки очередей: ${error.message}`);
      throw error;
    }
  }
}
