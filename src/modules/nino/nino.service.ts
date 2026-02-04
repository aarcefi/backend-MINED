/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateNinoDto } from './dto/create-nino.dto';
import { UpdateNinoDto } from './dto/update-nino.dto';

@Injectable()
export class NinosService {
  constructor(private prisma: PrismaService) {}

  async create(createNinoDto: CreateNinoDto) {
    // Verificar que el solicitante existe
    const solicitante = await this.prisma.perfilSolicitante.findUnique({
      where: { id: createNinoDto.solicitanteId },
    });

    if (!solicitante) {
      throw new NotFoundException(
        `Solicitante con ID ${createNinoDto.solicitanteId} no encontrado`,
      );
    }

    // Verificar que la tarjeta del menor no esté registrada
    const ninoExistente = await this.prisma.nino.findUnique({
      where: { tarjetaMenor: createNinoDto.tarjetaMenor },
    });

    if (ninoExistente) {
      throw new ConflictException('La tarjeta del menor ya está registrada');
    }

    return this.prisma.nino.create({
      data: {
        nombre: createNinoDto.nombre,
        apellidos: createNinoDto.apellidos,
        fechaNacimiento: new Date(createNinoDto.fechaNacimiento),
        sexo: createNinoDto.sexo,
        tarjetaMenor: createNinoDto.tarjetaMenor,
        solicitanteId: createNinoDto.solicitanteId,
        casoEspecial: createNinoDto.casoEspecial || false,
        tipoNecesidad: createNinoDto.tipoNecesidad,
      },
      include: {
        solicitante: {
          include: {
            usuario: true,
          },
        },
        solicitud: true,
      },
    });
  }

  async findAll(filtros?: {
    solicitanteId?: string;
    casoEspecial?: boolean;
    edadMin?: number;
    edadMax?: number;
    sexo?: string;
    tipoNecesidad?: string;
  }) {
    const where: any = {};

    if (filtros?.solicitanteId) {
      where.solicitanteId = filtros.solicitanteId;
    }

    if (filtros?.casoEspecial !== undefined) {
      where.casoEspecial = filtros.casoEspecial;
    }

    if (filtros?.sexo) {
      where.sexo = filtros.sexo;
    }

    if (filtros?.tipoNecesidad) {
      where.tipoNecesidad = {
        contains: filtros.tipoNecesidad,
        mode: 'insensitive',
      };
    }

    // Obtener todos los niños primero
    const ninos = await this.prisma.nino.findMany({
      where,
      include: {
        solicitante: {
          include: {
            usuario: true,
          },
        },
        solicitud: {
          include: {
            periodo: true,
            decisiones: true,
            matricula: true,
          },
        },
      },
      orderBy: {
        fechaNacimiento: 'desc',
      },
    });

    // Filtrar por edad si se especificó
    if (filtros?.edadMin !== undefined || filtros?.edadMax !== undefined) {
      const hoy = new Date();
      return ninos.filter((nino) => {
        const fechaNacimiento = new Date(nino.fechaNacimiento);
        const edadEnMeses =
          (hoy.getFullYear() - fechaNacimiento.getFullYear()) * 12 +
          (hoy.getMonth() - fechaNacimiento.getMonth());
        const edadEnAnios = edadEnMeses / 12;

        if (filtros.edadMin !== undefined && edadEnAnios < filtros.edadMin) {
          return false;
        }
        if (filtros.edadMax !== undefined && edadEnAnios > filtros.edadMax) {
          return false;
        }
        return true;
      });
    }

    return ninos;
  }

  async findSinSolicitud(periodoActivoId?: string) {
    const where: any = {
      solicitud: null,
    };

    // Si se especifica un período activo, también incluir niños sin solicitud en ese período
    if (periodoActivoId) {
      where.OR = [
        { solicitud: null },
        {
          solicitud: {
            periodoId: periodoActivoId,
          },
        },
      ];
    }

    return this.prisma.nino.findMany({
      where,
      include: {
        solicitante: {
          include: {
            usuario: true,
          },
        },
      },
      orderBy: {
        fechaNacimiento: 'desc',
      },
    });
  }

  async findCasosEspeciales(tipoNecesidad?: string) {
    const where: any = {
      casoEspecial: true,
    };

    if (tipoNecesidad) {
      where.tipoNecesidad = {
        contains: tipoNecesidad,
        mode: 'insensitive',
      };
    }

    return this.prisma.nino.findMany({
      where,
      include: {
        solicitante: {
          include: {
            usuario: true,
          },
        },
        solicitud: {
          include: {
            periodo: true,
            matricula: true,
          },
        },
      },
      orderBy: {
        fechaNacimiento: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const nino = await this.prisma.nino.findUnique({
      where: { id },
      include: {
        solicitante: {
          include: {
            usuario: true,
          },
        },
        solicitud: {
          include: {
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
                controles: {
                  orderBy: {
                    fecha: 'desc',
                  },
                },
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
        },
      },
    });

    if (!nino) {
      throw new NotFoundException(`Niño con ID ${id} no encontrado`);
    }

    return nino;
  }

  async findBySolicitanteId(solicitanteId: string) {
    return this.prisma.nino.findMany({
      where: { solicitanteId },
      include: {
        solicitante: true,
        solicitud: {
          include: {
            periodo: true,
            matricula: true,
          },
        },
      },
      orderBy: {
        fechaNacimiento: 'desc',
      },
    });
  }

  async findByTarjetaMenor(tarjetaMenor: string) {
    const nino = await this.prisma.nino.findUnique({
      where: { tarjetaMenor },
      include: {
        solicitante: {
          include: {
            usuario: true,
          },
        },
        solicitud: true,
      },
    });

    if (!nino) {
      throw new NotFoundException(
        `Niño con tarjeta ${tarjetaMenor} no encontrado`,
      );
    }

    return nino;
  }

  async getHistorialCompleto(id: string) {
    const nino = await this.prisma.nino.findUnique({
      where: { id },
      include: {
        solicitante: {
          include: {
            usuario: true,
            hijos: {
              include: {
                solicitud: true,
              },
            },
          },
        },
        solicitud: {
          include: {
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
                controles: {
                  include: {
                    funcionario: true,
                  },
                  orderBy: {
                    fecha: 'desc',
                  },
                },
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
        },
      },
    });

    if (!nino) {
      throw new NotFoundException(`Niño con ID ${id} no encontrado`);
    }

    // Calcular edad
    const hoy = new Date();
    const fechaNacimiento = new Date(nino.fechaNacimiento);
    const edadEnMeses =
      (hoy.getFullYear() - fechaNacimiento.getFullYear()) * 12 +
      (hoy.getMonth() - fechaNacimiento.getMonth());
    const edadEnAnios = Math.floor(edadEnMeses / 12);
    const mesesRestantes = edadEnMeses % 12;

    // Obtener historial de cambios en los datos del niño
    // (Nota: Esto requeriría una tabla de auditoría específica para niños)

    return {
      datosPersonales: {
        ...nino,
        edad: `${edadEnAnios} años y ${mesesRestantes} meses`,
        edadMeses: edadEnMeses,
      },
      historialFamiliar: {
        solicitante: nino.solicitante,
        hermanos: nino.solicitante.hijos.filter((h) => h.id !== id),
      },
      historialSolicitudes: nino.solicitud
        ? {
            solicitud: nino.solicitud,
            trazas: nino.solicitud.trazas,
          }
        : null,
    };
  }

  async update(id: string, updateNinoDto: UpdateNinoDto) {
    // Verificar que el niño existe
    const nino = await this.prisma.nino.findUnique({
      where: { id },
    });

    if (!nino) {
      throw new NotFoundException(`Niño con ID ${id} no encontrado`);
    }

    // Si se actualiza el solicitanteId, verificar que existe
    if (updateNinoDto.solicitanteId) {
      const solicitante = await this.prisma.perfilSolicitante.findUnique({
        where: { id: updateNinoDto.solicitanteId },
      });

      if (!solicitante) {
        throw new NotFoundException(
          `Solicitante con ID ${updateNinoDto.solicitanteId} no encontrado`,
        );
      }
    }

    // Si se actualiza la tarjeta del menor, verificar que no esté en uso por otro niño
    if (
      updateNinoDto.tarjetaMenor &&
      updateNinoDto.tarjetaMenor !== nino.tarjetaMenor
    ) {
      const tarjetaExistente = await this.prisma.nino.findUnique({
        where: { tarjetaMenor: updateNinoDto.tarjetaMenor },
      });

      if (tarjetaExistente) {
        throw new ConflictException('La tarjeta del menor ya está registrada');
      }
    }

    return this.prisma.nino.update({
      where: { id },
      data: {
        ...updateNinoDto,
        ...(updateNinoDto.fechaNacimiento && {
          fechaNacimiento: new Date(updateNinoDto.fechaNacimiento),
        }),
      },
      include: {
        solicitante: {
          include: {
            usuario: true,
          },
        },
        solicitud: true,
      },
    });
  }

  async remove(id: string) {
    // Verificar que el niño existe
    const nino = await this.prisma.nino.findUnique({
      where: { id },
    });

    if (!nino) {
      throw new NotFoundException(`Niño con ID ${id} no encontrado`);
    }

    // Verificar que no tenga solicitudes activas
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { ninoId: id },
    });

    if (solicitud) {
      throw new ConflictException(
        'No se puede eliminar un niño con solicitudes activas',
      );
    }

    await this.prisma.nino.delete({
      where: { id },
    });

    return { message: `Niño con ID ${id} eliminado exitosamente` };
  }

  async getNiñosPorSolicitante(solicitanteId: string) {
    return this.prisma.nino.findMany({
      where: { solicitanteId },
      include: {
        solicitante: {
          include: {
            usuario: true,
          },
        },
        solicitud: {
          select: {
            estado: true,
            periodo: true,
            matricula: true,
          },
        },
      },
    });
  }

  async getEstadisticas() {
    const total = await this.prisma.nino.count();
    const conSolicitud = await this.prisma.nino.count({
      where: {
        solicitud: {
          isNot: null,
        },
      },
    });
    const casosEspeciales = await this.prisma.nino.count({
      where: { casoEspecial: true },
    });

    // Estadísticas por sexo
    const porSexo = await this.prisma.nino.groupBy({
      by: ['sexo'],
      _count: {
        _all: true,
      },
    });

    // Estadísticas por edad
    const ninos = await this.prisma.nino.findMany({
      select: {
        fechaNacimiento: true,
      },
    });

    const hoy = new Date();
    const edades = ninos.map((nino) => {
      const fechaNacimiento = new Date(nino.fechaNacimiento);
      return (
        (hoy.getFullYear() - fechaNacimiento.getFullYear()) * 12 +
        (hoy.getMonth() - fechaNacimiento.getMonth())
      );
    });

    const menoresDe1Anio = edades.filter((edad) => edad < 12).length;
    const de1a3Anios = edades.filter((edad) => edad >= 12 && edad < 36).length;
    const de3a5Anios = edades.filter((edad) => edad >= 36 && edad < 60).length;
    const mayoresDe5Anios = edades.filter((edad) => edad >= 60).length;

    return {
      total,
      conSolicitud,
      sinSolicitud: total - conSolicitud,
      casosEspeciales,
      porcentajeCasosEspeciales:
        total > 0 ? (casosEspeciales / total) * 100 : 0,
      porcentajeConSolicitud: total > 0 ? (conSolicitud / total) * 100 : 0,
      porSexo: porSexo.map((item) => ({
        sexo: item.sexo,
        cantidad: item._count._all,
        porcentaje: total > 0 ? (item._count._all / total) * 100 : 0,
      })),
      porEdad: {
        menoresDe1Anio,
        de1a3Anios,
        de3a5Anios,
        mayoresDe5Anios,
        porcentajeMenores1Anio: total > 0 ? (menoresDe1Anio / total) * 100 : 0,
        porcentaje1a3Anios: total > 0 ? (de1a3Anios / total) * 100 : 0,
        porcentaje3a5Anios: total > 0 ? (de3a5Anios / total) * 100 : 0,
        porcentajeMayores5Anios:
          total > 0 ? (mayoresDe5Anios / total) * 100 : 0,
      },
    };
  }
}
