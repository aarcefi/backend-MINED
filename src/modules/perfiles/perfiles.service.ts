/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePerfilSolicitanteDto } from './perfil-solicitante/dto/create-perfil-solicitante.dto';
import { CreatePerfilFuncionarioDto } from './perfil-funcionario/dto/create-perfil-funcionario.dto';
import { CreatePerfilComisionDto } from './perfil-comision/dto/create-perfil-comision.dto';
import { CreatePerfilDirectorDto } from './perfil-director/create-perfil-director.dto';
import { EstadoSolicitud, RolUsuario } from '@prisma/client';
import { CirculoInfantilService } from '../circulo-infantil/circulo-infantil.service';
import { UsuariosService } from '../usuario/usuarios.service';
import { ConfigurarPrioridadDto } from './perfil-comision/dto/configurar-prioridad.dto';

@Injectable()
export class PerfilesService {
  constructor(
    private prisma: PrismaService,
    private circuloService: CirculoInfantilService,
    @Inject(forwardRef(() => UsuariosService))
    private usuariosService: UsuariosService,
  ) {}
  // PERFIL SOLICITANTE
  async createPerfilSolicitante(
    usuarioId: string,
    createDto: CreatePerfilSolicitanteDto,
  ) {
    // Verificar que el usuario existe y es solicitante
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (usuario.rol !== RolUsuario.SOLICITANTE) {
      throw new NotFoundException('El usuario no tiene rol de solicitante');
    }

    return this.prisma.perfilSolicitante.create({
      data: {
        usuarioId,
        ...createDto,
      },
      include: {
        usuario: true,
        hijos: true,
        solicitudes: true,
      },
    });
  }

  async findPerfilSolicitanteByUsuarioId(usuarioId: string) {
    const perfil = await this.prisma.perfilSolicitante.findUnique({
      where: { usuarioId },
      include: {
        usuario: {
          include: {
            notificaciones: {
              orderBy: { fecha: 'desc' },
            },
          },
        },
        hijos: true,
        solicitudes: {
          include: {
            nino: true,
            periodo: true,
            matricula: true,
          },
        },
      },
    });

    if (!perfil) {
      throw new NotFoundException('Perfil de solicitante no encontrado');
    }

    return perfil;
  }

  // PERFIL FUNCIONARIO
  async createPerfilFuncionario(
    usuarioId: string,
    createDto: CreatePerfilFuncionarioDto,
  ) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (usuario.rol !== RolUsuario.FUNCIONARIO_MUNICIPAL) {
      throw new NotFoundException('El usuario no tiene rol de funcionario');
    }

    return this.prisma.perfilFuncionario.create({
      data: {
        usuarioId,
        ...createDto,
      },
      include: {
        usuario: true,
      },
    });
  }

  async findPerfilFuncionarioByUsuarioId(usuarioId: string) {
    const perfil = await this.prisma.perfilFuncionario.findUnique({
      where: { usuarioId },
      include: {
        usuario: {
          include: {
            notificaciones: {
              orderBy: { fecha: 'desc' },
            },
          },
        },
        documentosVal: true,
        controles: true,
      },
    });

    if (!perfil) {
      throw new NotFoundException('Perfil de funcionario no encontrado');
    }

    return perfil;
  }

  async findFuncionariosByMunicipio(municipio: string) {
    const usuarios = await this.prisma.usuario.findMany({
      where: {
        rol: RolUsuario.FUNCIONARIO_MUNICIPAL,
        municipioRel: {
          nombre: { contains: municipio, mode: 'insensitive' },
        },
      },
      include: {
        perfilFuncionario: {
          include: { documentosVal: true, controles: true },
        },
        municipioRel: true,
        provinciaRel: true,
      },
    });

    return usuarios.map((usuario) => ({
      ...usuario.perfilFuncionario,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        carnetIdentidad: usuario.carnetIdentidad,
        telefono: usuario.telefono,
        municipio: usuario.municipioRel?.nombre ?? null,
        provincia: usuario.provinciaRel?.nombre ?? null,
      },
    }));
  }

  // PERFIL COMISIÓN
  async createPerfilComision(
    usuarioId: string,
    createDto: CreatePerfilComisionDto,
  ) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (usuario.rol !== RolUsuario.COMISION_OTORGAMIENTO) {
      throw new NotFoundException('El usuario no tiene rol de comisión');
    }

    return this.prisma.perfilComision.create({
      data: {
        usuarioId,
        ...createDto,
      },
      include: {
        usuario: true,
      },
    });
  }

  async findPerfilComisionByUsuarioId(usuarioId: string) {
    const perfil = await this.prisma.perfilComision.findUnique({
      where: { usuarioId },
      include: {
        usuario: {
          include: {
            notificaciones: {
              orderBy: { fecha: 'desc' },
            },
          },
        },
        decisiones: {
          include: {
            solicitud: true,
            sesion: true,
          },
        },
      },
    });

    if (!perfil) {
      throw new NotFoundException('Perfil de comisión no encontrado');
    }

    return perfil;
  }

  async findComisionByMunicipio(municipio: string) {
    const usuarios = await this.prisma.usuario.findMany({
      where: {
        rol: RolUsuario.COMISION_OTORGAMIENTO,
        municipioRel: {
          nombre: { contains: municipio, mode: 'insensitive' },
        },
      },
      include: {
        perfilComision: { include: { decisiones: true } },
        municipioRel: true,
        provinciaRel: true,
      },
    });

    return usuarios.map((usuario) => ({
      ...usuario.perfilComision,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        carnetIdentidad: usuario.carnetIdentidad,
        telefono: usuario.telefono,
        municipio: usuario.municipioRel?.nombre ?? null,
        provincia: usuario.provinciaRel?.nombre ?? null,
      },
    }));
  }

  async getEstadisticasComision(
    usuarioId: string,
    fechaDesde?: Date,
    fechaHasta?: Date,
  ) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { perfilComision: true, municipioRel: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (usuario.rol !== RolUsuario.COMISION_OTORGAMIENTO) {
      throw new NotFoundException(
        'El usuario no tiene rol de comisión de otorgamiento',
      );
    }
    if (!usuario.perfilComision) {
      throw new NotFoundException('Perfil de comisión no encontrado');
    }

    const where: any = {
      estado: EstadoSolicitud.APROBADA_COMISION,
      circulo: {
        is: {
          municipioRel: {
            nombre: {
              contains: usuario.municipioRel?.nombre ?? '',
              mode: 'insensitive',
            },
          },
        },
      },
      matricula: { isNot: null },
    };

    if (fechaDesde || fechaHasta) {
      where.matricula = {
        is: {
          fechaOtorgamiento: {
            ...(fechaDesde && { gte: fechaDesde }),
            ...(fechaHasta && { lte: fechaHasta }),
          },
        },
      };
    }

    const total = await this.prisma.solicitud.count({ where });
    const grupos = await this.prisma.solicitud.groupBy({
      by: ['sector'],
      where,
      _count: { _all: true },
    });

    const porSector: Record<string, number> = {};
    grupos.forEach((g) => {
      porSector[g.sector] = g._count._all;
    });

    const porcentajes: Record<string, number> = {};
    Object.keys(porSector).forEach((sector) => {
      porcentajes[sector] =
        total > 0 ? Number(((porSector[sector] / total) * 100).toFixed(2)) : 0;
    });

    return {
      municipio: usuario.municipioRel?.nombre ?? null,
      comisionId: usuario.perfilComision.id,
      comisionNombre: `${usuario.nombre} ${usuario.apellidos}`,
      totalSolicitudesAprobadas: total,
      porSector,
      porcentajes,
    };
  }

  async configurarPrioridadComision(
    usuarioId: string,
    dto: ConfigurarPrioridadDto,
  ) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { perfilComision: true },
    });
    if (!usuario || usuario.rol !== RolUsuario.COMISION_OTORGAMIENTO) {
      throw new ForbiddenException(
        'Solo la comisión puede configurar prioridades',
      );
    }
    if (!usuario.perfilComision) {
      throw new NotFoundException('Perfil de comisión no encontrado');
    }

    const sectores = [
      dto.sectorPrioritario1,
      dto.sectorPrioritario2,
      dto.sectorPrioritario3,
    ].filter(Boolean) as string[];
    if (new Set(sectores).size !== sectores.length) {
      throw new BadRequestException('Los 3 sectores deben ser distintos');
    }

    const periodo = await this.prisma.periodoOtorgamiento.findUnique({
      where: { id: dto.periodoId },
    });
    if (!periodo) throw new NotFoundException('Período no encontrado');

    return this.prisma.configuracionPrioridadComision.upsert({
      where: {
        comisionId_periodoId: {
          comisionId: usuario.perfilComision.id,
          periodoId: dto.periodoId,
        },
      },
      create: {
        comisionId: usuario.perfilComision.id,
        periodoId: dto.periodoId,
        sectorPrioritario1: dto.sectorPrioritario1,
        sectorPrioritario2: dto.sectorPrioritario2 ?? null,
        sectorPrioritario3: dto.sectorPrioritario3 ?? null,
      },
      update: {
        sectorPrioritario1: dto.sectorPrioritario1,
        sectorPrioritario2: dto.sectorPrioritario2 ?? null,
        sectorPrioritario3: dto.sectorPrioritario3 ?? null,
      },
    });
  }

  async obtenerPrioridadComision(usuarioId: string, periodoId?: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { perfilComision: true },
    });
    if (!usuario?.perfilComision) {
      throw new NotFoundException('Perfil de comisión no encontrado');
    }

    if (periodoId) {
      return this.prisma.configuracionPrioridadComision.findUnique({
        where: {
          comisionId_periodoId: {
            comisionId: usuario.perfilComision.id,
            periodoId,
          },
        },
      });
    }
    return this.prisma.configuracionPrioridadComision.findMany({
      where: { comisionId: usuario.perfilComision.id },
      include: { periodo: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // PERFIL DIRECTOR
  async createPerfilDirector(
    usuarioId: string,
    createDto: CreatePerfilDirectorDto,
  ) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (usuario.rol !== RolUsuario.DIRECTOR_CIRCULO) {
      throw new NotFoundException('El usuario no tiene rol de director');
    }

    // Verificar que el círculo existe
    const circulo = await this.circuloService.findOne(createDto.circuloId);
    if (!circulo) {
      throw new NotFoundException('Círculo infantil no encontrado');
    }

    // Verificar que el círculo no tenga ya un director
    const directorExistente = await this.prisma.perfilDirector.findUnique({
      where: { circuloId: createDto.circuloId },
    });
    if (directorExistente) {
      throw new ConflictException('El círculo ya tiene un director asignado');
    }

    return this.prisma.perfilDirector.create({
      data: {
        usuarioId,
        circuloId: createDto.circuloId,
      },
      include: {
        usuario: true,
        circulo: true,
      },
    });
  }

  async findPerfilDirectorByUsuarioId(usuarioId: string) {
    const perfil = await this.prisma.perfilDirector.findUnique({
      where: { usuarioId },
      include: {
        usuario: {
          include: {
            notificaciones: {
              orderBy: { fecha: 'desc' },
            },
          },
        },
        circulo: true,
      },
    });

    if (!perfil) {
      throw new NotFoundException('Perfil de director no encontrado');
    }

    return perfil;
  }

  async findPerfilDirectorByCirculoId(circuloId: string) {
    const perfil = await this.prisma.perfilDirector.findUnique({
      where: { circuloId },
      include: {
        usuario: {
          include: {
            notificaciones: {
              orderBy: { fecha: 'desc' },
            },
          },
        },
        circulo: true,
      },
    });

    if (!perfil) {
      throw new NotFoundException('No hay director asignado a ese círculo');
    }

    return perfil;
  }

  async findDirectoresByMunicipio(municipio: string) {
    const usuarios = await this.prisma.usuario.findMany({
      where: {
        rol: RolUsuario.DIRECTOR_CIRCULO,
        municipioRel: {
          nombre: { contains: municipio, mode: 'insensitive' },
        },
      },
      include: {
        perfilDirector: {
          include: {
            circulo: true,
          },
        },
        municipioRel: true,
        provinciaRel: true,
      },
    });

    return usuarios.map((usuario) => ({
      ...usuario.perfilDirector,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        apellidos: usuario.apellidos,
        carnetIdentidad: usuario.carnetIdentidad,
        telefono: usuario.telefono,
        municipio: usuario.municipioRel?.nombre ?? null,
        provincia: usuario.provinciaRel?.nombre ?? null,
      },
    }));
  }

  async findPerfilByUsuarioId(usuarioId: string) {
    const usuario = await this.usuariosService.getProfile(usuarioId);
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const baseUser = {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      carnetIdentidad: usuario.carnetIdentidad,
      telefono: usuario.telefono,
      municipio: usuario.municipioRel?.nombre ?? null,
      provincia: usuario.provinciaRel?.nombre ?? null,
    };

    if (usuario.perfilSolicitante) {
      return {
        ...usuario.perfilSolicitante,
        usuario: baseUser,
        notificaciones: usuario.notificaciones,
      };
    }

    if (usuario.perfilFuncionario) {
      return {
        ...usuario.perfilFuncionario,
        usuario: baseUser,
        notificaciones: usuario.notificaciones,
      };
    }

    if (usuario.perfilComision) {
      return {
        ...usuario.perfilComision,
        usuario: baseUser,
        notificaciones: usuario.notificaciones,
      };
    }

    if (usuario.perfilDirector) {
      return {
        ...usuario.perfilDirector,
        usuario: baseUser,
        notificaciones: usuario.notificaciones,
      };
    }

    return null;
  }
}
