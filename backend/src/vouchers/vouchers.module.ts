import { Module } from '@nestjs/common';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';
import { PrismaModule } from '../infra/db/prisma.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [PrismaModule,LogsModule,],
  controllers: [VouchersController],
  providers: [VouchersService],
})
export class VouchersModule {}
