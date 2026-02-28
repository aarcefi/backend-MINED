import {
  ConflictException,
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
import { RolUsuario } from '@prisma/client';
import { CirculoInfantilService } from '../circulo-infantil/circulo-infantil.service';
import { UsuariosService } from '../usuario/usuarios.service';

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
        municipio: { contains: municipio, mode: 'insensitive' },
      },
      include: {
        perfilFuncionario: {
          include: {
            documentosVal: true,
            controles: true,
          },
        },
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
        municipio: usuario.municipio,
        provincia: usuario.provincia,
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
        municipio: { contains: municipio, mode: 'insensitive' },
      },
      include: {
        perfilComision: {
          include: {
            decisiones: true,
          },
        },
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
        municipio: usuario.municipio,
        provincia: usuario.provincia,
      },
    }));
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
        municipio: { contains: municipio, mode: 'insensitive' },
      },
      include: {
        perfilDirector: {
          include: {
            circulo: true,
          },
        },
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
        municipio: usuario.municipio,
        provincia: usuario.provincia,
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
      municipio: usuario.municipio,
      provincia: usuario.provincia,
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
        ...usuario.perfilDirector, // incluye circulo gracias a getProfile
        usuario: baseUser,
        notificaciones: usuario.notificaciones,
      };
    }

    return null;
  }
}
