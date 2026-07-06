import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EstadoMatricula, EstadoSolicitud, RolUsuario } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTrasladoDto, UpdateEstadoTrasladoDto } from './dto';

@Injectable()
export class TrasladoService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    nino: true,
    circuloOrigen: true,
    circuloDestino: true,
    respondidoPor: { select: { id: true, nombre: true, apellidos: true } },
  } as const;

  async create(dto: CreateTrasladoDto, user: any) {
    const matricula = await this.prisma.matricula.findUnique({ where: { id: dto.matriculaId }, include: { solicitud: true } });
    if (!matricula) throw new NotFoundException('Matrícula no encontrada');
    if (matricula.estado !== EstadoMatricula.ACTIVA) throw new ConflictException('La matrícula no está activa');
    if (matricula.solicitud.solicitanteId !== user.perfilId) throw new ForbiddenException('La matrícula no pertenece al solicitante');
    if (matricula.circuloId === dto.circuloDestinoId) throw new ConflictException('Seleccione un círculo diferente al actual');
    const destino = await this.prisma.circuloInfantil.findFirst({ where: { id: dto.circuloDestinoId, activo: true } });
    if (!destino) throw new NotFoundException('El círculo de destino no existe o está inactivo');
    const abierto = await this.prisma.trasladoSolicitud.findFirst({ where: { matriculaId: matricula.id, estado: { in: [EstadoSolicitud.EN_REVISION, EstadoSolicitud.EN_ESPERA] } } });
    if (abierto) throw new ConflictException('Ya existe un traslado pendiente');
    return this.prisma.trasladoSolicitud.create({ data: { solicitanteId: matricula.solicitud.solicitanteId, ninoId: matricula.solicitud.ninoId, matriculaId: matricula.id, circuloOrigenId: matricula.circuloId, circuloDestinoId: dto.circuloDestinoId, motivo: dto.motivo.trim() }, include: this.include });
  }

  findAll() {
    return this.prisma.trasladoSolicitud.findMany({ include: this.include, orderBy: { fechaSolicitud: 'desc' } });
  }

  findMis(solicitanteId: string) {
    return this.prisma.trasladoSolicitud.findMany({ where: { solicitanteId }, include: this.include, orderBy: { fechaSolicitud: 'desc' } });
  }

  async findOne(id: string, user: any) {
    const traslado = await this.prisma.trasladoSolicitud.findUnique({ where: { id }, include: this.include });
    if (!traslado) throw new NotFoundException('Traslado no encontrado');
    if (user.rol === RolUsuario.SOLICITANTE && traslado.solicitanteId !== user.perfilId) throw new ForbiddenException('No tiene acceso a este traslado');
    return traslado;
  }

  async updateEstado(id: string, dto: UpdateEstadoTrasladoDto, user: any) {
    const traslado = await this.prisma.trasladoSolicitud.findUnique({ where: { id }, include: { matricula: { include: { solicitud: true } } } });
    if (!traslado) throw new NotFoundException('Traslado no encontrado');
    if (
      traslado.estado !== EstadoSolicitud.EN_REVISION &&
      traslado.estado !== EstadoSolicitud.EN_ESPERA
    ) {
      throw new ConflictException('El traslado ya fue resuelto');
    }
    const estado = dto.estado === 'APROBADA' ? EstadoSolicitud.APROBADA_DIRECCION : dto.estado === 'RECHAZADA' ? EstadoSolicitud.RECHAZADA_DIRECCION : EstadoSolicitud.EN_ESPERA;
    return this.prisma.$transaction(async (tx) => {
      if (dto.estado === 'APROBADA') {
        const capacidadDestino = await tx.capacidadCirculo.findUnique({ where: { circuloId_periodoId_anioVida: { circuloId: traslado.circuloDestinoId, periodoId: traslado.matricula.solicitud.periodoId, anioVida: traslado.matricula.solicitud.anioSolicitado } } });
        if (!capacidadDestino || capacidadDestino.cuposDisponibles < 1) throw new ConflictException('No hay cupos disponibles en el círculo de destino');
        const capacidadOrigen = await tx.capacidadCirculo.findUnique({ where: { circuloId_periodoId_anioVida: { circuloId: traslado.circuloOrigenId, periodoId: traslado.matricula.solicitud.periodoId, anioVida: traslado.matricula.solicitud.anioSolicitado } } });
        await tx.matricula.update({ where: { id: traslado.matriculaId }, data: { circuloId: traslado.circuloDestinoId } });
        await tx.capacidadCirculo.update({ where: { id: capacidadDestino.id }, data: { cuposDisponibles: { decrement: 1 }, cuposOcupados: { increment: 1 } } });
        if (capacidadOrigen) await tx.capacidadCirculo.update({ where: { id: capacidadOrigen.id }, data: { cuposDisponibles: { increment: 1 }, cuposOcupados: { decrement: 1 } } });
      }
      return tx.trasladoSolicitud.update({ where: { id }, data: { estado, comentarioRespuesta: dto.comentarioRespuesta?.trim(), respondidoPorId: user.id, fechaRespuesta: new Date() }, include: this.include });
    });
  }
}
