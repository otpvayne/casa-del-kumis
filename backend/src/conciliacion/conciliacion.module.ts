// src/conciliacion/conciliacion.module.ts
import { Module } from '@nestjs/common';
import { ConciliacionService } from './conciliacion.service';
import { ConciliacionController } from './conciliacion.controller';

@Module({
  imports: [
     // ✅
  ],
  controllers: [ConciliacionController],
  providers: [ConciliacionService],
  exports: [ConciliacionService],
})
export class ConciliacionModule {}
