import { Module } from '@nestjs/common';
import { ParametrosSistemaController } from './parametros-sistema.controller';
import { ParametrosSistemaService } from './parametros-sistema.service';

@Module({
  imports: [
       // ✅
    ],
  controllers: [ParametrosSistemaController],
  providers: [ParametrosSistemaService],
})
export class ParametrosSistemaModule {}
