/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSesionDto, UpdateSesionDto } from './dto';

@Injectable()
export class SesionComisionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSesionDto) {
    // Verificar que el período existe
    const periodo = await this.prisma.periodoOtorgamiento.findUnique({
      where: { id: data.periodoId },
    });

    if (!periodo) {
      throw new NotFoundException(
        `Período con ID ${data.periodoId} no encontrado`,
      );
    }

    return this.prisma.sesionComision.create({
      data: {
        periodoId: data.periodoId,
        fecha: new Date(data.fecha),
        municipio: data.municipio,
        actaUrl: data.actaUrl,
      },
    });
  }

  async findAll(filtros?: {
    periodoId?: string;
    municipio?: string;
    fechaDesde?: Date;
    fechaHasta?: Date;
    conActa?: boolean;
  }) {
    const where: any = {};

    if (filtros?.periodoId) {
      where.periodoId = filtros.periodoId;
    }

    if (filtros?.municipio) {
      where.municipio = {
        contains: filtros.municipio,
        mode: 'insensitive',
      };
    }

    if (filtros?.conActa !== undefined) {
      if (filtros.conActa) {
        where.actaUrl = { not: null };
      } else {
        where.actaUrl = null;
      }
    }

    if (filtros?.fechaDesde || filtros?.fechaHasta) {
      where.fecha = {};

      if (filtros.fechaDesde) {
        where.fecha.gte = filtros.fechaDesde;
      }

      if (filtros.fechaHasta) {
        where.fecha.lte = filtros.fechaHasta;
      }
    }

    return this.prisma.sesionComision.findMany({
      where,
      include: {
        periodo: true,
        decisiones: {
          include: {
            solicitud: {
              include: {
                nino: true,
              },
            },
            comision: true,
          },
        },
      },
      orderBy: {
        fecha: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const sesion = await this.prisma.sesionComision.findUnique({
      where: { id },
      include: {
        periodo: true,
        decisiones: {
          include: {
            solicitud: {
              include: {
                nino: {
                  include: {
                    solicitante: true,
                  },
                },
                periodo: true,
              },
            },
            comision: true,
          },
        },
      },
    });

    if (!sesion) {
      throw new NotFoundException(`Sesión con ID ${id} no encontrada`);
    }

    return sesion;
  }

  async findByPeriodoId(periodoId: string) {
    return this.prisma.sesionComision.findMany({
      where: { periodoId },
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
    });
  }

  async findByMunicipio(municipio: string) {
    return this.prisma.sesionComision.findMany({
      where: {
        municipio: {
          contains: municipio,
          mode: 'insensitive',
        },
      },
      include: {
        periodo: true,
        decisiones: true,
      },
      orderBy: {
        fecha: 'desc',
      },
    });
  }

  async getProximasSesiones(dias: number = 7) {
    const hoy = new Date();
    const fechaLimite = new Date();
    fechaLimite.setDate(hoy.getDate() + dias);

    return this.prisma.sesionComision.findMany({
      where: {
        fecha: {
          gte: hoy,
          lte: fechaLimite,
        },
      },
      include: {
        periodo: true,
      },
      orderBy: {
        fecha: 'asc',
      },
    });
  }

  async update(id: string, data: UpdateSesionDto) {
    const sesion = await this.prisma.sesionComision.findUnique({
      where: { id },
    });

    if (!sesion) {
      throw new NotFoundException(`Sesión con ID ${id} no encontrada`);
    }

    const updateData: any = { ...data };

    if (data.fecha) {
      updateData.fecha = new Date(data.fecha);
    }

    return this.prisma.sesionComision.update({
      where: { id },
      data: updateData,
    });
  }

  async updateActa(id: string, actaUrl: string) {
    const sesion = await this.prisma.sesionComision.findUnique({
      where: { id },
    });

    if (!sesion) {
      throw new NotFoundException(`Sesión con ID ${id} no encontrada`);
    }

    return this.prisma.sesionComision.update({
      where: { id },
      data: { actaUrl },
    });
  }

  async remove(id: string) {
    const sesion = await this.prisma.sesionComision.findUnique({
      where: { id },
    });

    if (!sesion) {
      throw new NotFoundException(`Sesión con ID ${id} no encontrada`);
    }

    // Verificar que no tenga decisiones asociadas
    const decisionesCount = await this.prisma.decisionSolicitud.count({
      where: { sesionId: id },
    });

    if (decisionesCount > 0) {
      throw new Error(
        'No se puede eliminar una sesión con decisiones asociadas',
      );
    }

    return this.prisma.sesionComision.delete({
      where: { id },
    });
  }

  async getEstadisticas(id: string) {
    const sesion = await this.prisma.sesionComision.findUnique({
      where: { id },
      include: {
        decisiones: {
          include: {
            solicitud: true,
          },
        },
        periodo: true,
      },
    });

    if (!sesion) {
      throw new NotFoundException(`Sesión con ID ${id} no encontrada`);
    }

    const totalDecisiones = sesion.decisiones.length;
    const decisionesAceptadas = sesion.decisiones.filter(
      (d) => d.resultado === 'ACEPTADA',
    ).length;
    const decisionesDenegadas = sesion.decisiones.filter(
      (d) => d.resultado === 'DENEGADA',
    ).length;

    return {
      sesion: {
        id: sesion.id,
        fecha: sesion.fecha,
        municipio: sesion.municipio,
        periodo: sesion.periodo.nombre,
      },
      estadisticas: {
        totalDecisiones,
        decisionesAceptadas,
        decisionesDenegadas,
        porcentajeAceptadas:
          totalDecisiones > 0
            ? (decisionesAceptadas / totalDecisiones) * 100
            : 0,
        porcentajeDenegadas:
          totalDecisiones > 0
            ? (decisionesDenegadas / totalDecisiones) * 100
            : 0,
      },
    };
  }

  async getEstadisticasGenerales(periodoId?: string) {
    const where: any = {};

    if (periodoId) {
      where.periodoId = periodoId;
    }

    const sesiones = await this.prisma.sesionComision.findMany({
      where,
      include: {
        decisiones: true,
        periodo: true,
      },
    });

    const totalSesiones = sesiones.length;
    const sesionesConActa = sesiones.filter((s) => s.actaUrl !== null).length;

    const totalDecisiones = sesiones.reduce(
      (acc, s) => acc + s.decisiones.length,
      0,
    );
    const decisionesAceptadas = sesiones.reduce(
      (acc, s) =>
        acc + s.decisiones.filter((d) => d.resultado === 'ACEPTADA').length,
      0,
    );

    return {
      totalSesiones,
      sesionesConActa,
      sesionesSinActa: totalSesiones - sesionesConActa,
      porcentajeConActa:
        totalSesiones > 0 ? (sesionesConActa / totalSesiones) * 100 : 0,
      totalDecisiones,
      decisionesAceptadas,
      promedioDecisionesPorSesion:
        totalSesiones > 0 ? totalDecisiones / totalSesiones : 0,
      porcentajeAceptadas:
        totalDecisiones > 0 ? (decisionesAceptadas / totalDecisiones) * 100 : 0,
    };
  }
}
