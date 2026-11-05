import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { hoy } from './fechas';

@Injectable()
export class PeriodoSchedulerService {
  private readonly logger = new Logger(PeriodoSchedulerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Solo actúa en los cambios de fecha: cierra los períodos vencidos y activa
   * el que empieza hoy. Así no reactiva cada noche un período que el
   * administrador desactivó a mano en mitad de su vigencia.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async actualizarPeriodosActivos(ahora = new Date()) {
    this.logger.log('Ejecutando actualización automática de períodos activos');
    const dia = hoy(ahora);

    const vencidos = await this.prisma.periodoOtorgamiento.updateMany({
      where: { activo: true, fechaCierre: { lt: dia } },
      data: { activo: false },
    });
    if (vencidos.count > 0) {
      this.logger.log(`Períodos cerrados por fecha: ${vencidos.count}`);
    }

    const queEmpieza = await this.prisma.periodoOtorgamiento.findFirst({
      where: { fechaInicio: dia },
    });
    if (!queEmpieza) return;

    await this.prisma.$transaction([
      this.prisma.periodoOtorgamiento.updateMany({
        where: { activo: true, id: { not: queEmpieza.id } },
        data: { activo: false },
      }),
      this.prisma.periodoOtorgamiento.update({
        where: { id: queEmpieza.id },
        data: { activo: true },
      }),
    ]);
    this.logger.log(`Período activado: ${queEmpieza.nombre}`);
  }
}
