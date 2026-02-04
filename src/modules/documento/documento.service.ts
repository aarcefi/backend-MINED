/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateDocumentoDto, UpdateDocumentoDto } from './dto';
import { TipoDocumento } from '@prisma/client';

@Injectable()
export class DocumentoService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateDocumentoDto) {
    // Verificar que la solicitud existe
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id: data.solicitudId },
    });

    if (!solicitud) {
      throw new NotFoundException(
        `Solicitud con ID ${data.solicitudId} no encontrada`,
      );
    }

    return this.prisma.documentoSolicitud.create({ data });
  }

  async createMultiple(data: CreateDocumentoDto[]) {
    // Verificar que todas las solicitudes existen
    for (const documento of data) {
      const solicitud = await this.prisma.solicitud.findUnique({
        where: { id: documento.solicitudId },
      });

      if (!solicitud) {
        throw new NotFoundException(
          `Solicitud con ID ${documento.solicitudId} no encontrada`,
        );
      }
    }

    return Promise.all(
      data.map((dto) => this.prisma.documentoSolicitud.create({ data: dto })),
    );
  }

  async findAll(filtros?: {
    solicitudId?: string;
    tipo?: TipoDocumento;
    validado?: boolean;
    validadorId?: string;
  }) {
    const where: any = {};

    if (filtros?.solicitudId) {
      where.solicitudId = filtros.solicitudId;
    }

    if (filtros?.tipo) {
      where.tipoDocumento = filtros.tipo;
    }

    if (filtros?.validado !== undefined) {
      where.validado = filtros.validado;
    }

    if (filtros?.validadorId) {
      where.validadorId = filtros.validadorId;
    }

    return this.prisma.documentoSolicitud.findMany({
      where,
      include: {
        solicitud: {
          include: {
            nino: true,
          },
        },
        validador: true,
      },
      orderBy: {
        fechaValidacion: 'desc',
      },
    });
  }

  async findBySolicitudId(solicitudId: string, tipo?: TipoDocumento) {
    const where: any = {
      solicitudId,
    };

    if (tipo) {
      where.tipoDocumento = tipo;
    }

    return this.prisma.documentoSolicitud.findMany({
      where,
      include: {
        validador: true,
      },
      orderBy: {
        tipoDocumento: 'asc',
      },
    });
  }

  async findBySolicitudAndTipo(solicitudId: string, tipo: TipoDocumento) {
    return this.prisma.documentoSolicitud.findFirst({
      where: {
        solicitudId,
        tipoDocumento: tipo,
      },
      include: {
        validador: true,
      },
    });
  }

  async findPendientesValidacion(validadorId?: string) {
    const where: any = {
      validado: false,
    };

    if (validadorId) {
      where.validadorId = validadorId;
    }

    return this.prisma.documentoSolicitud.findMany({
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
      },
      orderBy: {
        solicitud: {
          fechaSolicitud: 'desc',
        },
      },
    });
  }

  findOne(id: string) {
    return this.prisma.documentoSolicitud.findUnique({
      where: { id },
      include: {
        solicitud: {
          include: {
            nino: true,
          },
        },
        validador: true,
      },
    });
  }

  async update(id: string, data: UpdateDocumentoDto) {
    // Verificar que existe
    const documento = await this.prisma.documentoSolicitud.findUnique({
      where: { id },
    });

    if (!documento) {
      throw new NotFoundException(`Documento con ID ${id} no encontrado`);
    }

    const updateData: any = { ...data };

    // Si se valida, agregar fecha de validación
    if (data.validado !== undefined && data.validado !== documento.validado) {
      if (data.validado) {
        updateData.fechaValidacion = new Date();
      } else {
        updateData.fechaValidacion = null;
        updateData.validadorId = null;
      }
    }

    return this.prisma.documentoSolicitud.update({
      where: { id },
      data: updateData,
    });
  }

  async validarDocumento(id: string, validado: boolean, validadorId: string) {
    const documento = await this.prisma.documentoSolicitud.findUnique({
      where: { id },
    });

    if (!documento) {
      throw new NotFoundException(`Documento con ID ${id} no encontrado`);
    }

    return this.prisma.documentoSolicitud.update({
      where: { id },
      data: {
        validado,
        validadorId,
        fechaValidacion: validado ? new Date() : null,
      },
    });
  }

  async remove(id: string) {
    // Verificar que existe
    const documento = await this.prisma.documentoSolicitud.findUnique({
      where: { id },
    });

    if (!documento) {
      throw new NotFoundException(`Documento con ID ${id} no encontrado`);
    }

    return this.prisma.documentoSolicitud.delete({
      where: { id },
    });
  }

  async getEstadisticasValidacion() {
    const total = await this.prisma.documentoSolicitud.count();
    const validados = await this.prisma.documentoSolicitud.count({
      where: { validado: true },
    });
    const pendientes = await this.prisma.documentoSolicitud.count({
      where: { validado: false },
    });

    const porTipo = await this.prisma.documentoSolicitud.groupBy({
      by: ['tipoDocumento'],
      _count: {
        _all: true,
      },
      where: {
        validado: true,
      },
    });

    return {
      total,
      validados,
      pendientes,
      porcentajeValidados: total > 0 ? (validados / total) * 100 : 0,
      porTipo: porTipo.map((item) => ({
        tipo: item.tipoDocumento,
        cantidad: item._count._all,
      })),
    };
  }
}
