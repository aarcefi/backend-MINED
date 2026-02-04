/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCirculoInfantilDto, UpdateCirculoInfantilDto } from './dto';
import { TipoCirculo } from '@prisma/client';

@Injectable()
export class CirculoInfantilService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCirculoInfantilDto) {
    return this.prisma.circuloInfantil.create({ data });
  }

  async findAll(filtros?: {
    municipio?: string;
    provincia?: string;
    tipo?: TipoCirculo;
    activo?: boolean;
  }) {
    const where: any = {};

    if (filtros?.municipio) {
      where.municipio = {
        contains: filtros.municipio,
        mode: 'insensitive',
      };
    }

    if (filtros?.provincia) {
      where.provincia = {
        contains: filtros.provincia,
        mode: 'insensitive',
      };
    }

    if (filtros?.tipo) {
      where.tipo = filtros.tipo;
    }

    if (filtros?.activo !== undefined) {
      where.activo = filtros.activo;
    }

    return this.prisma.circuloInfantil.findMany({
      where,
      include: {
        capacidades: {
          include: {
            periodo: true,
          },
        },
        matriculas: {
          where: {
            estado: 'ACTIVA',
          },
        },
      },
      orderBy: {
        nombre: 'asc',
      },
    });
  }

  async findActivos() {
    return this.prisma.circuloInfantil.findMany({
      where: { activo: true },
      include: {
        capacidades: {
          where: {
            cuposDisponibles: {
              gt: 0,
            },
          },
          include: {
            periodo: true,
          },
        },
      },
      orderBy: {
        nombre: 'asc',
      },
    });
  }

  findOne(id: string) {
    return this.prisma.circuloInfantil.findUnique({
      where: { id },
      include: {
        capacidades: {
          include: {
            periodo: true,
          },
          orderBy: {
            periodo: {
              fechaInicio: 'desc',
            },
          },
        },
        matriculas: {
          include: {
            solicitud: {
              include: {
                nino: true,
              },
            },
          },
          orderBy: {
            fechaOtorgamiento: 'desc',
          },
        },
      },
    });
  }

  async findByMunicipio(municipio: string) {
    return this.prisma.circuloInfantil.findMany({
      where: {
        municipio: {
          contains: municipio,
          mode: 'insensitive',
        },
        activo: true,
      },
      include: {
        capacidades: {
          where: {
            cuposDisponibles: {
              gt: 0,
            },
          },
          include: {
            periodo: true,
          },
        },
      },
    });
  }

  async findCapacidades(id: string, periodoId?: string) {
    const where: any = {
      circuloId: id,
    };

    if (periodoId) {
      where.periodoId = periodoId;
    }

    return this.prisma.capacidadCirculo.findMany({
      where,
      include: {
        periodo: true,
      },
      orderBy: {
        periodo: {
          fechaInicio: 'desc',
        },
      },
    });
  }

  async findMatriculas(id: string, estado?: string) {
    const where: any = {
      circuloId: id,
    };

    if (estado) {
      where.estado = estado;
    }

    return this.prisma.matricula.findMany({
      where,
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
        controles: {
          orderBy: {
            fecha: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        fechaOtorgamiento: 'desc',
      },
    });
  }

  async getEstadisticas(id: string) {
    const circulo = await this.prisma.circuloInfantil.findUnique({
      where: { id },
      include: {
        capacidades: {
          include: {
            periodo: true,
          },
        },
        matriculas: {
          include: {
            solicitud: true,
          },
        },
      },
    });

    if (!circulo) {
      throw new NotFoundException(`Círculo con ID ${id} no encontrado`);
    }

    const matriculasActivas = circulo.matriculas.filter(
      (m) => m.estado === 'ACTIVA',
    ).length;
    const matriculasVencidas = circulo.matriculas.filter(
      (m) => m.estado === 'VENCIDA',
    ).length;
    const matriculasCanceladas = circulo.matriculas.filter(
      (m) => m.estado === 'CANCELADA',
    ).length;

    // Calcular ocupación actual
    const capacidadActual = circulo.capacidades.reduce(
      (acc, cap) => acc + cap.cuposOcupados,
      0,
    );
    const capacidadTotal = circulo.capacidades.reduce(
      (acc, cap) => acc + cap.cuposDisponibles + cap.cuposOcupados,
      0,
    );

    return {
      circulo: {
        id: circulo.id,
        nombre: circulo.nombre,
        capacidadTotal: circulo.capacidadTotal,
      },
      estadisticas: {
        matriculasTotales: circulo.matriculas.length,
        matriculasActivas,
        matriculasVencidas,
        matriculasCanceladas,
        capacidadActual,
        capacidadTotal,
        ocupacionPorcentaje:
          capacidadTotal > 0 ? (capacidadActual / capacidadTotal) * 100 : 0,
      },
    };
  }

  async update(id: string, data: UpdateCirculoInfantilDto) {
    // Verificar que existe
    const circulo = await this.prisma.circuloInfantil.findUnique({
      where: { id },
    });

    if (!circulo) {
      throw new NotFoundException(`Círculo con ID ${id} no encontrado`);
    }

    return this.prisma.circuloInfantil.update({
      where: { id },
      data,
    });
  }

  async toggleActivo(id: string, activo: boolean) {
    const circulo = await this.prisma.circuloInfantil.findUnique({
      where: { id },
    });

    if (!circulo) {
      throw new NotFoundException(`Círculo con ID ${id} no encontrado`);
    }

    return this.prisma.circuloInfantil.update({
      where: { id },
      data: { activo },
    });
  }

  async remove(id: string) {
    // Verificar que existe
    const circulo = await this.prisma.circuloInfantil.findUnique({
      where: { id },
    });

    if (!circulo) {
      throw new NotFoundException(`Círculo con ID ${id} no encontrado`);
    }

    // Verificar que no tenga matrículas activas
    const matriculasActivas = await this.prisma.matricula.count({
      where: {
        circuloId: id,
        estado: 'ACTIVA',
      },
    });

    if (matriculasActivas > 0) {
      throw new Error('No se puede eliminar un círculo con matrículas activas');
    }

    return this.prisma.circuloInfantil.delete({
      where: { id },
    });
  }
}
