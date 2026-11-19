/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

interface RecalculoRow {
  circulo_id: string;
  circulo_nombre: string;
  anio_vida: string;
  capacidad_total: number;
  cupos_ocupados: number;
  cupos_disponibles: number;
  sobrecapacidad: number;
  excede_sobrecapacidad: boolean;
}

@Injectable()
export class CapacidadStartupService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CapacidadStartupService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    // Skip en tests
    if (process.env.JEST_WORKER_ID) return;

    // Skip si se desactiva por env (útil en dev con --watch)
    if (process.env.RECALC_ON_START === 'false') {
      this.logger.debug('Recálculo al arrancar desactivado por env');
      return;
    }

    try {
      const start = Date.now();
      const filas = await this.prisma.$queryRaw<RecalculoRow[]>`
        SELECT * FROM recalcular_capacidades_circulos();
      `;

      const totalCirculos = new Set(filas.map((f) => f.circulo_id)).size;
      const excedidos = filas.filter((f) => f.excede_sobrecapacidad).length;
      const ms = Date.now() - start;

      this.logger.log(
        `✅ Capacidades recalculadas en ${ms}ms: ` +
          `${filas.length} año(s) en ${totalCirculos} círculo(s)` +
          (excedidos > 0
            ? ` — ⚠️ ${excedidos} año(s) exceden la sobrecapacidad`
            : ''),
      );
    } catch (error: any) {
      // No relanzar: el backend debe arrancar aunque falle el recálculo
      this.logger.error(
        `❌ No se pudieron recalcular las capacidades al arrancar: ${error.message}`,
        error.stack,
      );
    }
  }
}
