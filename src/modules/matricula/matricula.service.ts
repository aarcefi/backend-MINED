/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateMatriculaDto } from './dto/create-matricula.dto';
import { UpdateMatriculaDto } from './dto/update-matricula.dto';
import { EstadoMatricula } from '@prisma/client';

@Injectable()
export class MatriculasService {
  constructor(private prisma: PrismaService) {}

  async create(createMatriculaDto: CreateMatriculaDto) {
    // Verificar que la solicitud existe
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id: createMatriculaDto.solicitudId },
    });

    if (!solicitud) {
      throw new NotFoundException(
        `Solicitud con ID ${createMatriculaDto.solicitudId} no encontrada`,
      );
    }

    // Verificar que el círculo infantil existe
    const circulo = await this.prisma.circuloInfantil.findUnique({
      where: { id: createMatriculaDto.circuloId },
    });

    if (!circulo) {
      throw new NotFoundException(
        `Círculo infantil con ID ${createMatriculaDto.circuloId} no encontrado`,
      );
    }

    // Verificar que la solicitud no tenga ya una matrícula
    const matriculaExistente = await this.prisma.matricula.findUnique({
      where: { solicitudId: createMatriculaDto.solicitudId },
    });

    if (matriculaExistente) {
      throw new ConflictException(
        'Esta solicitud ya tiene una matrícula asignada',
      );
    }

    // Verificar que el círculo tenga capacidad disponible
    const capacidad = await this.prisma.capacidadCirculo.findUnique({
      where: {
        circuloId_periodoId: {
          circuloId: createMatriculaDto.circuloId,
          periodoId: solicitud.periodoId,
        },
      },
    });

    if (!capacidad || capacidad.cuposDisponibles <= 0) {
      throw new ConflictException(
        'El círculo no tiene capacidad disponible para este período',
      );
    }

    // Generar folio único
    const folio = await this.generarFolioUnico();

    // Crear la matrícula y actualizar la capacidad
    const [matricula] = await this.prisma.$transaction([
      this.prisma.matricula.create({
        data: {
          solicitudId: createMatriculaDto.solicitudId,
          circuloId: createMatriculaDto.circuloId,
          fechaOtorgamiento: new Date(createMatriculaDto.fechaOtorgamiento),
          fechaLimite: new Date(createMatriculaDto.fechaLimite),
          estado: createMatriculaDto.estado || EstadoMatricula.ACTIVA,
          boletaUrl: createMatriculaDto.boletaUrl,
          folio: folio,
        },
        include: {
          solicitud: {
            include: {
              nino: {
                include: {
                  solicitante: true,
                },
              },
              periodo: true,
            },
          },
          circulo: true,
          controles: true,
        },
      }),
      // Actualizar capacidad del círculo
      this.prisma.capacidadCirculo.update({
        where: {
          circuloId_periodoId: {
            circuloId: createMatriculaDto.circuloId,
            periodoId: solicitud.periodoId,
          },
        },
        data: {
          cuposOcupados: { increment: 1 },
          cuposDisponibles: { decrement: 1 },
        },
      }),
    ]);

    return matricula;
  }

  private async generarFolioUnico(): Promise<string> {
    // Generar un folio con formato: MAT-YYYYMMDD-XXXX
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');

    let folio = `MAT-${year}${month}${day}-${random}`;
    let intentos = 0;

    // Verificar que el folio no exista
    while (intentos < 10) {
      const existe = await this.prisma.matricula.findUnique({
        where: { folio },
      });

      if (!existe) {
        return folio;
      }

      // Si existe, generar otro
      const newRandom = Math.floor(Math.random() * 10000)
        .toString()
        .padStart(4, '0');
      folio = `MAT-${year}${month}${day}-${newRandom}`;
      intentos++;
    }

    throw new Error('No se pudo generar un folio único después de 10 intentos');
  }

  async findAll(filtros?: {
    estado?: EstadoMatricula;
    circuloId?: string;
    periodoId?: string;
    solicitanteId?: string;
    fechaOtorgamientoDesde?: Date;
    fechaOtorgamientoHasta?: Date;
  }) {
    const where: any = {};

    if (filtros?.estado) {
      where.estado = filtros.estado;
    }

    if (filtros?.circuloId) {
      where.circuloId = filtros.circuloId;
    }

    if (filtros?.periodoId) {
      where.solicitud = {
        ...where.solicitud,
        periodoId: filtros.periodoId,
      };
    }

    if (filtros?.solicitanteId) {
      where.solicitud = {
        ...where.solicitud,
        solicitanteId: filtros.solicitanteId,
      };
    }

    if (filtros?.fechaOtorgamientoDesde || filtros?.fechaOtorgamientoHasta) {
      where.fechaOtorgamiento = {};

      if (filtros.fechaOtorgamientoDesde) {
        where.fechaOtorgamiento.gte = filtros.fechaOtorgamientoDesde;
      }

      if (filtros.fechaOtorgamientoHasta) {
        where.fechaOtorgamiento.lte = filtros.fechaOtorgamientoHasta;
      }
    }

    return this.prisma.matricula.findMany({
      where,
      include: {
        solicitud: {
          include: {
            nino: {
              include: {
                solicitante: true,
              },
            },
            periodo: true,
          },
        },
        circulo: true,
        controles: {
          orderBy: {
            fecha: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        fechaOtorgamiento: 'desc',
      },
    });
  }

  async findActivas() {
    return this.findAll({ estado: EstadoMatricula.ACTIVA });
  }

  async findVencidas() {
    const hoy = new Date();

    // Obtener matrículas que están vencidas por fecha límite
    const matriculas = await this.prisma.matricula.findMany({
      where: {
        OR: [
          { estado: EstadoMatricula.VENCIDA },
          {
            estado: EstadoMatricula.ACTIVA,
            fechaLimite: { lt: hoy },
          },
        ],
      },
      include: {
        solicitud: {
          include: {
            nino: {
              include: {
                solicitante: true,
              },
            },
            periodo: true,
          },
        },
        circulo: true,
        controles: true,
      },
      orderBy: {
        fechaLimite: 'asc',
      },
    });

    // Actualizar estado de matrículas vencidas por fecha
    for (const matricula of matriculas) {
      if (
        matricula.estado === EstadoMatricula.ACTIVA &&
        matricula.fechaLimite < hoy
      ) {
        await this.prisma.matricula.update({
          where: { id: matricula.id },
          data: { estado: EstadoMatricula.VENCIDA },
        });
        matricula.estado = EstadoMatricula.VENCIDA;
      }
    }

    return matriculas;
  }

  async findByCirculoId(circuloId: string, estado?: EstadoMatricula) {
    const where: any = { circuloId };

    if (estado) {
      where.estado = estado;
    }

    return this.prisma.matricula.findMany({
      where,
      include: {
        solicitud: {
          include: {
            nino: {
              include: {
                solicitante: true,
              },
            },
            periodo: true,
          },
        },
        circulo: true,
        controles: {
          orderBy: {
            fecha: 'desc',
          },
        },
      },
      orderBy: {
        fechaOtorgamiento: 'desc',
      },
    });
  }

  async findBySolicitanteId(solicitanteId: string) {
    return this.prisma.matricula.findMany({
      where: {
        solicitud: {
          solicitanteId,
        },
      },
      include: {
        solicitud: {
          include: {
            nino: true,
            periodo: true,
          },
        },
        circulo: true,
        controles: {
          orderBy: {
            fecha: 'desc',
          },
        },
      },
      orderBy: {
        fechaOtorgamiento: 'desc',
      },
    });
  }

  async findByFolio(folio: string) {
    const matricula = await this.prisma.matricula.findUnique({
      where: { folio },
      include: {
        solicitud: {
          include: {
            nino: {
              include: {
                solicitante: true,
              },
            },
            periodo: true,
          },
        },
        circulo: true,
        controles: {
          orderBy: {
            fecha: 'desc',
          },
        },
      },
    });

    if (!matricula) {
      throw new NotFoundException(`Matrícula con folio ${folio} no encontrada`);
    }

    return matricula;
  }

  async findOne(id: string) {
    const matricula = await this.prisma.matricula.findUnique({
      where: { id },
      include: {
        solicitud: {
          include: {
            nino: {
              include: {
                solicitante: true,
              },
            },
            periodo: true,
          },
        },
        circulo: true,
        controles: {
          orderBy: {
            fecha: 'desc',
          },
        },
      },
    });

    if (!matricula) {
      throw new NotFoundException(`Matrícula con ID ${id} no encontrada`);
    }

    return matricula;
  }

  async findBySolicitudId(solicitudId: string) {
    const matricula = await this.prisma.matricula.findUnique({
      where: { solicitudId },
      include: {
        solicitud: {
          include: {
            nino: {
              include: {
                solicitante: true,
              },
            },
            periodo: true,
          },
        },
        circulo: true,
        controles: true,
      },
    });

    if (!matricula) {
      throw new NotFoundException(
        `Matrícula para solicitud con ID ${solicitudId} no encontrada`,
      );
    }

    return matricula;
  }

  async update(id: string, data: UpdateMatriculaDto) {
    const matricula = await this.prisma.matricula.findUnique({
      where: { id },
    });

    if (!matricula) {
      throw new NotFoundException(`Matrícula con ID ${id} no encontrada`);
    }

    // Si se cambia el estado a CANCELADA, liberar el cupo
    if (
      data.estado === EstadoMatricula.CANCELADA &&
      matricula.estado !== EstadoMatricula.CANCELADA
    ) {
      const solicitud = await this.prisma.solicitud.findUnique({
        where: { id: matricula.solicitudId },
      });

      if (solicitud) {
        await this.prisma.capacidadCirculo.update({
          where: {
            circuloId_periodoId: {
              circuloId: matricula.circuloId,
              periodoId: solicitud.periodoId,
            },
          },
          data: {
            cuposOcupados: { decrement: 1 },
            cuposDisponibles: { increment: 1 },
          },
        });
      }
    }

    const updateData: any = { ...data };

    if (data.fechaLimite) {
      updateData.fechaLimite = new Date(data.fechaLimite);
    }

    if (data.fechaOtorgamiento) {
      updateData.fechaOtorgamiento = new Date(data.fechaOtorgamiento);
    }

    return this.prisma.matricula.update({
      where: { id },
      data: updateData,
      include: {
        solicitud: {
          include: {
            nino: true,
            periodo: true,
          },
        },
        circulo: true,
        controles: true,
      },
    });
  }

  async remove(id: string) {
    const matricula = await this.prisma.matricula.findUnique({
      where: { id },
    });

    if (!matricula) {
      throw new NotFoundException(`Matrícula con ID ${id} no encontrada`);
    }

    // Verificar que no tenga controles trimestrales
    const controlesCount = await this.prisma.controlTrimestral.count({
      where: { matriculaId: id },
    });

    if (controlesCount > 0) {
      throw new ConflictException(
        'No se puede eliminar una matrícula con controles trimestrales asociados',
      );
    }

    // Liberar el cupo si la matrícula estaba activa
    if (matricula.estado === EstadoMatricula.ACTIVA) {
      const solicitud = await this.prisma.solicitud.findUnique({
        where: { id: matricula.solicitudId },
      });

      if (solicitud) {
        await this.prisma.capacidadCirculo.update({
          where: {
            circuloId_periodoId: {
              circuloId: matricula.circuloId,
              periodoId: solicitud.periodoId,
            },
          },
          data: {
            cuposOcupados: { decrement: 1 },
            cuposDisponibles: { increment: 1 },
          },
        });
      }
    }

    await this.prisma.matricula.delete({
      where: { id },
    });

    return { message: `Matrícula con ID ${id} eliminada exitosamente` };
  }

  async getEstadisticasCirculo(circuloId: string) {
    // Verificar que el círculo existe
    const circulo = await this.prisma.circuloInfantil.findUnique({
      where: { id: circuloId },
    });

    if (!circulo) {
      throw new NotFoundException(`Círculo con ID ${circuloId} no encontrado`);
    }

    // Obtener todas las matrículas del círculo
    const matriculas = await this.prisma.matricula.findMany({
      where: { circuloId },
      include: {
        solicitud: {
          include: {
            nino: true,
          },
        },
        controles: {
          orderBy: {
            fecha: 'desc',
          },
        },
      },
    });

    const total = matriculas.length;
    const activas = matriculas.filter(
      (m) => m.estado === EstadoMatricula.ACTIVA,
    ).length;
    const vencidas = matriculas.filter(
      (m) => m.estado === EstadoMatricula.VENCIDA,
    ).length;
    const canceladas = matriculas.filter(
      (m) => m.estado === EstadoMatricula.CANCELADA,
    ).length;

    // Calcular promedio de controles por matrícula
    const totalControles = matriculas.reduce(
      (acc, m) => acc + m.controles.length,
      0,
    );
    const promedioControles = total > 0 ? totalControles / total : 0;

    // Calcular matrículas con controles pendientes (más de 3 meses desde el último control)
    const hoy = new Date();
    const tresMesesAtras = new Date(
      hoy.getFullYear(),
      hoy.getMonth() - 3,
      hoy.getDate(),
    );

    const matriculasConControlesPendientes = matriculas
      .filter((matricula) => matricula.estado === EstadoMatricula.ACTIVA)
      .filter((matricula) => {
        if (matricula.controles.length === 0) {
          return true; // Nunca ha tenido control
        }
        const ultimoControl = new Date(matricula.controles[0].fecha);
        return ultimoControl < tresMesesAtras;
      });

    // Obtener capacidad del círculo
    const capacidades = await this.prisma.capacidadCirculo.findMany({
      where: { circuloId },
      include: {
        periodo: true,
      },
    });

    const capacidadTotal = capacidades.reduce(
      (acc, cap) => acc + (cap.cuposDisponibles + cap.cuposOcupados),
      0,
    );
    const capacidadOcupada = capacidades.reduce(
      (acc, cap) => acc + cap.cuposOcupados,
      0,
    );

    return {
      circulo: {
        id: circulo.id,
        nombre: circulo.nombre,
        direccion: circulo.direccion,
        municipio: circulo.municipio,
        capacidadTotal: circulo.capacidadTotal,
      },
      estadisticas: {
        totalMatriculas: total,
        matriculasActivas: activas,
        matriculasVencidas: vencidas,
        matriculasCanceladas: canceladas,
        porcentajeActivas: total > 0 ? (activas / total) * 100 : 0,
        totalControles,
        promedioControles: promedioControles.toFixed(1),
        controlesPendientes: matriculasConControlesPendientes.length,
        porcentajeControlesPendientes:
          activas > 0
            ? (matriculasConControlesPendientes.length / activas) * 100
            : 0,
        capacidadTotal,
        capacidadOcupada,
        capacidadDisponible: capacidadTotal - capacidadOcupada,
        ocupacionPorcentaje:
          capacidadTotal > 0 ? (capacidadOcupada / capacidadTotal) * 100 : 0,
      },
      detalles: {
        matriculasConControlesPendientes: matriculasConControlesPendientes.map(
          (m) => ({
            id: m.id,
            folio: m.folio,
            nino: `${m.solicitud.nino.nombre} ${m.solicitud.nino.apellidos}`,
            fechaUltimoControl:
              m.controles.length > 0 ? m.controles[0].fecha : null,
            diasSinControl:
              m.controles.length > 0
                ? Math.floor(
                    (hoy.getTime() - new Date(m.controles[0].fecha).getTime()) /
                      (1000 * 60 * 60 * 24),
                  )
                : null,
          }),
        ),
      },
    };
  }

  async getEstadisticasGenerales() {
    const total = await this.prisma.matricula.count();
    const activas = await this.prisma.matricula.count({
      where: { estado: EstadoMatricula.ACTIVA },
    });
    const vencidas = await this.prisma.matricula.count({
      where: { estado: EstadoMatricula.VENCIDA },
    });
    const canceladas = await this.prisma.matricula.count({
      where: { estado: EstadoMatricula.CANCELADA },
    });

    // Obtener distribución por círculo
    const porCirculo = await this.prisma.matricula.groupBy({
      by: ['circuloId'],
      _count: {
        _all: true,
      },
      where: {
        estado: EstadoMatricula.ACTIVA,
      },
    });

    // Obtener información de los círculos
    const circulos = await this.prisma.circuloInfantil.findMany({
      where: {
        id: {
          in: porCirculo.map((item) => item.circuloId),
        },
      },
    });

    const distribucionCirculos = porCirculo.map((item) => {
      const circulo = circulos.find((c) => c.id === item.circuloId);
      return {
        circuloId: item.circuloId,
        circuloNombre: circulo?.nombre || 'Desconocido',
        cantidad: item._count._all,
      };
    });

    // Obtener matrículas por mes del último año
    const ultimoAnio = new Date();
    ultimoAnio.setFullYear(ultimoAnio.getFullYear() - 1);

    const matriculasPorMes = await this.prisma.matricula.groupBy({
      by: ['fechaOtorgamiento'],
      _count: {
        _all: true,
      },
      where: {
        fechaOtorgamiento: {
          gte: ultimoAnio,
        },
      },
      orderBy: {
        fechaOtorgamiento: 'asc',
      },
    });

    // Procesar datos por mes
    const datosPorMes: Record<string, number> = {};
    matriculasPorMes.forEach((item) => {
      const fecha = new Date(item.fechaOtorgamiento);
      const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
      datosPorMes[mes] = (datosPorMes[mes] || 0) + item._count._all;
    });

    return {
      total,
      activas,
      vencidas,
      canceladas,
      porcentajeActivas: total > 0 ? (activas / total) * 100 : 0,
      porcentajeVencidas: total > 0 ? (vencidas / total) * 100 : 0,
      porcentajeCanceladas: total > 0 ? (canceladas / total) * 100 : 0,
      distribucionPorCirculo: distribucionCirculos,
      tendenciaAnual: Object.entries(datosPorMes).map(([mes, cantidad]) => ({
        mes,
        cantidad,
      })),
    };
  }
}
