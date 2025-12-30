import { Module } from '@nestjs/common';
import { ParametrosSistemaController } from './parametros-sistema.controller';
import { ParametrosSistemaService } from './parametros-sistema.service';
import { LogsModule } from '../logs/logs.module';
@Module({
  imports: [
      LogsModule, // ✅
    ],
  controllers: [ParametrosSistemaController],
  providers: [ParametrosSistemaService],
})
export class ParametrosSistemaModule {}
