import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, mkdir, unlink, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { PrismaService } from '../../../prisma/prisma.service';
import { RolUsuario } from '../../common/index';
import {
  CreateDocumentoDto,
  UpdateDocumentoDto,
  UploadDocumentoDto,
} from './dto';
import { TipoDocumento } from '@prisma/client';

export const TAMANO_MAXIMO_ARCHIVO = 5 * 1024 * 1024; // 5MB

export interface ArchivoSubido {
  originalname: string;
  buffer: Buffer;
}

// El tipo se decide por el contenido del archivo, no por lo que declara el cliente
const TIPOS_ARCHIVO = [
  {
    mimeType: 'application/pdf',
    extension: '.pdf',
    firma: [0x25, 0x50, 0x44, 0x46],
  },
  { mimeType: 'image/jpeg', extension: '.jpg', firma: [0xff, 0xd8, 0xff] },
  { mimeType: 'image/png', extension: '.png', firma: [0x89, 0x50, 0x4e, 0x47] },
];

const directorioDocumentos = () =>
  process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads', 'documentos');

export async function eliminarArchivosDocumentos(archivosUrl: string[]) {
  await Promise.all(
    archivosUrl.map((archivoUrl) =>
      unlink(join(directorioDocumentos(), basename(archivoUrl))).catch(
        () => undefined,
      ),
    ),
  );
}

@Injectable()
export class DocumentoService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(
    data: UploadDocumentoDto,
    archivo: ArchivoSubido | undefined,
    usuario: any,
  ) {
    if (!archivo) {
      throw new BadRequestException('Debe adjuntar un archivo');
    }

    const tipoArchivo = TIPOS_ARCHIVO.find(({ firma }) =>
      firma.every((byte, i) => archivo.buffer[i] === byte),
    );

    if (!tipoArchivo) {
      throw new BadRequestException(
        'Tipo de archivo no válido. Solo se permiten PDF, JPG y PNG.',
      );
    }

    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id: data.solicitudId },
    });

    if (!solicitud) {
      throw new NotFoundException(
        `Solicitud con ID ${data.solicitudId} no encontrada`,
      );
    }

    this.verificarAcceso(solicitud.solicitanteId, usuario);

    const directorio = directorioDocumentos();
    const archivoUrl = `${randomUUID()}${tipoArchivo.extension}`;

    await mkdir(directorio, { recursive: true });
    await writeFile(join(directorio, archivoUrl), archivo.buffer);

    try {
      return await this.prisma.documentoSolicitud.create({
        data: {
          solicitudId: data.solicitudId,
          tipoDocumento: data.tipoDocumento,
          archivoUrl,
          // multer entrega el nombre en latin1
          nombreArchivo: basename(
            Buffer.from(archivo.originalname, 'latin1').toString('utf8'),
          ),
          validado: false,
        },
      });
    } catch (error) {
      await unlink(join(directorio, archivoUrl)).catch(() => undefined);
      throw error;
    }
  }

  async obtenerArchivo(id: string, usuario: any) {
    const documento = await this.prisma.documentoSolicitud.findUnique({
      where: { id },
      include: {
        solicitud: {
<<<<<<< HEAD
          select: {
            solicitanteId: true,
            solicitante: {
              select: { usuario: { select: { municipio: true } } },
=======
          include: {
            solicitante: {
              include: {
                usuario: {
                  include: { municipioRel: true },
                },
              },
>>>>>>> 26718b1 (Arreglado errores con provincias y municipios)
            },
          },
        },
      },
    });

    if (!documento) {
      throw new NotFoundException(`Documento con ID ${id} no encontrado`);
    }

    this.verificarAcceso(documento.solicitud.solicitanteId, usuario);
    this.verificarMunicipio(
<<<<<<< HEAD
      documento.solicitud.solicitante?.usuario?.municipio,
=======
      documento.solicitud.solicitante?.usuario?.municipioRel?.nombre ??
        undefined,
>>>>>>> 26718b1 (Arreglado errores con provincias y municipios)
      usuario,
    );

    // archivoUrl también se puede escribir por POST /documentos-solicitud
    const nombreGuardado = basename(documento.archivoUrl);
    const tipoArchivo = TIPOS_ARCHIVO.find(
      ({ extension }) => extension === extname(nombreGuardado),
    );
    const ruta = join(directorioDocumentos(), nombreGuardado);

    if (
      !tipoArchivo ||
      !(await access(ruta).then(
        () => true,
        () => false,
      ))
    ) {
      throw new NotFoundException('El archivo no está disponible');
    }

    return {
      stream: createReadStream(ruta),
      mimeType: tipoArchivo.mimeType,
      nombreArchivo: documento.nombreArchivo,
    };
  }

  private verificarMunicipio(municipio: string | undefined, usuario: any) {
    const personalMunicipal = [
      RolUsuario.FUNCIONARIO_MUNICIPAL,
      RolUsuario.COMISION_OTORGAMIENTO,
    ].includes(usuario.rol);
    const [a, b] = [municipio, usuario.municipio].map((m) =>
      m?.trim().toLowerCase(),
    );

    if (personalMunicipal && a && b && !a.includes(b) && !b.includes(a)) {
      throw new ForbiddenException(
        'Solo puedes acceder a documentos de tu municipio',
      );
    }
  }

  private verificarAcceso(solicitanteId: string, usuario: any) {
    if (
      usuario.rol === RolUsuario.SOLICITANTE &&
      solicitanteId !== usuario.perfilId
    ) {
      throw new ForbiddenException(
        'Solo puedes acceder a documentos de tus propias solicitudes',
      );
    }
  }

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

    const eliminado = await this.prisma.documentoSolicitud.delete({
      where: { id },
    });
    await eliminarArchivosDocumentos([documento.archivoUrl]);
    return eliminado;
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
