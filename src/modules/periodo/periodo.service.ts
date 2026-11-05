/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePeriodoDto, UpdatePeriodoDto } from './dto';
import { aFecha, estaVigente, formatoFecha, hoy } from './fechas';

@Injectable()
export class PeriodoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePeriodoDto) {
    const fechas = this.validarFechas(data);
    await this.verificarSolapamiento(fechas);

    // Un período nuevo solo nace activo si hoy está dentro de sus fechas
    const activo = estaVigente(fechas);

    return this.prisma.$transaction(async (tx) => {
      if (activo) {
        await tx.periodoOtorgamiento.updateMany({
          where: { activo: true },
          data: { activo: false },
        });
      }
      return tx.periodoOtorgamiento.create({
        data: { nombre: data.nombre.trim(), ...fechas, activo },
      });
    });
  }

  /** Normaliza las fechas y comprueba el orden inicio → cierre → asignación. */
  private validarFechas(data: {
    fechaInicio: string | Date;
    fechaCierre: string | Date;
    fechaAsignacion: string | Date;
  }) {
    const fechaInicio = aFecha(data.fechaInicio);
    const fechaCierre = aFecha(data.fechaCierre);
    const fechaAsignacion = aFecha(data.fechaAsignacion);

    if ([fechaInicio, fechaCierre, fechaAsignacion].some((f) => isNaN(+f))) {
      throw new BadRequestException('Alguna de las fechas no es válida');
    }
    if (fechaCierre <= fechaInicio) {
      throw new BadRequestException(
        'La fecha de cierre debe ser posterior a la fecha de inicio',
      );
    }
    if (fechaAsignacion <= fechaCierre) {
      throw new BadRequestException(
        'La fecha de asignación debe ser posterior a la fecha de cierre',
      );
    }
    return { fechaInicio, fechaCierre, fechaAsignacion };
  }

  /** Dos períodos no pueden compartir ningún día de recepción de solicitudes. */
  private async verificarSolapamiento(
    fechas: { fechaInicio: Date; fechaCierre: Date },
    excluirId?: string,
  ) {
    const otro = await this.prisma.periodoOtorgamiento.findFirst({
      where: {
        ...(excluirId && { id: { not: excluirId } }),
        fechaInicio: { lte: fechas.fechaCierre },
        fechaCierre: { gte: fechas.fechaInicio },
      },
      orderBy: { fechaInicio: 'asc' },
    });

    if (otro) {
      throw new ConflictException(
        `Las fechas se solapan con el período "${otro.nombre}" ` +
          `(${formatoFecha(otro.fechaInicio)} – ${formatoFecha(otro.fechaCierre)})`,
      );
    }
  }

  async findAll(filtros?: {
    activo?: boolean;
    fechaInicioDesde?: Date;
    fechaInicioHasta?: Date;
    nombre?: string;
  }) {
    const where: any = {};

    if (filtros?.activo !== undefined) {
      where.activo = filtros.activo;
    }

    if (filtros?.nombre) {
      where.nombre = {
        contains: filtros.nombre,
        mode: 'insensitive',
      };
    }

    if (filtros?.fechaInicioDesde || filtros?.fechaInicioHasta) {
      where.fechaInicio = {};

      if (filtros.fechaInicioDesde) {
        where.fechaInicio.gte = filtros.fechaInicioDesde;
      }

      if (filtros.fechaInicioHasta) {
        where.fechaInicio.lte = filtros.fechaInicioHasta;
      }
    }

    return this.prisma.periodoOtorgamiento.findMany({
      where,
      include: {
        _count: { select: { solicitudes: true, sesiones: true } },
        solicitudes: {
          include: {
            nino: true,
          },
        },
        sesiones: {
          orderBy: {
            fecha: 'desc',
          },
        },
      },
      orderBy: {
        fechaInicio: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const periodo = await this.prisma.periodoOtorgamiento.findUnique({
      where: { id },
      include: {
        solicitudes: {
          include: {
            nino: {
              include: {
                solicitante: true,
              },
            },
            documentos: true,
            decisiones: true,
            matricula: true,
          },
        },
        sesiones: {
          include: {
            decisiones: {
              include: {
                solicitud: true,
              },
            },
          },
          orderBy: {
            fecha: 'desc',
          },
        },
      },
    });

    if (!periodo) {
      throw new NotFoundException(`Período con ID ${id} no encontrado`);
    }

    return periodo;
  }

  async findActivo() {
    return this.prisma.periodoOtorgamiento.findFirst({
      where: { activo: true },
    });
  }

  async update(id: string, data: UpdatePeriodoDto) {
    const periodo = await this.prisma.periodoOtorgamiento.findUnique({
      where: { id },
    });

    if (!periodo) {
      throw new NotFoundException(`Período con ID ${id} no encontrado`);
    }

    const fechas = this.validarFechas({
      fechaInicio: data.fechaInicio ?? periodo.fechaInicio,
      fechaCierre: data.fechaCierre ?? periodo.fechaCierre,
      fechaAsignacion: data.fechaAsignacion ?? periodo.fechaAsignacion,
    });
    await this.verificarSolapamiento(fechas, id);

    // Si las nuevas fechas dejan fuera el día de hoy, deja de estar activo
    const activo = periodo.activo && estaVigente(fechas);

    return this.prisma.periodoOtorgamiento.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined && { nombre: data.nombre.trim() }),
        ...fechas,
        activo,
      },
    });
  }

  async toggleActivo(id: string, activo: boolean) {
    if (typeof activo !== 'boolean') {
      throw new BadRequestException('El campo "activo" debe ser true o false');
    }

    const periodo = await this.prisma.periodoOtorgamiento.findUnique({
      where: { id },
    });

    if (!periodo) {
      throw new NotFoundException(`Período con ID ${id} no encontrado`);
    }

    if (!activo) {
      return this.prisma.periodoOtorgamiento.update({
        where: { id },
        data: { activo: false },
      });
    }

    // Solo puede estar activo el período que cubre el día de hoy
    if (!estaVigente(periodo)) {
      throw new BadRequestException(
        `Solo se puede activar un período vigente. "${periodo.nombre}" va del ` +
          `${formatoFecha(periodo.fechaInicio)} al ${formatoFecha(periodo.fechaCierre)}`,
      );
    }

    // Activar uno desactiva los demás, en la misma transacción
    return this.prisma.$transaction(async (tx) => {
      await tx.periodoOtorgamiento.updateMany({
        where: { id: { not: id }, activo: true },
        data: { activo: false },
      });
      return tx.periodoOtorgamiento.update({
        where: { id },
        data: { activo: true },
      });
    });
  }

  async remove(id: string) {
    const periodo = await this.prisma.periodoOtorgamiento.findUnique({
      where: { id },
      include: { _count: { select: { solicitudes: true, sesiones: true } } },
    });

    if (!periodo) {
      throw new NotFoundException(`Período con ID ${id} no encontrado`);
    }

    if (periodo.activo) {
      throw new ConflictException(
        'No se puede eliminar el período activo. Desactívelo primero',
      );
    }

    // Borrar el período borraría en cascada sus solicitudes y sesiones
    const { solicitudes, sesiones } = periodo._count;
    if (solicitudes > 0 || sesiones > 0) {
      const partes = [
        solicitudes > 0 && `${solicitudes} solicitud(es)`,
        sesiones > 0 && `${sesiones} sesión(es) de la comisión`,
      ].filter(Boolean);
      throw new ConflictException(
        `No se puede eliminar el período porque tiene ${partes.join(' y ')} asociadas`,
      );
    }

    await this.prisma.periodoOtorgamiento.delete({ where: { id } });
    return { message: `Período "${periodo.nombre}" eliminado` };
  }

  async getEstadisticas(id: string) {
    const periodo = await this.prisma.periodoOtorgamiento.findUnique({
      where: { id },
      include: {
        solicitudes: {
          include: {
            nino: true,
            documentos: true,
            decisiones: true,
            matricula: true,
          },
        },
      },
    });

    if (!periodo) {
      throw new NotFoundException(`Período con ID ${id} no encontrado`);
    }

    const totalSolicitudes = periodo.solicitudes.length;
    const solicitudesAprobadas = periodo.solicitudes.filter((s) =>
      s.decisiones.some((d) => d.resultado === 'ACEPTADA'),
    ).length;
    const solicitudesDenegadas = periodo.solicitudes.filter((s) =>
      s.decisiones.some((d) => d.resultado === 'DENEGADA'),
    ).length;
    const solicitudesPendientes =
      totalSolicitudes - solicitudesAprobadas - solicitudesDenegadas;

    return {
      periodo: {
        id: periodo.id,
        nombre: periodo.nombre,
        fechaInicio: periodo.fechaInicio,
        fechaCierre: periodo.fechaCierre,
      },
      estadisticas: {
        totalSolicitudes,
        solicitudesAprobadas,
        solicitudesDenegadas,
        solicitudesPendientes,
        porcentajeAprobadas:
          totalSolicitudes > 0
            ? (solicitudesAprobadas / totalSolicitudes) * 100
            : 0,
        porcentajeDenegadas:
          totalSolicitudes > 0
            ? (solicitudesDenegadas / totalSolicitudes) * 100
            : 0,
      },
    };
  }

  async getEstadisticasGenerales() {
    const total = await this.prisma.periodoOtorgamiento.count();
    const activos = await this.prisma.periodoOtorgamiento.count({
      where: { activo: true },
    });

    const periodos = await this.prisma.periodoOtorgamiento.findMany({
      include: {
        solicitudes: true,
      },
    });

    const solicitudesTotales = periodos.reduce(
      (acc, p) => acc + p.solicitudes.length,
      0,
    );

    return {
      total,
      activos,
      inactivos: total - activos,
      solicitudesTotales,
      promedioSolicitudesPorPeriodo: total > 0 ? solicitudesTotales / total : 0,
    };
  }

  public async obtenerPeriodoActivo(fecha: Date) {
    const startOfDay = hoy(fecha);

    const periodo = await this.prisma.periodoOtorgamiento.findFirst({
      where: {
        fechaInicio: { lte: startOfDay },
        fechaCierre: { gte: startOfDay },
        activo: true,
      },
    });

    if (!periodo) {
      throw new NotFoundException(
        'No hay un período de otorgamiento activo para la fecha actual',
      );
    }
    return periodo;
  }
}
