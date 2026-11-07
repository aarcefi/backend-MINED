/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { resolverUbicacion } from '../../common/utils/ubicacion.util';
import {
  CapacidadAnioDto,
  CreateCirculoInfantilDto,
  UpdateCirculoInfantilDto,
} from './dto';
import {
  AnioVida,
  CapacidadCirculo,
  Prisma,
  RolUsuario,
  TipoCirculo,
} from '@prisma/client';

const NOMBRE_ANIO: Record<AnioVida, string> = {
  ANIO_2: '2do año de vida',
  ANIO_3: '3er año de vida',
  ANIO_4: '4to año de vida',
  ANIO_5: '5to año de vida',
  ANIO_6: '6to año de vida',
};

// El frontend trabaja con los nombres: se devuelven como texto, igual que antes
// de pasar provincia y municipio a tablas propias
const UBICACION = { municipioRel: true, provinciaRel: true } as const;

function conUbicacion<
  T extends {
    municipioRel?: { nombre: string } | null;
    provinciaRel?: { nombre: string } | null;
  },
>(circulo: T) {
  const { municipioRel, provinciaRel, ...resto } = circulo;
  return {
    ...resto,
    municipio: municipioRel?.nombre ?? null,
    provincia: provinciaRel?.nombre ?? null,
  };
}

/** Igual que en CapacidadCirculoService: 120 % de la capacidad nominal. */
const sobrecapacidad = (capacidadTotal: number) =>
  Math.ceil(capacidadTotal * 1.2);

@Injectable()
export class CirculoInfantilService {
  constructor(private readonly prisma: PrismaService) {}

  /** Solo los campos propios del círculo; nada que el cliente cuele de más. */
  private camposCirculo(data: UpdateCirculoInfantilDto) {
    const campos = {
      nombre: data.nombre?.trim(),
      direccion: data.direccion?.trim(),
      capacidadTotal: data.capacidadTotal,
      tipo: data.tipo,
      activo: data.activo,
      tieneSextoAnio: data.tieneSextoAnio,
      telefono:
        data.telefono === undefined ? undefined : data.telefono?.trim() || null,
    };
    return Object.fromEntries(
      Object.entries(campos).filter(([, v]) => v !== undefined),
    ) as Prisma.CirculoInfantilUncheckedUpdateInput;
  }

  /** Convierte los nombres de municipio y provincia en sus ids. */
  private async idsUbicacion(data: UpdateCirculoInfantilDto) {
    if (!data.municipio) return {};
    return resolverUbicacion(
      this.prisma,
      data.municipio.trim(),
      data.provincia?.trim(),
    );
  }

  async create(data: CreateCirculoInfantilDto) {
    const circulo = {
      ...(this.camposCirculo(
        data,
      ) as Prisma.CirculoInfantilUncheckedCreateInput),
      ...(await this.idsUbicacion(data)),
      tieneSextoAnio: data.tieneSextoAnio ?? false,
    };
    const creado = await this.prisma.$transaction(async (tx) => {
      const nuevo = await tx.circuloInfantil.create({
        data: circulo,
        include: UBICACION,
      });
      if (data.capacidades) {
        await this.sincronizarCapacidades(tx, nuevo, [], data.capacidades);
      }
      return nuevo;
    });
    return conUbicacion(creado);
  }

  /**
   * Deja las capacidades del círculo como indica `deseadas` (si viene) y
   * comprueba que encajen con el círculo: sin 6to año si no lo ofrece, sin
   * bajar de los niños ya matriculados y sin pasar de la capacidad total.
   */
  private async sincronizarCapacidades(
    tx: Prisma.TransactionClient,
    circulo: { id: string; capacidadTotal: number; tieneSextoAnio: boolean },
    actuales: CapacidadCirculo[],
    deseadas?: CapacidadAnioDto[],
    comprobarSuma = true,
  ) {
    const porAnio = new Map<AnioVida, number>();
    if (deseadas) {
      for (const c of deseadas) {
        if (porAnio.has(c.anioVida)) {
          throw new BadRequestException(
            `El ${NOMBRE_ANIO[c.anioVida]} aparece repetido`,
          );
        }
        if (c.capacidadTotal > 0) porAnio.set(c.anioVida, c.capacidadTotal);
      }
    } else {
      for (const c of actuales) porAnio.set(c.anioVida, c.capacidadTotal);
    }

    // Sin sexto año, su capacidad sobra
    if (!circulo.tieneSextoAnio && porAnio.has(AnioVida.ANIO_6)) {
      if (deseadas) {
        throw new BadRequestException(
          'Este círculo no ofrece el 6to año de vida: marque "Tiene sexto año de vida" o deje esa capacidad vacía',
        );
      }
      porAnio.delete(AnioVida.ANIO_6);
    }

    for (const actual of actuales) {
      const nueva = porAnio.get(actual.anioVida) ?? 0;
      if (nueva < actual.cuposOcupados) {
        throw new ConflictException(
          `El ${NOMBRE_ANIO[actual.anioVida]} tiene ${actual.cuposOcupados} ` +
            `niño(s) matriculado(s); su capacidad no puede ser menor que ${actual.cuposOcupados}`,
        );
      }
    }

    // Con datos antiguos descuadrados, editar solo el teléfono no debe fallar:
    // la suma se revisa al tocar las capacidades o la capacidad total
    const suma = [...porAnio.values()].reduce((a, b) => a + b, 0);
    if (comprobarSuma && suma > circulo.capacidadTotal) {
      throw new BadRequestException(
        `La suma de las capacidades por año (${suma}) supera la capacidad total del círculo (${circulo.capacidadTotal})`,
      );
    }

    for (const actual of actuales) {
      const nueva = porAnio.get(actual.anioVida);
      if (nueva === undefined) {
        await tx.capacidadCirculo.delete({ where: { id: actual.id } });
      } else if (nueva !== actual.capacidadTotal) {
        await tx.capacidadCirculo.update({
          where: { id: actual.id },
          data: {
            capacidadTotal: nueva,
            sobrecapacidad: sobrecapacidad(nueva),
            cuposDisponibles: nueva - actual.cuposOcupados,
          },
        });
      }
    }

    const existentes = new Set(actuales.map((c) => c.anioVida));
    for (const [anioVida, capacidadTotal] of porAnio) {
      if (existentes.has(anioVida)) continue;
      await tx.capacidadCirculo.create({
        data: {
          circuloId: circulo.id,
          anioVida,
          capacidadTotal,
          sobrecapacidad: sobrecapacidad(capacidadTotal),
          cuposDisponibles: capacidadTotal,
          cuposOcupados: 0,
        },
      });
    }
  }

  async findAll(filtros?: {
    municipio?: string;
    provincia?: string;
    tipo?: TipoCirculo;
    activo?: boolean;
  }) {
    const where: any = {};
    if (filtros?.municipio) {
      where.municipioRel = {
        nombre: { contains: filtros.municipio, mode: 'insensitive' },
      };
    }
    if (filtros?.provincia) {
      where.provinciaRel = {
        nombre: { contains: filtros.provincia, mode: 'insensitive' },
      };
    }
    if (filtros?.tipo) where.tipo = filtros.tipo;
    if (filtros?.activo !== undefined) where.activo = filtros.activo;

    const circulos = await this.prisma.circuloInfantil.findMany({
      where,
      include: {
        capacidades: true,
        matriculas: { where: { estado: 'ACTIVA' } },
        ...UBICACION,
      },
      orderBy: { nombre: 'asc' },
    });
    return circulos.map(conUbicacion);
  }

  async findActivos() {
    const circulos = await this.prisma.circuloInfantil.findMany({
      where: { activo: true },
      include: {
        capacidades: {
          where: { cuposDisponibles: { gt: 0 } },
        },
        ...UBICACION,
      },
      orderBy: { nombre: 'asc' },
    });
    return circulos.map(conUbicacion);
  }

  async findOne(id: string) {
    const circulo = await this.prisma.circuloInfantil.findUnique({
      where: { id },
      include: {
        capacidades: {
          orderBy: { anioVida: 'asc' },
        },
        matriculas: {
          include: { solicitud: { include: { nino: true } } },
          orderBy: { fechaOtorgamiento: 'desc' },
        },
        ...UBICACION,
      },
    });
    return circulo ? conUbicacion(circulo) : null;
  }

  async findByMunicipio(municipio: string) {
    const circulos = await this.prisma.circuloInfantil.findMany({
      where: {
        municipioRel: {
          nombre: { contains: municipio, mode: 'insensitive' },
        },
        activo: true,
      },
      include: {
        capacidades: { where: { cuposDisponibles: { gt: 0 } } },
        ...UBICACION,
      },
    });
    return circulos.map(conUbicacion);
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
      where: { circuloId, estado: 'ACTIVA' },
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

    const campos = {
      ...this.camposCirculo(data),
      ...(await this.idsUbicacion(data)),
    };
    const final = {
      id,
      capacidadTotal: data.capacidadTotal ?? circulo.capacidadTotal,
      tieneSextoAnio: data.tieneSextoAnio ?? circulo.tieneSextoAnio,
    };

    // Círculo y capacidades se guardan juntos o no se guarda nada
    const actualizado = await this.prisma.$transaction(async (tx) => {
      const actuales = await tx.capacidadCirculo.findMany({
        where: { circuloId: id },
      });
      await this.sincronizarCapacidades(
        tx,
        final,
        actuales,
        data.capacidades,
        data.capacidades !== undefined ||
          final.capacidadTotal !== circulo.capacidadTotal,
      );
      return tx.circuloInfantil.update({
        where: { id },
        data: campos,
        include: {
          capacidades: { orderBy: { anioVida: 'asc' } },
          ...UBICACION,
        },
      });
    });
    return conUbicacion(actualizado);
  }

  async toggleActivo(id: string, activo: boolean) {
    if (typeof activo !== 'boolean') {
      throw new BadRequestException('El campo "activo" debe ser true o false');
    }
    const circulo = await this.prisma.circuloInfantil.findUnique({
      where: { id },
    });
    if (!circulo)
      throw new NotFoundException(`Círculo con ID ${id} no encontrado`);
    const actualizado = await this.prisma.circuloInfantil.update({
      where: { id },
      data: { activo },
      include: UBICACION,
    });
    return conUbicacion(actualizado);
  }

  /**
   * Solo se borra un círculo sin historia. Borrarlo con datos haría que la
   * base eliminara en cascada matrículas y el perfil del director, dejara
   * solicitudes sin círculo o fallara por los traslados; en esos casos se
   * pide desactivarlo, que conserva todo y deja de ofrecerlo.
   * Las capacidades por año son configuración y se borran con el círculo.
   */
  async remove(id: string) {
    const circulo = await this.prisma.circuloInfantil.findUnique({
      where: { id },
      include: {
        director: { select: { id: true } },
        _count: {
          select: {
            matriculas: true,
            solicitudes: true,
            trasladosOrigen: true,
            trasladosDestino: true,
          },
        },
      },
    });
    if (!circulo)
      throw new NotFoundException(`Círculo con ID ${id} no encontrado`);

    const { matriculas, solicitudes, trasladosOrigen, trasladosDestino } =
      circulo._count;
    const traslados = trasladosOrigen + trasladosDestino;
    const motivos = [
      matriculas > 0 && `${matriculas} matrícula(s)`,
      solicitudes > 0 && `${solicitudes} solicitud(es)`,
      traslados > 0 && `${traslados} traslado(s)`,
      circulo.director && 'un director asignado',
    ].filter(Boolean) as string[];

    if (motivos.length > 0) {
      const lista =
        motivos.length > 1
          ? `${motivos.slice(0, -1).join(', ')} y ${motivos.at(-1)}`
          : motivos[0];
      throw new ConflictException(
        `No se puede eliminar "${circulo.nombre}" porque tiene ${lista}. ` +
          'Desactívelo para que deje de recibir solicitudes sin perder su historial',
      );
    }

    await this.prisma.$transaction([
      this.prisma.capacidadCirculo.deleteMany({ where: { circuloId: id } }),
      this.prisma.circuloInfantil.delete({ where: { id } }),
    ]);
    return { message: `Círculo "${circulo.nombre}" eliminado` };
  }
}
