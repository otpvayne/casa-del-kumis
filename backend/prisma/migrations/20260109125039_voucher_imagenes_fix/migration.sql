-- CreateTable
CREATE TABLE "voucher_imagenes" (
    "id" BIGSERIAL NOT NULL,
    "voucher_id" BIGINT NOT NULL,
    "ruta_imagen" VARCHAR(255) NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 1,
    "precision_ocr" DECIMAL(5,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_imagenes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_voucher_img_voucher" ON "voucher_imagenes"("voucher_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_voucher_img_orden" ON "voucher_imagenes"("voucher_id", "orden");

-- AddForeignKey
ALTER TABLE "voucher_imagenes" ADD CONSTRAINT "voucher_imagenes_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
