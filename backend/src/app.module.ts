// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './infra/db/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SucursalesModule } from './sucursales/sucursales.module';
import { VouchersModule } from './vouchers/vouchers.module';
import { RedeBanModule } from './redeban/redeban.module';
import { BancoModule } from './banco/banco.module';
import { ConciliacionModule } from './conciliacion/conciliacion.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    SucursalesModule,
    VouchersModule,
    RedeBanModule,
    BancoModule,
    ConciliacionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
