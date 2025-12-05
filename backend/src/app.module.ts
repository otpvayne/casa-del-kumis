// src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './infra/db/prisma.module'; // 👈 importante

@Module({
  imports: [PrismaModule], // ahora sí existe
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
