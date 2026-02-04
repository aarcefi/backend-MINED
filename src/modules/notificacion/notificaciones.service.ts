/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateNotificacionDto } from './dto/create-notificacion.dto';

@Injectable()
export class NotificacionesService {
  constructor(private prisma: PrismaService) {}

  async create(createNotificacionDto: CreateNotificacionDto) {
    return this.prisma.notificacion.create({
      data: createNotificacionDto,
      include: {
        usuario: true,
      },
    });
  }

  async createForUsuario(
    usuarioId: string,
    titulo: string,
    mensaje: string,
    tipo: string,
  ) {
    return this.prisma.notificacion.create({
      data: {
        usuarioId,
        titulo,
        mensaje,
        tipo,
        leida: false,
      },
      include: {
        usuario: true,
      },
    });
  }

  async findAll(filtros?: {
    usuarioId?: string;
    tipo?: string;
    leida?: boolean;
    fechaInicio?: Date;
    fechaFin?: Date;
  }) {
    const where: any = {};

    if (filtros?.usuarioId) {
      where.usuarioId = filtros.usuarioId;
    }

    if (filtros?.tipo) {
      where.tipo = filtros.tipo;
    }

    if (filtros?.leida !== undefined) {
      where.leida = filtros.leida;
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

    return this.prisma.notificacion.findMany({
      where,
      include: {
        usuario: true,
      },
      orderBy: {
        fecha: 'desc',
      },
    });
  }

  async findAllByUsuario(usuarioId: string) {
    return this.prisma.notificacion.findMany({
      where: { usuarioId },
      orderBy: { fecha: 'desc' },
      include: {
        usuario: true,
      },
    });
  }

  async findUnreadByUsuario(usuarioId: string) {
    return this.prisma.notificacion.findMany({
      where: {
        usuarioId,
        leida: false,
      },
      orderBy: { fecha: 'desc' },
    });
  }

  async findOne(id: string) {
    const notificacion = await this.prisma.notificacion.findUnique({
      where: { id },
      include: {
        usuario: true,
      },
    });

    if (!notificacion) {
      throw new NotFoundException(`Notificación con ID ${id} no encontrada`);
    }

    return notificacion;
  }

  async markAsRead(id: string) {
    try {
      return await this.prisma.notificacion.update({
        where: { id },
        data: { leida: true },
      });
    } catch (error) {
      throw new NotFoundException(`Notificación con ID ${id} no encontrada`);
    }
  }

  async markAllAsRead(usuarioId: string) {
    return this.prisma.notificacion.updateMany({
      where: {
        usuarioId,
        leida: false,
      },
      data: { leida: true },
    });
  }

  async remove(id: string) {
    try {
      await this.prisma.notificacion.delete({
        where: { id },
      });

      return { message: `Notificación con ID ${id} eliminada exitosamente` };
    } catch (error) {
      throw new NotFoundException(`Notificación con ID ${id} no encontrada`);
    }
  }

  async removeAllByUsuario(usuarioId: string) {
    return this.prisma.notificacion.deleteMany({
      where: { usuarioId },
    });
  }

  async getNotificationStats(usuarioId: string) {
    const total = await this.prisma.notificacion.count({
      where: { usuarioId },
    });

    const unread = await this.prisma.notificacion.count({
      where: {
        usuarioId,
        leida: false,
      },
    });

    return {
      total,
      unread,
      read: total - unread,
    };
  }

  async getEstadisticasGenerales() {
    const total = await this.prisma.notificacion.count();
    const leidas = await this.prisma.notificacion.count({
      where: { leida: true },
    });
    const noLeidas = await this.prisma.notificacion.count({
      where: { leida: false },
    });

    const porTipo = await this.prisma.notificacion.groupBy({
      by: ['tipo'],
      _count: {
        _all: true,
      },
    });

    const ultimaSemana = new Date();
    ultimaSemana.setDate(ultimaSemana.getDate() - 7);

    const ultimaSemanaCount = await this.prisma.notificacion.count({
      where: {
        fecha: {
          gte: ultimaSemana,
        },
      },
    });

    return {
      total,
      leidas,
      noLeidas,
      porcentajeLeidas: total > 0 ? (leidas / total) * 100 : 0,
      porTipo: porTipo.map((item) => ({
        tipo: item.tipo,
        cantidad: item._count._all,
      })),
      ultimaSemana: ultimaSemanaCount,
    };
  }

  async createNotificacionSolicitudCambioEstado(
    usuarioId: string,
    solicitudId: string,
    estadoAnterior: string,
    estadoNuevo: string,
  ) {
    return this.createForUsuario(
      usuarioId,
      'Cambio de estado en solicitud',
      `Tu solicitud #${solicitudId} ha cambiado de estado: ${estadoAnterior} → ${estadoNuevo}`,
      'estado_solicitud',
    );
  }

  async createNotificacionDocumentoValidado(
    usuarioId: string,
    documentoId: string,
    validado: boolean,
  ) {
    const estado = validado ? 'validado' : 'rechazado';
    return this.createForUsuario(
      usuarioId,
      'Documento procesado',
      `Tu documento #${documentoId} ha sido ${estado}`,
      'documento',
    );
  }

  async createNotificacionRecordatorioControl(
    usuarioId: string,
    matriculaId: string,
    fechaLimite: Date,
  ) {
    return this.createForUsuario(
      usuarioId,
      'Recordatorio de control trimestral',
      `Tu control trimestral para la matrícula #${matriculaId} vence el ${fechaLimite.toLocaleDateString()}`,
      'recordatorio',
    );
  }
}
