import { Controller, Get } from '@nestjs/common';
import { HealthCheckResponse } from '@hrms/shared-types';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getHealth(): Promise<HealthCheckResponse> {
    let dbStatus: 'connected' | 'disconnected' | 'not_configured' = 'not_configured';
    let dbMessage = 'DATABASE_URL environment variable is not defined';

    if (process.env.DATABASE_URL) {
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        dbStatus = 'connected';
        dbMessage = 'Successfully queried database';
      } catch (error) {
        dbStatus = 'disconnected';
        dbMessage = (error as Error).message;
      }
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: dbStatus,
        message: dbMessage,
      },
    };
  }
}
