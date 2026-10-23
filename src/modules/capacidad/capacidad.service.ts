/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCapacidadDto, UpdateCapacidadDto } from './dto';
import { AnioVida } from '@prisma/client';

@Injectable()
export class CapacidadCirculoService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula la sobrecapacidad como el 120% de la capacidad total (redondeado hacia arriba)
   */
  private calcularSobrecapacidad(capacidadTotal: number): number {
    return Math.ceil(capacidadTotal * 1.2);
  }

  async create(data: CreateCapacidadDto) {
    const circulo = await this.prisma.circuloInfantil.findUnique({
      where: { id: data.circuloId },
    });
    if (!circulo)
      throw new NotFoundException(
        `Círculo con ID ${data.circuloId} no encontrado`,
      );
    if (!circulo.tieneSextoAnio && data.anioVida === AnioVida.ANIO_6) {
      throw new BadRequestException(
        'Este círculo no ofrece el sexto año de vida',
      );
    }

    const capacidadExistente = await this.prisma.capacidadCirculo.findUnique({
      where: {
        circuloId_anioVida: {
          circuloId: data.circuloId,
          anioVida: data.anioVida,
        },
      },
    });
    if (capacidadExistente) {
      throw new BadRequestException(
        'Ya existe una capacidad para este círculo y año de vida',
      );
    }

    const sobrecapacidad = this.calcularSobrecapacidad(data.capacidadTotal);

    return this.prisma.capacidadCirculo.create({
      data: {
        circuloId: data.circuloId,
        anioVida: data.anioVida,
        capacidadTotal: data.capacidadTotal,
        sobrecapacidad: sobrecapacidad,
        cuposDisponibles: data.cuposDisponibles,
        cuposOcupados: data.cuposOcupados,
      },
    });
  }

  async findAll(filtros?: {
    circuloId?: string;
    anioVida?: AnioVida;
    cuposDisponiblesMin?: number;
  }) {
    const where: any = {};
    if (filtros?.circuloId) where.circuloId = filtros.circuloId;
    if (filtros?.anioVida) where.anioVida = filtros.anioVida;
    if (filtros?.cuposDisponiblesMin !== undefined)
      where.cuposDisponibles = { gte: filtros.cuposDisponiblesMin };
    return this.prisma.capacidadCirculo.findMany({
      where,
      include: { circulo: true },
      orderBy: [{ circuloId: 'asc' }, { anioVida: 'asc' }],
    });
  }

  async findOne(id: string) {
    return this.prisma.capacidadCirculo.findUnique({
      where: { id },
      include: { circulo: true },
    });
  }

  async findByCirculoId(circuloId: string) {
    return this.prisma.capacidadCirculo.findMany({
      where: { circuloId },
      include: { circulo: true },
      orderBy: { anioVida: 'asc' },
    });
  }

  async update(id: string, data: UpdateCapacidadDto) {
    const capacidad = await this.prisma.capacidadCirculo.findUnique({
      where: { id },
    });
    if (!capacidad)
      throw new NotFoundException(`Capacidad con ID ${id} no encontrada`);

    // Si se cambia el año, validar que no exista conflicto con otro registro
    if (data.anioVida && data.anioVida !== capacidad.anioVida) {
      const existente = await this.prisma.capacidadCirculo.findUnique({
        where: {
          circuloId_anioVida: {
            circuloId: capacidad.circuloId,
            anioVida: data.anioVida,
          },
        },
      });
      if (existente && existente.id !== id) {
        throw new BadRequestException(
          'Ya existe una capacidad para este círculo y año de vida',
        );
      }
    }

    // Si se cambia capacidadTotal, recalcular sobrecapacidad
    const updateData: any = { ...data };
    if (data.capacidadTotal !== undefined) {
      updateData.sobrecapacidad = this.calcularSobrecapacidad(
        data.capacidadTotal,
      );
    }

    return this.prisma.capacidadCirculo.update({
      where: { id },
      data: updateData,
    });
  }

  async updateCupos(id: string, cuposOcupados: number) {
    const capacidad = await this.prisma.capacidadCirculo.findUnique({
      where: { id },
    });
    if (!capacidad)
      throw new NotFoundException(`Capacidad con ID ${id} no encontrada`);

    const cuposDisponibles = capacidad.cuposDisponibles - cuposOcupados;
    if (cuposDisponibles < 0)
      throw new BadRequestException('No hay suficientes cupos disponibles');

    // Validar que no se exceda la sobrecapacidad
    const totalOcupados = capacidad.cuposOcupados + cuposOcupados;
    if (totalOcupados > capacidad.sobrecapacidad) {
      throw new BadRequestException(
        `Se excedería la sobrecapacidad del círculo (${capacidad.sobrecapacidad})`,
      );
    }

    return this.prisma.capacidadCirculo.update({
      where: { id },
      data: {
        cuposOcupados: totalOcupados,
        cuposDisponibles,
      },
    });
  }

  async remove(id: string) {
    const capacidad = await this.prisma.capacidadCirculo.findUnique({
      where: { id },
    });
    if (!capacidad)
      throw new NotFoundException(`Capacidad con ID ${id} no encontrada`);
    return this.prisma.capacidadCirculo.delete({ where: { id } });
  }

  async getEstadisticas() {
    const total = await this.prisma.capacidadCirculo.count();
    const conCupos = await this.prisma.capacidadCirculo.count({
      where: { cuposDisponibles: { gt: 0 } },
    });
    const sinCupos = await this.prisma.capacidadCirculo.count({
      where: { cuposDisponibles: 0 },
    });
    const cuposTotales = await this.prisma.capacidadCirculo.aggregate({
      _sum: {
        cuposDisponibles: true,
        cuposOcupados: true,
        capacidadTotal: true,
        sobrecapacidad: true,
      },
    });

    const capacidadTotal = cuposTotales._sum.capacidadTotal || 0;
    const cuposOcupados = cuposTotales._sum.cuposOcupados || 0;

    return {
      total,
      conCupos,
      sinCupos,
      capacidadTotalGlobal: capacidadTotal,
      sobrecapacidadGlobal: cuposTotales._sum.sobrecapacidad || 0,
      cuposDisponiblesTotales: cuposTotales._sum.cuposDisponibles || 0,
      cuposOcupadosTotales: cuposOcupados,
      ocupacionPorcentaje:
        capacidadTotal > 0 ? (cuposOcupados / capacidadTotal) * 100 : 0,
    };
  }
}
