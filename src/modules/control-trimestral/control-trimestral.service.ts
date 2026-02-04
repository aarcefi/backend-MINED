/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateControlTrimestralDto, UpdateControlTrimestralDto } from './dto';
import { VinculoLaboral } from '@prisma/client';

@Injectable()
export class ControlTrimestralService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateControlTrimestralDto) {
    // Verificar que la matrícula existe
    const matricula = await this.prisma.matricula.findUnique({
      where: { id: data.matriculaId },
    });

    if (!matricula) {
      throw new NotFoundException(
        `Matrícula con ID ${data.matriculaId} no encontrada`,
      );
    }

    // Verificar que el funcionario existe
    const funcionario = await this.prisma.perfilFuncionario.findUnique({
      where: { id: data.funcionarioId },
    });

    if (!funcionario) {
      throw new NotFoundException(
        `Funcionario con ID ${data.funcionarioId} no encontrado`,
      );
    }

    return this.prisma.controlTrimestral.create({
      data: {
        ...data,
        fecha: new Date(data.fecha),
      },
    });
  }

  async findAll(filtros?: {
    matriculaId?: string;
    funcionarioId?: string;
    vinculo?: VinculoLaboral;
    fechaInicio?: Date;
    fechaFin?: Date;
  }) {
    const where: any = {};

    if (filtros?.matriculaId) {
      where.matriculaId = filtros.matriculaId;
    }

    if (filtros?.funcionarioId) {
      where.funcionarioId = filtros.funcionarioId;
    }

    if (filtros?.vinculo) {
      where.vinculo = filtros.vinculo;
    }

    if (filtros?.fechaInicio || filtros?.fechaFin) {
      where.fecha = {};

      if (filtros.fechaInicio) {
        where.fecha.gte = filtros.fechaInicio;
      }

      if (filtros.fechaFin) {
        where.fecha.lte = filtros.fechaFin;
      }
    }

    return this.prisma.controlTrimestral.findMany({
      where,
      include: {
        matricula: {
          include: {
            solicitud: {
              include: {
                nino: true,
                solicitante: true,
              },
            },
          },
        },
        funcionario: true,
      },
      orderBy: {
        fecha: 'desc',
      },
    });
  }

  async findByMatriculaId(matriculaId: string) {
    return this.prisma.controlTrimestral.findMany({
      where: { matriculaId },
      include: {
        funcionario: true,
      },
      orderBy: {
        fecha: 'desc',
      },
    });
  }

  async findBySolicitanteId(solicitanteId: string) {
    // Obtener matrículas del solicitante
    const matriculas = await this.prisma.matricula.findMany({
      where: {
        solicitud: {
          solicitanteId,
        },
      },
      select: {
        id: true,
      },
    });

    const matriculaIds = matriculas.map((m) => m.id);

    return this.prisma.controlTrimestral.findMany({
      where: {
        matriculaId: {
          in: matriculaIds,
        },
      },
      include: {
        matricula: {
          include: {
            solicitud: {
              include: {
                nino: true,
              },
            },
          },
        },
        funcionario: true,
      },
      orderBy: {
        fecha: 'desc',
      },
    });
  }

  async findControlesPendientes(municipio?: string) {
    // Obtener matrículas activas
    const whereMatricula: any = {
      estado: 'ACTIVA',
    };

    if (municipio) {
      whereMatricula.circulo = {
        municipio: {
          contains: municipio,
          mode: 'insensitive',
        },
      };
    }

    const matriculas = await this.prisma.matricula.findMany({
      where: whereMatricula,
      include: {
        solicitud: {
          include: {
            nino: true,
            solicitante: true,
          },
        },
        controles: {
          orderBy: {
            fecha: 'desc',
          },
          take: 1,
        },
      },
    });

    // Filtrar matrículas que necesitan control (más de 3 meses desde el último control)
    const ahora = new Date();
    const tresMesesAtras = new Date(
      ahora.getFullYear(),
      ahora.getMonth() - 3,
      ahora.getDate(),
    );

    const matriculasPendientes = matriculas.filter((matricula) => {
      if (matricula.controles.length === 0) {
        // Si nunca ha tenido control, necesita uno
        return true;
      }

      const ultimoControl = new Date(matricula.controles[0].fecha);
      return ultimoControl < tresMesesAtras;
    });

    return matriculasPendientes;
  }

  findOne(id: string) {
    return this.prisma.controlTrimestral.findUnique({
      where: { id },
      include: {
        matricula: {
          include: {
            solicitud: {
              include: {
                nino: true,
                solicitante: true,
              },
            },
          },
        },
        funcionario: true,
      },
    });
  }

  async update(id: string, data: UpdateControlTrimestralDto) {
    // Verificar que existe
    const control = await this.prisma.controlTrimestral.findUnique({
      where: { id },
    });

    if (!control) {
      throw new NotFoundException(`Control con ID ${id} no encontrado`);
    }

    const updateData: any = { ...data };

    if (data.fecha) {
      updateData.fecha = new Date(data.fecha);
    }

    return this.prisma.controlTrimestral.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    // Verificar que existe
    const control = await this.prisma.controlTrimestral.findUnique({
      where: { id },
    });

    if (!control) {
      throw new NotFoundException(`Control con ID ${id} no encontrado`);
    }

    return this.prisma.controlTrimestral.delete({
      where: { id },
    });
  }

  async getEstadisticasVinculos() {
    const controles = await this.prisma.controlTrimestral.findMany({
      select: {
        vinculo: true,
      },
    });

    const estadisticas = {
      ACTIVO: 0,
      ESTUDIANTE: 0,
      PERDIDO: 0,
    };

    controles.forEach((control) => {
      if (estadisticas[control.vinculo] !== undefined) {
        estadisticas[control.vinculo]++;
      }
    });

    const total = controles.length;

    return {
      total,
      estadisticas,
      porcentajes: {
        ACTIVO: total > 0 ? (estadisticas.ACTIVO / total) * 100 : 0,
        ESTUDIANTE: total > 0 ? (estadisticas.ESTUDIANTE / total) * 100 : 0,
        PERDIDO: total > 0 ? (estadisticas.PERDIDO / total) * 100 : 0,
      },
    };
  }
}
