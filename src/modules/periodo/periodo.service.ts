/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePeriodoDto, UpdatePeriodoDto } from './dto';

@Injectable()
export class PeriodoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePeriodoDto) {
    // Validar que no haya superposición de fechas con períodos activos
    const periodosSuperpuestos = await this.prisma.periodoOtorgamiento.findMany(
      {
        where: {
          activo: true,
          OR: [
            {
              fechaInicio: { lte: new Date(data.fechaCierre) },
              fechaCierre: { gte: new Date(data.fechaInicio) },
            },
          ],
        },
      },
    );

    if (periodosSuperpuestos.length > 0) {
      throw new ConflictException(
        'Ya existe un período activo en las fechas seleccionadas',
      );
    }

    return this.prisma.periodoOtorgamiento.create({
      data: {
        ...data,
        fechaInicio: new Date(data.fechaInicio),
        fechaCierre: new Date(data.fechaCierre),
        fechaAsignacion: new Date(data.fechaAsignacion),
      },
    });
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
        solicitudes: {
          include: {
            nino: true,
          },
        },
        capacidades: {
          include: {
            circulo: true,
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
        capacidades: {
          include: {
            circulo: true,
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
      include: {
        capacidades: {
          include: {
            circulo: true,
          },
        },
      },
    });
  }

  async update(id: string, data: UpdatePeriodoDto) {
    const periodo = await this.prisma.periodoOtorgamiento.findUnique({
      where: { id },
    });

    if (!periodo) {
      throw new NotFoundException(`Período con ID ${id} no encontrado`);
    }

    const updateData: any = { ...data };

    if (data.fechaInicio) {
      updateData.fechaInicio = new Date(data.fechaInicio);
    }

    if (data.fechaCierre) {
      updateData.fechaCierre = new Date(data.fechaCierre);
    }

    if (data.fechaAsignacion) {
      updateData.fechaAsignacion = new Date(data.fechaAsignacion);
    }

    return this.prisma.periodoOtorgamiento.update({
      where: { id },
      data: updateData,
    });
  }

  async toggleActivo(id: string, activo: boolean) {
    const periodo = await this.prisma.periodoOtorgamiento.findUnique({
      where: { id },
    });

    if (!periodo) {
      throw new NotFoundException(`Período con ID ${id} no encontrado`);
    }

    // Si se está activando, desactivar otros períodos activos
    if (activo) {
      await this.prisma.periodoOtorgamiento.updateMany({
        where: {
          id: { not: id },
          activo: true,
        },
        data: { activo: false },
      });
    }

    return this.prisma.periodoOtorgamiento.update({
      where: { id },
      data: { activo },
    });
  }

  async remove(id: string) {
    const periodo = await this.prisma.periodoOtorgamiento.findUnique({
      where: { id },
    });

    if (!periodo) {
      throw new NotFoundException(`Período con ID ${id} no encontrado`);
    }

    // Verificar que no tenga solicitudes asociadas
    const solicitudesCount = await this.prisma.solicitud.count({
      where: { periodoId: id },
    });

    if (solicitudesCount > 0) {
      throw new ConflictException(
        'No se puede eliminar un período con solicitudes asociadas',
      );
    }

    return this.prisma.periodoOtorgamiento.delete({
      where: { id },
    });
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
        capacidades: true,
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

    const cuposTotales = periodo.capacidades.reduce(
      (acc, cap) => acc + (cap.cuposDisponibles + cap.cuposOcupados),
      0,
    );
    const cuposOcupados = periodo.capacidades.reduce(
      (acc, cap) => acc + cap.cuposOcupados,
      0,
    );
    const cuposDisponibles = periodo.capacidades.reduce(
      (acc, cap) => acc + cap.cuposDisponibles,
      0,
    );

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
        cuposTotales,
        cuposOcupados,
        cuposDisponibles,
        ocupacionPorcentaje:
          cuposTotales > 0 ? (cuposOcupados / cuposTotales) * 100 : 0,
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
        capacidades: true,
      },
    });

    const solicitudesTotales = periodos.reduce(
      (acc, p) => acc + p.solicitudes.length,
      0,
    );
    const cuposTotales = periodos.reduce(
      (acc, p) =>
        acc +
        p.capacidades.reduce(
          (sum, c) => sum + (c.cuposDisponibles + c.cuposOcupados),
          0,
        ),
      0,
    );

    return {
      total,
      activos,
      inactivos: total - activos,
      solicitudesTotales,
      cuposTotales,
      promedioSolicitudesPorPeriodo: total > 0 ? solicitudesTotales / total : 0,
      promedioCuposPorPeriodo: total > 0 ? cuposTotales / total : 0,
    };
  }
}
