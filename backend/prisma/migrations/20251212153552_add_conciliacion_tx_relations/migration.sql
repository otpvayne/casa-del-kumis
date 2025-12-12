-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('PROPIETARIO', 'OPERATIVO', 'ADMIN', 'DESARROLLADOR', 'SOPORTE');

-- CreateEnum
CREATE TYPE "Franquicia" AS ENUM ('VISA', 'MASTERCARD', 'DESCONOCIDA');

-- CreateEnum
CREATE TYPE "EstadoConciliacionTx" AS ENUM ('MATCH_OK', 'ABONO_DIA_SIGUIENTE', 'NO_ABONADO', 'VALOR_DIFERENTE', 'COMISION_INCORRECTA', 'PENDIENTE_REVISION', 'SIN_VOUCHER', 'SIN_BANCO');

-- CreateEnum
CREATE TYPE "TipoTarjetaBanco" AS ENUM ('CREDIT', 'DEBIT', 'DESCONOCIDO');

-- CreateTable
CREATE TABLE "archivos_banco" (
    "id" BIGSERIAL NOT NULL,
    "fecha_archivo" DATE NOT NULL,
    "nombre_original" VARCHAR(255) NOT NULL,
    "ruta_archivo" VARCHAR(255) NOT NULL,
    "hash_contenido" VARCHAR(100) NOT NULL,
    "estado" VARCHAR(20) NOT NULL,
    "usuario_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_banco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "archivos_redeban" (
    "id" BIGSERIAL NOT NULL,
    "fecha_conciliacion" DATE NOT NULL,
    "nombre_original" VARCHAR(255) NOT NULL,
    "ruta_archivo" VARCHAR(255) NOT NULL,
    "hash_contenido" VARCHAR(100) NOT NULL,
    "estado" VARCHAR(20) NOT NULL,
    "usuario_id" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "archivos_redeban_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conciliaciones" (
    "id" BIGSERIAL NOT NULL,
    "sucursal_id" BIGINT NOT NULL,
    "fecha_ventas" DATE NOT NULL,
    "voucher_id" BIGINT,
    "archivo_redeban_id" BIGINT,
    "archivo_banco_id" BIGINT,
    "estado" VARCHAR(30) NOT NULL,
    "total_visa_voucher" DECIMAL(14,2),
    "total_mc_voucher" DECIMAL(14,2),
    "total_global_voucher" DECIMAL(14,2),
    "base_liquidacion_redeban" DECIMAL(14,2),
    "total_banco_ajustado" DECIMAL(14,2),
    "comision_esperada" DECIMAL(14,2),
    "diferencia_calculada" DECIMAL(14,2),
    "margen_permitido" DECIMAL(14,2),
    "causa_principal" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conciliaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_evento" (
    "id" BIGSERIAL NOT NULL,
    "fecha_hora" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuario_email" VARCHAR(150),
    "tipo_evento" VARCHAR(30) NOT NULL,
    "modulo" VARCHAR(50) NOT NULL,
    "mensaje" VARCHAR(255) NOT NULL,
    "detalle_tecnico" TEXT,
    "severidad" VARCHAR(10) NOT NULL,

    CONSTRAINT "logs_evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parametros_sistema" (
    "id" BIGSERIAL NOT NULL,
    "tasa_comision" DECIMAL(5,4) NOT NULL,
    "margen_error_permitido" DECIMAL(14,2) NOT NULL,
    "dias_desfase_banco" INTEGER NOT NULL DEFAULT 1,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parametros_sistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_banco" (
    "id" BIGSERIAL NOT NULL,
    "archivo_banco_id" BIGINT NOT NULL,
    "fecha_sistema" DATE NOT NULL,
    "documento" VARCHAR(50),
    "descripcion_motivo" VARCHAR(255),
    "valor_total" DECIMAL(14,2) NOT NULL,
    "referencia1" VARCHAR(50),
    "referencia2" VARCHAR(50),
    "es_abono_visa" BOOLEAN NOT NULL DEFAULT false,
    "es_abono_mastercard" BOOLEAN NOT NULL DEFAULT false,
    "es_abono_tardio" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "registros_banco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_banco_detalle" (
    "id" BIGSERIAL NOT NULL,
    "archivo_banco_id" BIGINT NOT NULL,
    "sucursal_id" BIGINT,
    "fecha_vale" DATE,
    "fecha_proceso" DATE,
    "fecha_abono" DATE,
    "bol_ruta" VARCHAR(50),
    "recap" VARCHAR(50),
    "vale" VARCHAR(50),
    "red" VARCHAR(50),
    "terminal" VARCHAR(50),
    "numero_autoriza" VARCHAR(50),
    "valor_consumo" DECIMAL(14,2),
    "valor_iva" DECIMAL(14,2),
    "imp_al_consumo" DECIMAL(14,2),
    "valor_propina" DECIMAL(14,2),
    "valor_comision" DECIMAL(14,2),
    "ret_fuente" DECIMAL(14,2),
    "ret_iva" DECIMAL(14,2),
    "ret_ica" DECIMAL(14,2),
    "valor_neto" DECIMAL(14,2),
    "bases_dev_iva" DECIMAL(14,2),
    "hora_trans" VARCHAR(20),
    "tarjeta_socio" VARCHAR(30),
    "franquicia" "Franquicia" NOT NULL DEFAULT 'DESCONOCIDA',
    "tipo_tarjeta" "TipoTarjetaBanco" NOT NULL DEFAULT 'DESCONOCIDO',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registros_banco_detalle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registros_redeban" (
    "id" BIGSERIAL NOT NULL,
    "archivo_redeban_id" BIGINT NOT NULL,
    "sucursal_id" BIGINT,
    "codigo_comercio" VARCHAR(50) NOT NULL,
    "cantidad_transacciones" INTEGER,
    "valor_bruto" DECIMAL(14,2),
    "base_liquidacion" DECIMAL(14,2),
    "iva" DECIMAL(14,2),
    "consumo" DECIMAL(14,2),
    "comision" DECIMAL(14,2),
    "rete_iva" DECIMAL(14,2),
    "rete_ica" DECIMAL(14,2),

    CONSTRAINT "registros_redeban_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sucursales" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "codigo_comercio_redeban" VARCHAR(50) NOT NULL,
    "codigo_referencia_banco" VARCHAR(50) NOT NULL,
    "direccion" VARCHAR(255),
    "estado" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sucursales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'OPERATIVO',
    "estado" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" BIGSERIAL NOT NULL,
    "sucursal_id" BIGINT NOT NULL,
    "creado_por_id" BIGINT NOT NULL,
    "confirmado_por_id" BIGINT,
    "fecha_operacion" DATE NOT NULL,
    "ruta_imagen" VARCHAR(255) NOT NULL,
    "total_visa" DECIMAL(14,2),
    "total_mastercard" DECIMAL(14,2),
    "total_global" DECIMAL(14,2),
    "precision_ocr" DECIMAL(5,2),
    "estado" VARCHAR(30) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmado_en" TIMESTAMPTZ(6),

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_transacciones" (
    "id" BIGSERIAL NOT NULL,
    "voucher_id" BIGINT NOT NULL,
    "franquicia" "Franquicia" NOT NULL DEFAULT 'DESCONOCIDA',
    "ultimos_digitos" VARCHAR(10),
    "numero_recibo" VARCHAR(50),
    "monto" DECIMAL(14,2) NOT NULL,
    "linea_ocr" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_transacciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conciliacion_transacciones" (
    "id" BIGSERIAL NOT NULL,
    "conciliacion_id" BIGINT NOT NULL,
    "voucher_tx_id" BIGINT,
    "banco_detalle_id" BIGINT,
    "sucursal_id" BIGINT NOT NULL,
    "fecha_venta" DATE NOT NULL,
    "terminal" VARCHAR(50),
    "franquicia" "Franquicia" NOT NULL DEFAULT 'DESCONOCIDA',
    "ultimos_digitos" VARCHAR(10),
    "numero_autoriza" VARCHAR(50),
    "numero_recibo" VARCHAR(50),
    "fecha_vale" DATE,
    "fecha_abono" DATE,
    "monto_voucher" DECIMAL(14,2),
    "valor_consumo_banco" DECIMAL(14,2),
    "valor_neto_banco" DECIMAL(14,2),
    "base_liquidacion_redeban" DECIMAL(14,2),
    "comision_banco" DECIMAL(14,2),
    "comision_esperada" DECIMAL(14,2),
    "diferencia_comision" DECIMAL(14,2),
    "estado" "EstadoConciliacionTx" NOT NULL DEFAULT 'PENDIENTE_REVISION',
    "es_abono_dia_siguiente" BOOLEAN NOT NULL DEFAULT false,
    "observacion" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conciliacion_transacciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "archivos_banco_hash_contenido_key" ON "archivos_banco"("hash_contenido");

-- CreateIndex
CREATE UNIQUE INDEX "archivos_redeban_hash_contenido_key" ON "archivos_redeban"("hash_contenido");

-- CreateIndex
CREATE UNIQUE INDEX "idx_conc_sucursal_fecha" ON "conciliaciones"("sucursal_id", "fecha_ventas");

-- CreateIndex
CREATE INDEX "idx_logs_fecha" ON "logs_evento"("fecha_hora");

-- CreateIndex
CREATE INDEX "idx_logs_tipo" ON "logs_evento"("tipo_evento");

-- CreateIndex
CREATE INDEX "idx_reg_banco_archivo" ON "registros_banco"("archivo_banco_id");

-- CreateIndex
CREATE INDEX "idx_reg_banco_referencia1" ON "registros_banco"("referencia1");

-- CreateIndex
CREATE INDEX "idx_banco_det_archivo" ON "registros_banco_detalle"("archivo_banco_id");

-- CreateIndex
CREATE INDEX "idx_banco_det_sucursal" ON "registros_banco_detalle"("sucursal_id");

-- CreateIndex
CREATE INDEX "idx_banco_det_fecha_vale" ON "registros_banco_detalle"("fecha_vale");

-- CreateIndex
CREATE INDEX "idx_banco_det_fecha_abono" ON "registros_banco_detalle"("fecha_abono");

-- CreateIndex
CREATE INDEX "idx_banco_det_terminal" ON "registros_banco_detalle"("terminal");

-- CreateIndex
CREATE INDEX "idx_banco_det_autoriza" ON "registros_banco_detalle"("numero_autoriza");

-- CreateIndex
CREATE INDEX "idx_banco_det_tarjeta" ON "registros_banco_detalle"("tarjeta_socio");

-- CreateIndex
CREATE INDEX "idx_reg_redeban_archivo" ON "registros_redeban"("archivo_redeban_id");

-- CreateIndex
CREATE INDEX "idx_reg_redeban_sucursal" ON "registros_redeban"("sucursal_id");

-- CreateIndex
CREATE UNIQUE INDEX "sucursales_codigo_comercio_redeban_key" ON "sucursales"("codigo_comercio_redeban");

-- CreateIndex
CREATE UNIQUE INDEX "sucursales_codigo_referencia_banco_key" ON "sucursales"("codigo_referencia_banco");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "idx_vouchers_sucursal_fecha" ON "vouchers"("sucursal_id", "fecha_operacion");

-- CreateIndex
CREATE INDEX "idx_voucher_transacciones_voucher" ON "voucher_transacciones"("voucher_id");

-- CreateIndex
CREATE INDEX "idx_voucher_transacciones_digitos" ON "voucher_transacciones"("ultimos_digitos");

-- CreateIndex
CREATE INDEX "idx_voucher_transacciones_recibo" ON "voucher_transacciones"("numero_recibo");

-- CreateIndex
CREATE INDEX "idx_conc_tx_conciliacion" ON "conciliacion_transacciones"("conciliacion_id");

-- CreateIndex
CREATE INDEX "idx_conc_tx_sucursal_fecha" ON "conciliacion_transacciones"("sucursal_id", "fecha_venta");

-- CreateIndex
CREATE INDEX "idx_conc_tx_terminal" ON "conciliacion_transacciones"("terminal");

-- CreateIndex
CREATE INDEX "idx_conc_tx_autoriza" ON "conciliacion_transacciones"("numero_autoriza");

-- CreateIndex
CREATE INDEX "idx_conc_tx_recibo" ON "conciliacion_transacciones"("numero_recibo");

-- CreateIndex
CREATE INDEX "idx_conc_tx_digitos" ON "conciliacion_transacciones"("ultimos_digitos");

-- CreateIndex
CREATE INDEX "idx_conc_tx_estado" ON "conciliacion_transacciones"("estado");

-- AddForeignKey
ALTER TABLE "archivos_banco" ADD CONSTRAINT "archivos_banco_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "archivos_redeban" ADD CONSTRAINT "archivos_redeban_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conciliaciones" ADD CONSTRAINT "conciliaciones_archivo_banco_id_fkey" FOREIGN KEY ("archivo_banco_id") REFERENCES "archivos_banco"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conciliaciones" ADD CONSTRAINT "conciliaciones_archivo_redeban_id_fkey" FOREIGN KEY ("archivo_redeban_id") REFERENCES "archivos_redeban"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conciliaciones" ADD CONSTRAINT "conciliaciones_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conciliaciones" ADD CONSTRAINT "conciliaciones_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "registros_banco" ADD CONSTRAINT "registros_banco_archivo_banco_id_fkey" FOREIGN KEY ("archivo_banco_id") REFERENCES "archivos_banco"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "registros_banco_detalle" ADD CONSTRAINT "registros_banco_detalle_archivo_banco_id_fkey" FOREIGN KEY ("archivo_banco_id") REFERENCES "archivos_banco"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "registros_banco_detalle" ADD CONSTRAINT "registros_banco_detalle_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "registros_redeban" ADD CONSTRAINT "registros_redeban_archivo_redeban_id_fkey" FOREIGN KEY ("archivo_redeban_id") REFERENCES "archivos_redeban"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "registros_redeban" ADD CONSTRAINT "registros_redeban_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_confirmado_por_id_fkey" FOREIGN KEY ("confirmado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouchers" ADD CONSTRAINT "vouchers_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_transacciones" ADD CONSTRAINT "voucher_transacciones_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conciliacion_transacciones" ADD CONSTRAINT "conciliacion_transacciones_conciliacion_id_fkey" FOREIGN KEY ("conciliacion_id") REFERENCES "conciliaciones"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conciliacion_transacciones" ADD CONSTRAINT "conciliacion_transacciones_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conciliacion_transacciones" ADD CONSTRAINT "conciliacion_transacciones_voucher_tx_id_fkey" FOREIGN KEY ("voucher_tx_id") REFERENCES "voucher_transacciones"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conciliacion_transacciones" ADD CONSTRAINT "conciliacion_transacciones_banco_detalle_id_fkey" FOREIGN KEY ("banco_detalle_id") REFERENCES "registros_banco_detalle"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
