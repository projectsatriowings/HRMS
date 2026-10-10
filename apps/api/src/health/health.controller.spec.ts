import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let mockPrismaService: {
    $queryRaw: jest.Mock;
    isConnected: boolean;
  };

  beforeEach(async () => {
    mockPrismaService = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
      isConnected: true,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status with ok and system information', async () => {
    const health = await controller.getHealth();
    expect(health.status).toBe('ok');
    expect(typeof health.uptime).toBe('number');
    expect(typeof health.timestamp).toBe('string');
    expect(health.database).toBeDefined();
  });
});
