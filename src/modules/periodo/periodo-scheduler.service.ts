import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PeriodoSchedulerService {
  private readonly logger = new Logger(PeriodoSchedulerService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async actualizarPeriodosActivos() {
    this.logger.log('Ejecutando actualización automática de períodos activos');
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Buscar período que cubre la fecha actual
    const periodoActivo = await this.prisma.periodoOtorgamiento.findFirst({
      where: {
        fechaInicio: { lte: hoy },
        fechaCierre: { gte: hoy },
      },
    });

    // Desactivar todos los períodos primero
    await this.prisma.periodoOtorgamiento.updateMany({
      where: { activo: true },
      data: { activo: false },
    });

    // Activar el período correspondiente si existe
    if (periodoActivo) {
      await this.prisma.periodoOtorgamiento.update({
        where: { id: periodoActivo.id },
        data: { activo: true },
      });
      this.logger.log(`Período activado: ${periodoActivo.nombre}`);
    } else {
      this.logger.warn('No hay período activo para la fecha actual');
    }
  }
}
