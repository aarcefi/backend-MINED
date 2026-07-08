/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCirculoInfantilDto, UpdateCirculoInfantilDto } from './dto';
import { RolUsuario, TipoCirculo } from '@prisma/client';

@Injectable()
export class CirculoInfantilService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCirculoInfantilDto) {
    return this.prisma.circuloInfantil.create({
      data: { ...data, tieneSextoAnio: data.tieneSextoAnio ?? false },
    });
  }

  async findAll(filtros?: {
    municipio?: string;
    provincia?: string;
    tipo?: TipoCirculo;
    activo?: boolean;
  }) {
    const where: any = {};
    if (filtros?.municipio) {
      where.municipio = { contains: filtros.municipio, mode: 'insensitive' };
    }
    if (filtros?.provincia) {
      where.provincia = { contains: filtros.provincia, mode: 'insensitive' };
    }
    if (filtros?.tipo) where.tipo = filtros.tipo;
    if (filtros?.activo !== undefined) where.activo = filtros.activo;

    return this.prisma.circuloInfantil.findMany({
      where,
      include: {
        capacidades: true, // ya no incluye periodo
        matriculas: { where: { estado: 'ACTIVA' } },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findActivos() {
    return this.prisma.circuloInfantil.findMany({
      where: { activo: true },
      include: {
        capacidades: {
          where: { cuposDisponibles: { gt: 0 } },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.circuloInfantil.findUnique({
      where: { id },
      include: {
        capacidades: {
          orderBy: { anioVida: 'asc' },
        },
        matriculas: {
          include: { solicitud: { include: { nino: true } } },
          orderBy: { fechaOtorgamiento: 'desc' },
        },
      },
    });
  }

  async findByMunicipio(municipio: string) {
    return this.prisma.circuloInfantil.findMany({
      where: {
        municipio: { contains: municipio, mode: 'insensitive' },
        activo: true,
      },
      include: {
        capacidades: {
          where: { cuposDisponibles: { gt: 0 } },
        },
      },
    });
  }

  async findCapacidades(id: string) {
    return this.prisma.capacidadCirculo.findMany({
      where: { circuloId: id },
      include: { circulo: true },
      orderBy: { anioVida: 'asc' },
    });
  }

  async findMatriculas(id: string, estado?: string) {
    const where: any = { circuloId: id };
    if (estado) where.estado = estado;
    return this.prisma.matricula.findMany({
      where,
      include: {
        solicitud: {
          include: {
            nino: { include: { solicitante: true } },
          },
        },
        controles: { orderBy: { fecha: 'desc' }, take: 1 },
      },
      orderBy: { fechaOtorgamiento: 'desc' },
    });
  }

  async getEstadisticas(id: string) {
    const circulo = await this.prisma.circuloInfantil.findUnique({
      where: { id },
      include: {
        capacidades: true,
        matriculas: { include: { solicitud: true } },
      },
    });
    if (!circulo)
      throw new NotFoundException(`Círculo con ID ${id} no encontrado`);

    const capacidadPorAnio = circulo.capacidades.reduce(
      (acc, cap) => {
        acc[cap.anioVida] =
          (acc[cap.anioVida] || 0) + cap.cuposDisponibles + cap.cuposOcupados;
        return acc;
      },
      {} as Record<string, number>,
    );
    const capacidadTotal = Object.values(capacidadPorAnio).reduce(
      (a, b) => a + b,
      0,
    );

    const matriculasActivas = circulo.matriculas.filter(
      (m) => m.estado === 'ACTIVA',
    ).length;
    const matriculasVencidas = circulo.matriculas.filter(
      (m) => m.estado === 'VENCIDA',
    ).length;
    const matriculasCanceladas = circulo.matriculas.filter(
      (m) => m.estado === 'CANCELADA',
    ).length;
    const capacidadActual = circulo.capacidades.reduce(
      (acc, cap) => acc + cap.cuposOcupados,
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

  async getNiniosPorAnioVida(circuloId: string, usuario: any) {
    // 1. Verificar que el círculo existe
    const circulo = await this.prisma.circuloInfantil.findUnique({
      where: { id: circuloId },
    });
    if (!circulo) {
      throw new NotFoundException(`Círculo con ID ${circuloId} no encontrado`);
    }

    // 2. Verificar permisos
    if (usuario.rol === RolUsuario.DIRECTOR_CIRCULO) {
      // Obtener el perfil del director para verificar su círculo asignado
      const perfilDirector = await this.prisma.perfilDirector.findUnique({
        where: { usuarioId: usuario.id },
      });
      if (!perfilDirector || perfilDirector.circuloId !== circuloId) {
        throw new ForbiddenException(
          'No tienes permiso para ver los niños de este círculo',
        );
      }
    }
    // Si es ADMINISTRADOR, no hay restricción adicional

    // 3. Obtener matrículas y contar por año
    const matriculas = await this.prisma.matricula.findMany({
      where: { circuloId },
      include: {
        solicitud: {
          select: {
            anioSolicitado: true,
            nino: {
              select: {
                id: true,
                nombre: true,
                apellidos: true,
                fechaNacimiento: true,
              },
            },
          },
        },
      },
    });

    const contadorPorAnio: Record<string, number> = {
      ANIO_1: 0,
      ANIO_2: 0,
      ANIO_3: 0,
      ANIO_4: 0,
      ANIO_5: 0,
      ANIO_6: 0,
    };
    const ninosPorAnio: Record<string, any[]> = {};

    for (const mat of matriculas) {
      const anio = mat.solicitud?.anioSolicitado;
      if (anio && contadorPorAnio[anio] !== undefined) {
        contadorPorAnio[anio]++;
        if (!ninosPorAnio[anio]) ninosPorAnio[anio] = [];
        ninosPorAnio[anio].push({
          id: mat.solicitud.nino.id,
          nombre: mat.solicitud.nino.nombre,
          apellidos: mat.solicitud.nino.apellidos,
          fechaNacimiento: mat.solicitud.nino.fechaNacimiento,
        });
      }
    }

    return {
      circuloId,
      circuloNombre: circulo.nombre,
      total: matriculas.length,
      porAnio: contadorPorAnio,
      detalle: ninosPorAnio,
    };
  }

  async update(id: string, data: UpdateCirculoInfantilDto) {
    const circulo = await this.prisma.circuloInfantil.findUnique({
      where: { id },
    });
    if (!circulo)
      throw new NotFoundException(`Círculo con ID ${id} no encontrado`);
    return this.prisma.circuloInfantil.update({
      where: { id },
      data: { ...data, tieneSextoAnio: data.tieneSextoAnio },
    });
  }

  async toggleActivo(id: string, activo: boolean) {
    const circulo = await this.prisma.circuloInfantil.findUnique({
      where: { id },
    });
    if (!circulo)
      throw new NotFoundException(`Círculo con ID ${id} no encontrado`);
    return this.prisma.circuloInfantil.update({
      where: { id },
      data: { activo },
    });
  }

  async remove(id: string) {
    const circulo = await this.prisma.circuloInfantil.findUnique({
      where: { id },
    });
    if (!circulo)
      throw new NotFoundException(`Círculo con ID ${id} no encontrado`);

    const matriculasActivas = await this.prisma.matricula.count({
      where: { circuloId: id, estado: 'ACTIVA' },
    });
    if (matriculasActivas > 0) {
      throw new Error('No se puede eliminar un círculo con matrículas activas');
    }
    return this.prisma.circuloInfantil.delete({ where: { id } });
  }
}
