/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTrazabilidadDto, UpdateTrazabilidadDto } from './dto';
import { EstadoSolicitud } from '@prisma/client';
import { SolicitudService } from '../solicitud/solicitud.service';
import { UsuariosService } from '../usuario/usuarios.service';

@Injectable()
export class TrazabilidadService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usuarioService: UsuariosService,
    @Inject(forwardRef(() => SolicitudService))
    private solicitudService: SolicitudService,
  ) {}

  async create(data: CreateTrazabilidadDto, usuarioActual: any) {
    // Verificar que la solicitud existe y que el usuario tiene permisos
    const solicitud = await this.solicitudService.findOne(
      data.solicitudId,
      usuarioActual,
    );

    if (!solicitud) {
      throw new NotFoundException(
        `Solicitud con ID ${data.solicitudId} no encontrada`,
      );
    }

    const usuario = await this.usuarioService.findOne(data.usuarioId);
    if (!usuario) {
      throw new NotFoundException(
        `Usuario con ID ${data.usuarioId} no encontrado`,
      );
    }

    return this.prisma.trazabilidad.create({
      data: {
        ...data,
        fecha: data.fecha ? new Date(data.fecha) : new Date(),
      },
    });
  }

  async crearTrazabilidadAutomatica(
    solicitudId: string,
    estadoAnterior: EstadoSolicitud | null,
    estadoNuevo: EstadoSolicitud,
    usuarioId: string,
    comentario?: string,
    usuarioActual?: any,
  ) {
    return this.create(
      {
        solicitudId,
        estadoAnterior,
        estadoNuevo,
        usuarioId,
        comentario,
        fecha: new Date().toISOString(),
      },
      usuarioActual, // <-- pasar usuarioActual
    );
  }

  async findAll(filtros?: {
    solicitudId?: string;
    usuarioId?: string;
    estadoAnterior?: EstadoSolicitud;
    estadoNuevo?: EstadoSolicitud;
    fechaDesde?: Date;
    fechaHasta?: Date;
  }) {
    const where: any = {};

    if (filtros?.solicitudId) {
      where.solicitudId = filtros.solicitudId;
    }

    if (filtros?.usuarioId) {
      where.usuarioId = filtros.usuarioId;
    }

    if (filtros?.estadoAnterior) {
      where.estadoAnterior = filtros.estadoAnterior;
    }

    if (filtros?.estadoNuevo) {
      where.estadoNuevo = filtros.estadoNuevo;
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

    return this.prisma.trazabilidad.findMany({
      where,
      include: {
        solicitud: {
          include: {
            nino: true,
          },
        },
        usuario: true,
      },
      orderBy: {
        fecha: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const trazabilidad = await this.prisma.trazabilidad.findUnique({
      where: { id },
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
        usuario: true,
      },
    });

    if (!trazabilidad) {
      throw new NotFoundException(`Trazabilidad con ID ${id} no encontrada`);
    }

    return trazabilidad;
  }

  async findBySolicitudId(solicitudId: string) {
    return this.prisma.trazabilidad.findMany({
      where: { solicitudId },
      include: {
        usuario: true,
      },
      orderBy: {
        fecha: 'desc',
      },
    });
  }

  async findByUsuarioId(usuarioId: string) {
    return this.prisma.trazabilidad.findMany({
      where: { usuarioId },
      include: {
        solicitud: {
          include: {
            nino: true,
          },
        },
      },
      orderBy: {
        fecha: 'desc',
      },
    });
  }

  async update(id: string, data: UpdateTrazabilidadDto) {
    const trazabilidad = await this.prisma.trazabilidad.findUnique({
      where: { id },
    });

    if (!trazabilidad) {
      throw new NotFoundException(`Trazabilidad con ID ${id} no encontrada`);
    }

    const updateData: any = { ...data };

    if (data.fecha) {
      updateData.fecha = new Date(data.fecha);
    }

    return this.prisma.trazabilidad.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    const trazabilidad = await this.prisma.trazabilidad.findUnique({
      where: { id },
    });

    if (!trazabilidad) {
      throw new NotFoundException(`Trazabilidad con ID ${id} no encontrada`);
    }

    return this.prisma.trazabilidad.delete({
      where: { id },
    });
  }

  async getEstadisticas(filtros?: {
    usuarioId?: string;
    fechaDesde?: Date;
    fechaHasta?: Date;
  }) {
    const where: any = {};

    if (filtros?.usuarioId) {
      where.usuarioId = filtros.usuarioId;
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

    const trazabilidades = await this.prisma.trazabilidad.findMany({
      where,
      include: {
        usuario: true,
      },
    });

    const total = trazabilidades.length;

    // Agrupar por usuario
    const porUsuario: Record<string, number> = {};
    trazabilidades.forEach((t) => {
      const nombreUsuario = t.usuario?.email || 'Desconocido';
      porUsuario[nombreUsuario] = (porUsuario[nombreUsuario] || 0) + 1;
    });

    // Agrupar por tipo de cambio de estado
    const cambiosEstado: Record<string, number> = {};
    trazabilidades.forEach((t) => {
      const cambio = `${t.estadoAnterior} → ${t.estadoNuevo}`;
      cambiosEstado[cambio] = (cambiosEstado[cambio] || 0) + 1;
    });

    return {
      total,
      porUsuario: Object.entries(porUsuario).map(([usuario, cantidad]) => ({
        usuario,
        cantidad,
        porcentaje: total > 0 ? (cantidad / total) * 100 : 0,
      })),
      cambiosEstado: Object.entries(cambiosEstado).map(
        ([cambio, cantidad]) => ({
          cambio,
          cantidad,
          porcentaje: total > 0 ? (cantidad / total) * 100 : 0,
        }),
      ),
    };
  }
}
