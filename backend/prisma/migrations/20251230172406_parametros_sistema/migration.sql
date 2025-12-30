-- AlterTable
ALTER TABLE "parametros_sistema" ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "idx_params_activo" ON "parametros_sistema"("activo");
