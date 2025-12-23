import { Module } from '@nestjs/common';
import { RedeBanController } from './redeban.controller';
import { RedeBanService } from './redeban.service';
import { PrismaService } from '../infra/db/prisma.service';

@Module({
  controllers: [RedeBanController],
  providers: [RedeBanService, PrismaService],
  exports: [RedeBanService],
})
export class RedeBanModule {}
