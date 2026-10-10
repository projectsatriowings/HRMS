import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@hrms/database';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  public isConnected = false;

  async onModuleInit() {
    try {
      if (process.env.DATABASE_URL) {
        await this.$connect();
        this.isConnected = true;
        this.logger.log('Successfully connected to PostgreSQL database.');
      } else {
        this.logger.warn('DATABASE_URL is not configured. Database connection skipped.');
      }
    } catch (error) {
      this.isConnected = false;
      this.logger.warn(`Initial database connection failed: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.$disconnect();
    }
  }
}
