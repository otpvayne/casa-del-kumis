-- ============================================
-- 1. TABLA usuarios
-- ============================================
CREATE TABLE usuarios (
    id              BIGSERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    rol             VARCHAR(20) NOT NULL CHECK (rol IN
                    ('PROPIETARIO', 'ADMIN', 'OPERADOR', 'SOPORTE', 'DESARROLLADOR')),
    estado          VARCHAR(20) NOT NULL CHECK (estado IN
                    ('ACTIVO', 'INACTIVO', 'BLOQUEADO')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. TABLA sucursales
-- ============================================
CREATE TABLE sucursales (
    id                          BIGSERIAL PRIMARY KEY,
    nombre                      VARCHAR(150) NOT NULL,
    codigo_comercio_redeban     VARCHAR(50) NOT NULL UNIQUE,
    codigo_referencia_banco     VARCHAR(50) NOT NULL UNIQUE,
    direccion                   VARCHAR(255),
    estado                      VARCHAR(20) NOT NULL CHECK (estado IN ('ACTIVA','INACTIVA')),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 3. TABLA vouchers
-- ============================================
CREATE TABLE vouchers (
    id                  BIGSERIAL PRIMARY KEY,
    sucursal_id         BIGINT NOT NULL REFERENCES sucursales(id),
    creado_por_id       BIGINT NOT NULL REFERENCES usuarios(id),
    confirmado_por_id   BIGINT REFERENCES usuarios(id),

    fecha_operacion     DATE NOT NULL,
    ruta_imagen         VARCHAR(255) NOT NULL,

    total_visa          NUMERIC(14,2),
    total_mastercard    NUMERIC(14,2),
    total_global        NUMERIC(14,2),

    precision_ocr       NUMERIC(5,2),
    estado              VARCHAR(30) NOT NULL CHECK (estado IN
                        ('PENDIENTE_OCR','PENDIENTE_CONFIRMACION','CONFIRMADO','CONFIRMADO_EDITADO')),

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmado_en       TIMESTAMPTZ
);

CREATE INDEX idx_vouchers_sucursal_fecha
    ON vouchers (sucursal_id, fecha_operacion);

-- ============================================
-- 4. TABLAS archivos_redeban + registros_redeban
-- ============================================
CREATE TABLE archivos_redeban (
    id                  BIGSERIAL PRIMARY KEY,
    fecha_conciliacion  DATE NOT NULL,
    nombre_original     VARCHAR(255) NOT NULL,
    ruta_archivo        VARCHAR(255) NOT NULL,
    hash_contenido      VARCHAR(100) NOT NULL UNIQUE,
    estado              VARCHAR(20) NOT NULL CHECK (estado IN
                        ('CARGADO','VALIDADO','INVALIDO')),
    usuario_id          BIGINT NOT NULL REFERENCES usuarios(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE registros_redeban (
    id                      BIGSERIAL PRIMARY KEY,
    archivo_redeban_id      BIGINT NOT NULL REFERENCES archivos_redeban(id) ON DELETE CASCADE,
    sucursal_id             BIGINT REFERENCES sucursales(id),

    codigo_comercio         VARCHAR(50) NOT NULL,
    cantidad_transacciones  INT,
    valor_bruto             NUMERIC(14,2),
    base_liquidacion        NUMERIC(14,2),
    iva                     NUMERIC(14,2),
    consumo                 NUMERIC(14,2),
    comision                NUMERIC(14,2),
    rete_iva                NUMERIC(14,2),
    rete_ica                NUMERIC(14,2)
);

CREATE INDEX idx_reg_redeban_archivo
    ON registros_redeban (archivo_redeban_id);

CREATE INDEX idx_reg_redeban_sucursal
    ON registros_redeban (sucursal_id);

-- ============================================
-- 5. TABLAS archivos_banco + registros_banco
-- ============================================
CREATE TABLE archivos_banco (
    id              BIGSERIAL PRIMARY KEY,
    fecha_archivo   DATE NOT NULL,
    nombre_original VARCHAR(255) NOT NULL,
    ruta_archivo    VARCHAR(255) NOT NULL,
    hash_contenido  VARCHAR(100) NOT NULL UNIQUE,
    estado          VARCHAR(20) NOT NULL CHECK (estado IN
                    ('CARGADO','VALIDADO','INVALIDO')),
    usuario_id      BIGINT NOT NULL REFERENCES usuarios(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE registros_banco (
    id                  BIGSERIAL PRIMARY KEY,
    archivo_banco_id    BIGINT NOT NULL REFERENCES archivos_banco(id) ON DELETE CASCADE,

    fecha_sistema       DATE NOT NULL,
    documento           VARCHAR(50),
    descripcion_motivo  VARCHAR(255),
    valor_total         NUMERIC(14,2) NOT NULL,
    referencia1         VARCHAR(50),
    referencia2         VARCHAR(50),

    es_abono_visa       BOOLEAN NOT NULL DEFAULT FALSE,
    es_abono_mastercard BOOLEAN NOT NULL DEFAULT FALSE,
    es_abono_tardio     BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_reg_banco_archivo
    ON registros_banco (archivo_banco_id);

CREATE INDEX idx_reg_banco_referencia1
    ON registros_banco (referencia1);

-- ============================================
-- 6. TABLA conciliaciones
-- ============================================
CREATE TABLE conciliaciones (
    id                      BIGSERIAL PRIMARY KEY,
    sucursal_id             BIGINT NOT NULL REFERENCES sucursales(id),
    fecha_ventas            DATE NOT NULL,

    voucher_id              BIGINT REFERENCES vouchers(id),
    archivo_redeban_id      BIGINT REFERENCES archivos_redeban(id),
    archivo_banco_id        BIGINT REFERENCES archivos_banco(id),

    estado                  VARCHAR(30) NOT NULL CHECK (estado IN
                            ('CONCILIADO','CON_DIFERENCIAS','ERROR_ESTRUCTURA','FALTA_VOUCHER','FALTA_ARCHIVOS')),

    total_visa_voucher      NUMERIC(14,2),
    total_mc_voucher        NUMERIC(14,2),
    total_global_voucher    NUMERIC(14,2),

    base_liquidacion_redeban NUMERIC(14,2),
    total_banco_ajustado    NUMERIC(14,2),
    comision_esperada       NUMERIC(14,2),
    diferencia_calculada    NUMERIC(14,2),
    margen_permitido        NUMERIC(14,2),

    causa_principal         VARCHAR(255),

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_conc_sucursal_fecha
    ON conciliaciones (sucursal_id, fecha_ventas);

-- ============================================
-- 7. TABLA parametros_sistema
-- ============================================
CREATE TABLE parametros_sistema (
    id                      BIGSERIAL PRIMARY KEY,
    tasa_comision           NUMERIC(5,4) NOT NULL, -- ej. 0.0120
    margen_error_permitido  NUMERIC(14,2) NOT NULL,
    dias_desfase_banco      INT NOT NULL DEFAULT 1,
    activo                  BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 8. TABLA logs_evento
-- ============================================
CREATE TABLE logs_evento (
    id              BIGSERIAL PRIMARY KEY,
    fecha_hora      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    usuario_email   VARCHAR(150),
    tipo_evento     VARCHAR(30) NOT NULL CHECK (tipo_evento IN
                    ('LOGIN','CARGA_ARCHIVO','CONCILIACION','CONFIGURACION','ERROR_SISTEMA')),
    modulo          VARCHAR(50) NOT NULL,
    mensaje         VARCHAR(255) NOT NULL,
    detalle_tecnico TEXT,
    severidad       VARCHAR(10) NOT NULL CHECK (severidad IN ('INFO','WARN','ERROR','CRITICO'))
);

CREATE INDEX idx_logs_fecha
    ON logs_evento (fecha_hora);

CREATE INDEX idx_logs_tipo
    ON logs_evento (tipo_evento);
