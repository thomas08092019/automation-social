import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import * as amqp from 'amqplib';

export interface PublishingTaskMessage {
  publishingTaskId: string;
  videoId: string;
  socialAccountId: string;
  customTitle?: string;
  customDescription?: string;
  attempts: number;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: any = null;
  private channel: any = null;

  // Queue names
  private readonly VIDEO_PUBLISH_QUEUE = 'video-publish-tasks-queue';
  private readonly VIDEO_PUBLISH_DLQ = 'video-publish-tasks-dlq';
  private readonly RETRY_QUEUE = 'video-publish-retry-queue';

  async onModuleInit() {
    await this.connect();
    await this.setupQueues();
  }

  async onModuleDestroy() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.connection) {
      await this.connection.close();
    }
  }

  private async connect() {
    const maxRetries = 5;
    const retryDelay = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
        this.logger.log(
          `Attempting to connect to RabbitMQ (attempt ${attempt}/${maxRetries}): ${rabbitmqUrl}`,
        );

        this.connection = await amqp.connect(rabbitmqUrl);
        this.channel = await this.connection.createChannel();

        this.logger.log('Successfully connected to RabbitMQ');

        // Handle connection errors
        this.connection.on('error', (err: any) => {
          this.logger.error('RabbitMQ connection error:', err);
        });

        this.connection.on('close', () => {
          this.logger.warn('RabbitMQ connection closed');
        });

        return; // Success, exit retry loop
      } catch (error) {
        this.logger.error(
          `Failed to connect to RabbitMQ (attempt ${attempt}/${maxRetries}):`,
          error,
        );

        if (attempt === maxRetries) {
          throw new Error(
            `Failed to connect to RabbitMQ after ${maxRetries} attempts: ${error.message}`,
          );
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  private async setupQueues() {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    try {
      // Declare main queue
      await this.channel.assertQueue(this.VIDEO_PUBLISH_QUEUE, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': this.VIDEO_PUBLISH_DLQ,
        },
      });

      // Declare dead letter queue
      await this.channel.assertQueue(this.VIDEO_PUBLISH_DLQ, {
        durable: true,
      });

      // Declare retry queue with TTL
      await this.channel.assertQueue(this.RETRY_QUEUE, {
        durable: true,
        arguments: {
          'x-message-ttl': 30000, // 30 seconds delay
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': this.VIDEO_PUBLISH_QUEUE,
        },
      });

      this.logger.log('RabbitMQ queues setup completed');
    } catch (error) {
      this.logger.error('Failed to setup RabbitMQ queues:', error);
      throw error;
    }
  }

  async publishTask(message: PublishingTaskMessage): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));
      await this.channel.sendToQueue(this.VIDEO_PUBLISH_QUEUE, messageBuffer, {
        persistent: true,
        messageId: message.publishingTaskId,
        timestamp: Date.now(),
      });

      this.logger.log(`Published task to queue: ${message.publishingTaskId}`);
    } catch (error) {
      this.logger.error('Failed to publish task:', error);
      throw error;
    }
  }

  async retryTask(message: PublishingTaskMessage): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));
      await this.channel.sendToQueue(this.RETRY_QUEUE, messageBuffer, {
        persistent: true,
        messageId: `retry-${message.publishingTaskId}-${message.attempts}`,
        timestamp: Date.now(),
      });

      this.logger.log(
        `Sent task to retry queue: ${message.publishingTaskId} (attempt ${message.attempts})`,
      );
    } catch (error) {
      this.logger.error('Failed to send task to retry queue:', error);
      throw error;
    }
  }

  async startConsumer(
    handler: (message: PublishingTaskMessage) => Promise<void>,
  ): Promise<void> {
    // Wait for channel to be ready with retry logic
    const maxWait = 10000; // 10 seconds
    const checkInterval = 500; // 500ms
    let waited = 0;

    while (!this.channel && waited < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized after waiting');
    }

    try {
      // Set prefetch to process one message at a time
      await this.channel.prefetch(1);

      // Start consuming from main queue
      await this.channel.consume(
        this.VIDEO_PUBLISH_QUEUE,
        async (msg: any) => {
          if (msg) {
            try {
              const message: PublishingTaskMessage = JSON.parse(
                msg.content.toString(),
              );
              this.logger.log(`Processing task: ${message.publishingTaskId}`);

              await handler(message);

              // Acknowledge successful processing
              this.channel!.ack(msg);
            } catch (error) {
              this.logger.error('Error processing message:', error);
              // Reject message and send to DLQ
              this.channel!.nack(msg, false, false);
            }
          }
        },
        { noAck: false },
      );

      this.logger.log('Started consuming messages from RabbitMQ');
    } catch (error) {
      this.logger.error('Failed to start consumer:', error);
      throw error;
    }
  }

  async getQueueStats(): Promise<{
    pending: number;
    retry: number;
    deadLetter: number;
  }> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    try {
      const mainQueue = await this.channel.checkQueue(this.VIDEO_PUBLISH_QUEUE);
      const retryQueue = await this.channel.checkQueue(this.RETRY_QUEUE);
      const dlq = await this.channel.checkQueue(this.VIDEO_PUBLISH_DLQ);

      return {
        pending: mainQueue.messageCount,
        retry: retryQueue.messageCount,
        deadLetter: dlq.messageCount,
      };
    } catch (error) {
      this.logger.error('Failed to get queue stats:', error);
      throw error;
    }
  }

  async purgeQueues(): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    try {
      await this.channel.purgeQueue(this.VIDEO_PUBLISH_QUEUE);
      await this.channel.purgeQueue(this.RETRY_QUEUE);
      await this.channel.purgeQueue(this.VIDEO_PUBLISH_DLQ);

      this.logger.log('All queues purged');
    } catch (error) {
      this.logger.error('Failed to purge queues:', error);
      throw error;
    }
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      return this.connection !== null && this.channel !== null;
    } catch {
      return false;
    }
  }

  isReady(): boolean {
    return !!(this.connection && this.channel);
  }

  async waitForReady(timeoutMs: number = 10000): Promise<void> {
    const start = Date.now();
    while (!this.isReady() && Date.now() - start < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!this.isReady()) {
      throw new Error('RabbitMQ service not ready within timeout');
    }
  }
}
