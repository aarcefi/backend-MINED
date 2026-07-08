/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCapacidadDto, UpdateCapacidadDto } from './dto';
import { AnioVida } from '../../common/utils/date-utils.service';

@Injectable()
export class CapacidadCirculoService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.capacidadCirculo.create({
      data: {
        circuloId: data.circuloId,
        anioVida: data.anioVida,
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
    return this.prisma.capacidadCirculo.update({ where: { id }, data });
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
    return this.prisma.capacidadCirculo.update({
      where: { id },
      data: {
        cuposOcupados: capacidad.cuposOcupados + cuposOcupados,
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
      _sum: { cuposDisponibles: true, cuposOcupados: true },
    });
    return {
      total,
      conCupos,
      sinCupos,
      cuposDisponiblesTotales: cuposTotales._sum.cuposDisponibles || 0,
      cuposOcupadosTotales: cuposTotales._sum.cuposOcupados || 0,
      ocupacionPorcentaje:
        cuposTotales._sum.cuposDisponibles && cuposTotales._sum.cuposOcupados
          ? (cuposTotales._sum.cuposOcupados /
              (cuposTotales._sum.cuposDisponibles +
                cuposTotales._sum.cuposOcupados)) *
            100
          : 0,
    };
  }
}
