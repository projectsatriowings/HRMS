import { Module } from '@nestjs/common';
import { DirectoryController } from './directory.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ScopeService } from '../common/services/scope.service';

@Module({
  imports: [PrismaModule],
  controllers: [DirectoryController],
  providers: [ScopeService],
  exports: [ScopeService],
})
export class DirectoryModule {}
