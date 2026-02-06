/*
  Warnings:

  - Added the required column `provincia` to the `perfiles_comisiones` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provincia` to the `perfiles_funcionarios` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provincia` to the `perfiles_solicitantes` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "controles_trimestrales" ALTER COLUMN "fecha" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "matriculas" ALTER COLUMN "fechaLimite" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "ninos" ALTER COLUMN "fechaNacimiento" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "perfiles_comisiones" ADD COLUMN     "provincia" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "perfiles_funcionarios" ADD COLUMN     "provincia" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "perfiles_solicitantes" ADD COLUMN     "provincia" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "periodos_otorgamiento" ALTER COLUMN "fechaInicio" SET DATA TYPE DATE,
ALTER COLUMN "fechaCierre" SET DATA TYPE DATE,
ALTER COLUMN "fechaAsignacion" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "sesiones_comision" ALTER COLUMN "fecha" SET DATA TYPE DATE;
