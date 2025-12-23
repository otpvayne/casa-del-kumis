-- AlterTable
ALTER TABLE "registros_redeban" ADD COLUMN     "direccion" VARCHAR(200),
ADD COLUMN     "neto" DECIMAL(14,2),
ADD COLUMN     "retefuente" DECIMAL(14,2),
ADD COLUMN     "tasa_aerop_propina" DECIMAL(14,2);
