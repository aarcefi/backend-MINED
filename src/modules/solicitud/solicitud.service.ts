/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSolicitudDto, UpdateSolicitudDto } from './dto';
import {
  EstadoSolicitud,
  SectorPrioridad,
  TipoSolicitud,
} from '@prisma/client';

@Injectable()
export class SolicitudService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSolicitudDto) {
    // Verificar que el niño existe
    const nino = await this.prisma.nino.findUnique({
      where: { id: data.ninoId },
    });

    if (!nino) {
      throw new NotFoundException(`Niño con ID ${data.ninoId} no encontrado`);
    }

    // Verificar que el tutor/solicitante existe
    const solicitante = await this.prisma.perfilSolicitante.findUnique({
      where: { id: data.solicitanteId },
    });

    if (!solicitante) {
      throw new NotFoundException(
        `Tutor con ID ${data.solicitanteId} no encontrado`,
      );
    }

    // Verificar que el período existe y está activo
    const periodo = await this.prisma.periodoOtorgamiento.findUnique({
      where: { id: data.periodoId },
    });

    if (!periodo) {
      throw new NotFoundException(
        `Período con ID ${data.periodoId} no encontrado`,
      );
    }

    if (!periodo.activo) {
      throw new ConflictException('El período seleccionado no está activo');
    }

    // Verificar que el niño no tenga ya una solicitud activa en este período
    const solicitudExistente = await this.prisma.solicitud.findFirst({
      where: {
        ninoId: data.ninoId,
        periodoId: data.periodoId,
        estado: {
          in: ['RECIBIDA', 'EN_REVISION', 'EN_ESPERA'],
        },
      },
    });

    if (solicitudExistente) {
      throw new ConflictException(
        'El niño ya tiene una solicitud activa en este período',
      );
    }

    // Generar número de registro si no se proporciona
    let numeroRegistro = data.numeroRegistro;
    if (!numeroRegistro) {
      const fecha = new Date();
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0');
      numeroRegistro = `SOL-${year}${month}${day}-${random}`;
    }

    // Calcular prioridad automáticamente basada en varios factores
    let prioridad = 0;

    // Prioridad por sector
    const prioridadSector = {
      SALUD: 30,
      EDUCACION: 25,
      DEFENSA: 20,
      CASO_SOCIAL: 35,
      OTRO: 10,
    };
    prioridad += prioridadSector[data.sector] || 10;

    // Prioridad por tipo de solicitud
    const prioridadTipo = {
      TRABAJADOR: 20,
      ESTUDIANTE: 25,
      CASO_SOCIAL: 30,
    };
    prioridad += prioridadTipo[data.tipoSolicitud] || 15;

    // Prioridad por caso especial del niño
    if (nino.casoEspecial) {
      prioridad += 15;
    }

    // Prioridad por cantidad de hijos del solicitante
    if (solicitante.cantHijos > 1) {
      prioridad += (solicitante.cantHijos - 1) * 5; // +5 por cada hijo adicional
    }

    return this.prisma.solicitud.create({
      data: {
        ninoId: data.ninoId,
        solicitanteId: data.solicitanteId,
        fechaSolicitud: new Date(data.fechaSolicitud),
        sector: data.sector,
        tipoSolicitud: data.tipoSolicitud,
        estado: data.estado,
        periodoId: data.periodoId,
        numeroRegistro,
        observaciones: data.observaciones,
        prioridad,
      },
      include: {
        nino: {
          include: {
            solicitante: true,
          },
        },
        periodo: true,
        documentos: true,
      },
    });
  }

  async findAll(filtros?: {
    estado?: EstadoSolicitud;
    sector?: SectorPrioridad;
    tipoSolicitud?: TipoSolicitud;
    periodoId?: string;
    solicitanteId?: string;
    ninoId?: string;
    municipio?: string;
    fechaDesde?: Date;
    fechaHasta?: Date;
  }) {
    const where: any = {};

    if (filtros?.estado) {
      where.estado = filtros.estado;
    }

    if (filtros?.sector) {
      where.sector = filtros.sector;
    }

    if (filtros?.tipoSolicitud) {
      where.tipoSolicitud = filtros.tipoSolicitud;
    }

    if (filtros?.periodoId) {
      where.periodoId = filtros.periodoId;
    }

    if (filtros?.solicitanteId) {
      where.solicitanteId = filtros.solicitanteId;
    }

    if (filtros?.ninoId) {
      where.ninoId = filtros.ninoId;
    }

    if (filtros?.municipio) {
      where.solicitante = {
        municipio: {
          contains: filtros.municipio,
          mode: 'insensitive',
        },
      };
    }

    if (filtros?.fechaDesde || filtros?.fechaHasta) {
      where.fechaSolicitud = {};

      if (filtros.fechaDesde) {
        where.fechaSolicitud.gte = filtros.fechaDesde;
      }

      if (filtros.fechaHasta) {
        where.fechaSolicitud.lte = filtros.fechaHasta;
      }
    }

    return this.prisma.solicitud.findMany({
      where,
      include: {
        nino: {
          include: {
            solicitante: true,
          },
        },
        periodo: true,
        documentos: {
          where: {
            validado: true,
          },
        },
        decisiones: true,
        matricula: true,
      },
      orderBy: [{ prioridad: 'desc' }, { fechaSolicitud: 'asc' }],
    });
  }

  async findOne(id: string) {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: {
        nino: {
          include: {
            solicitante: true,
          },
        },
        periodo: true,
        documentos: {
          include: {
            validador: true,
          },
        },
        decisiones: {
          include: {
            sesion: true,
            comision: true,
          },
        },
        matricula: {
          include: {
            circulo: true,
            controles: true,
          },
        },
        trazas: {
          include: {
            usuario: true,
          },
          orderBy: {
            fecha: 'desc',
          },
        },
      },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }

    return solicitud;
  }

  async findByNumeroRegistro(numeroRegistro: string) {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { numeroRegistro },
      include: {
        nino: {
          include: {
            solicitante: true,
          },
        },
        periodo: true,
        documentos: true,
      },
    });

    if (!solicitud) {
      throw new NotFoundException(
        `Solicitud con número de registro ${numeroRegistro} no encontrada`,
      );
    }

    return solicitud;
  }

  async findBySolicitanteId(solicitanteId: string) {
    return this.prisma.solicitud.findMany({
      where: { solicitanteId },
      include: {
        nino: true,
        periodo: true,
        documentos: true,
        decisiones: true,
        matricula: true,
      },
      orderBy: {
        fechaSolicitud: 'desc',
      },
    });
  }

  async findByNinoId(ninoId: string) {
    return this.prisma.solicitud.findMany({
      where: { ninoId },
      include: {
        periodo: true,
        documentos: true,
        decisiones: true,
        matricula: true,
      },
      orderBy: {
        fechaSolicitud: 'desc',
      },
    });
  }

  async findPendientesRevision() {
    return this.prisma.solicitud.findMany({
      where: {
        estado: 'EN_REVISION',
        documentos: {
          every: {
            validado: true,
          },
        },
      },
      include: {
        nino: {
          include: {
            solicitante: true,
          },
        },
        periodo: true,
        documentos: true,
      },
      orderBy: {
        prioridad: 'desc',
      },
    });
  }

  async update(id: string, data: UpdateSolicitudDto) {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }

    const updateData: any = { ...data };

    if (data.fechaSolicitud) {
      updateData.fechaSolicitud = new Date(data.fechaSolicitud);
    }

    // Si se cambia el estado, crear trazabilidad
    if (data.estado && data.estado !== solicitud.estado) {
      // Esta trazabilidad se manejará en el controlador o mediante eventos
    }

    return this.prisma.solicitud.update({
      where: { id },
      data: updateData,
    });
  }

  async cambiarEstado(
    id: string,
    estado: EstadoSolicitud,
    usuarioId: string,
    comentario?: string,
  ) {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }

    // Crear trazabilidad
    await this.prisma.trazabilidad.create({
      data: {
        solicitudId: id,
        estadoAnterior: solicitud.estado,
        estadoNuevo: estado,
        usuarioId,
        comentario,
      },
    });

    return this.prisma.solicitud.update({
      where: { id },
      data: { estado },
    });
  }

  async remove(id: string) {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }

    // Verificar que no tenga documentos, decisiones o matrícula asociada
    const tieneDocumentos =
      (await this.prisma.documentoSolicitud.count({
        where: { solicitudId: id },
      })) > 0;

    const tieneDecisiones =
      (await this.prisma.decisionSolicitud.count({
        where: { solicitudId: id },
      })) > 0;

    const tieneMatricula =
      (await this.prisma.matricula.count({
        where: { solicitudId: id },
      })) > 0;

    if (tieneDocumentos || tieneDecisiones || tieneMatricula) {
      throw new ConflictException(
        'No se puede eliminar una solicitud con documentos, decisiones o matrícula asociada',
      );
    }

    return this.prisma.solicitud.delete({
      where: { id },
    });
  }

  async getEstadisticas(filtros?: { periodoId?: string; municipio?: string }) {
    const where: any = {};

    if (filtros?.periodoId) {
      where.periodoId = filtros.periodoId;
    }

    if (filtros?.municipio) {
      where.solicitante = {
        municipio: {
          contains: filtros.municipio,
          mode: 'insensitive',
        },
      };
    }

    const solicitudes = await this.prisma.solicitud.findMany({
      where,
      include: {
        nino: true,
        solicitante: true,
        decisiones: true,
      },
    });

    const total = solicitudes.length;

    // Estadísticas por estado
    const porEstado = {
      RECIBIDA: 0,
      EN_REVISION: 0,
      APROBADA: 0,
      RECHAZADA: 0,
      EN_ESPERA: 0,
    };

    // Estadísticas por sector
    const porSector = {
      SALUD: 0,
      EDUCACION: 0,
      DEFENSA: 0,
      CASO_SOCIAL: 0,
      OTRO: 0,
    };

    // Estadísticas por tipo
    const porTipo = {
      TRABAJADOR: 0,
      ESTUDIANTE: 0,
      CASO_SOCIAL: 0,
    };

    solicitudes.forEach((solicitud) => {
      porEstado[solicitud.estado]++;
      porSector[solicitud.sector]++;
      porTipo[solicitud.tipoSolicitud]++;
    });

    // Solicitudes con decisiones
    const conDecision = solicitudes.filter(
      (s) => s.decisiones.length > 0,
    ).length;
    const sinDecision = total - conDecision;

    return {
      total,
      porEstado,
      porcentajesEstado: {
        RECIBIDA: total > 0 ? (porEstado.RECIBIDA / total) * 100 : 0,
        EN_REVISION: total > 0 ? (porEstado.EN_REVISION / total) * 100 : 0,
        APROBADA: total > 0 ? (porEstado.APROBADA / total) * 100 : 0,
        RECHAZADA: total > 0 ? (porEstado.RECHAZADA / total) * 100 : 0,
        EN_ESPERA: total > 0 ? (porEstado.EN_ESPERA / total) * 100 : 0,
      },
      porSector,
      porTipo,
      conDecision,
      sinDecision,
      porcentajeConDecision: total > 0 ? (conDecision / total) * 100 : 0,
    };
  }
}
