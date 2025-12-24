import { Module } from '@nestjs/common';
import { BancoController } from './banco.controller';
import { BancoService } from './banco.service';
import { PrismaService } from '../infra/db/prisma.service';

@Module({
  controllers: [BancoController],
  providers: [BancoService, PrismaService],
})
export class BancoModule {}
