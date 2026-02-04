/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateDecisionDto, UpdateDecisionDto } from './dto';
import { ResultadoDecision } from '@prisma/client';

@Injectable()
export class DecisionSolicitudService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateDecisionDto) {
    // Verificar que la solicitud existe
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id: data.solicitudId },
    });

    if (!solicitud) {
      throw new NotFoundException(
        `Solicitud con ID ${data.solicitudId} no encontrada`,
      );
    }

    // Verificar que la sesión existe
    const sesion = await this.prisma.sesionComision.findUnique({
      where: { id: data.sesionId },
    });

    if (!sesion) {
      throw new NotFoundException(
        `Sesión con ID ${data.sesionId} no encontrada`,
      );
    }

    // Verificar que la comisión existe
    const comision = await this.prisma.perfilComision.findUnique({
      where: { id: data.comisionId },
    });

    if (!comision) {
      throw new NotFoundException(
        `Comisión con ID ${data.comisionId} no encontrada`,
      );
    }

    // Verificar que no existe ya una decisión para esta solicitud en esta sesión
    const decisionExistente = await this.prisma.decisionSolicitud.findFirst({
      where: {
        solicitudId: data.solicitudId,
        sesionId: data.sesionId,
      },
    });

    if (decisionExistente) {
      throw new Error('Esta solicitud ya tiene una decisión en esta sesión');
    }

    return this.prisma.decisionSolicitud.create({ data });
  }

  async findAll(filtros?: {
    solicitudId?: string;
    sesionId?: string;
    comisionId?: string;
    resultado?: ResultadoDecision;
    periodoId?: string;
  }) {
    const where: any = {};

    if (filtros?.solicitudId) {
      where.solicitudId = filtros.solicitudId;
    }

    if (filtros?.sesionId) {
      where.sesionId = filtros.sesionId;
    }

    if (filtros?.comisionId) {
      where.comisionId = filtros.comisionId;
    }

    if (filtros?.resultado) {
      where.resultado = filtros.resultado;
    }

    if (filtros?.periodoId) {
      where.solicitud = {
        periodoId: filtros.periodoId,
      };
    }

    return this.prisma.decisionSolicitud.findMany({
      where,
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
        sesion: true,
        comision: true,
      },
      orderBy: {
        sesion: {
          fecha: 'desc',
        },
      },
    });
  }

  async findBySesionId(sesionId: string) {
    return this.prisma.decisionSolicitud.findMany({
      where: { sesionId },
      include: {
        solicitud: {
          include: {
            nino: {
              include: {
                solicitante: true,
              },
            },
          },
        },
        comision: true,
      },
      orderBy: {
        solicitud: {
          prioridad: 'desc',
        },
      },
    });
  }

  async findByComisionId(comisionId: string) {
    return this.prisma.decisionSolicitud.findMany({
      where: { comisionId },
      include: {
        solicitud: {
          include: {
            nino: true,
            periodo: true,
          },
        },
        sesion: true,
      },
      orderBy: {
        sesion: {
          fecha: 'desc',
        },
      },
    });
  }

  async findBySolicitudId(solicitudId: string) {
    const decision = await this.prisma.decisionSolicitud.findFirst({
      where: { solicitudId },
      include: {
        sesion: true,
        comision: true,
      },
    });

    if (!decision) {
      throw new NotFoundException(
        `No se encontró decisión para la solicitud con ID ${solicitudId}`,
      );
    }

    return decision;
  }

  async findOne(id: string) {
    const decision = await this.prisma.decisionSolicitud.findUnique({
      where: { id },
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
        sesion: true,
        comision: true,
      },
    });

    if (!decision) {
      throw new NotFoundException(`Decisión con ID ${id} no encontrada`);
    }

    return decision;
  }

  async getEstadisticasResultados(filtros?: {
    periodoId?: string;
    sesionId?: string;
  }) {
    const where: any = {};

    if (filtros?.periodoId) {
      where.solicitud = {
        periodoId: filtros.periodoId,
      };
    }

    if (filtros?.sesionId) {
      where.sesionId = filtros.sesionId;
    }

    const decisiones = await this.prisma.decisionSolicitud.findMany({
      where,
      select: {
        resultado: true,
      },
    });

    const estadisticas = {
      ACEPTADA: 0,
      DENEGADA: 0,
    };

    decisiones.forEach((decision) => {
      if (estadisticas[decision.resultado] !== undefined) {
        estadisticas[decision.resultado]++;
      }
    });

    const total = decisiones.length;

    return {
      total,
      estadisticas,
      porcentajes: {
        ACEPTADA: total > 0 ? (estadisticas.ACEPTADA / total) * 100 : 0,
        DENEGADA: total > 0 ? (estadisticas.DENEGADA / total) * 100 : 0,
      },
    };
  }

  async update(id: string, data: UpdateDecisionDto) {
    // Verificar que existe
    const decision = await this.prisma.decisionSolicitud.findUnique({
      where: { id },
    });

    if (!decision) {
      throw new NotFoundException(`Decisión con ID ${id} no encontrada`);
    }

    return this.prisma.decisionSolicitud.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    // Verificar que existe
    const decision = await this.prisma.decisionSolicitud.findUnique({
      where: { id },
    });

    if (!decision) {
      throw new NotFoundException(`Decisión con ID ${id} no encontrada`);
    }

    return this.prisma.decisionSolicitud.delete({
      where: { id },
    });
  }

  async getDecisionsByPuntuacionRange(min: number, max: number) {
    return this.prisma.decisionSolicitud.findMany({
      where: {
        puntuacion: {
          gte: min,
          lte: max,
        },
      },
      include: {
        solicitud: {
          include: {
            nino: true,
          },
        },
      },
      orderBy: {
        puntuacion: 'desc',
      },
    });
  }

  async getDecisionsByPeriodoAndResultado(
    periodoId: string,
    resultado: ResultadoDecision,
  ) {
    return this.prisma.decisionSolicitud.findMany({
      where: {
        resultado,
        solicitud: {
          periodoId,
        },
      },
      include: {
        solicitud: {
          include: {
            nino: {
              include: {
                solicitante: true,
              },
            },
          },
        },
        sesion: true,
        comision: true,
      },
    });
  }
}
