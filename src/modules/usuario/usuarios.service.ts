/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import * as bcrypt from 'bcrypt';
import { RolUsuario } from '@prisma/client';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UsuarioResponseDto } from './dto/usuario-response.dto';
import { CreatePerfilSolicitanteDto } from '../perfiles/perfil-solicitante/dto/create-perfil-solicitante.dto';
import { CreatePerfilFuncionarioDto } from '../perfiles/perfil-funcionario/dto/create-perfil-funcionario.dto';
import { CreatePerfilComisionDto } from '../perfiles/perfil-comision/dto/create-perfil-comision.dto';
import { CreatePerfilDirectorDto } from '../perfiles/perfil-director/create-perfil-director.dto';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async create(
    createUsuarioDto: CreateUsuarioDto,
  ): Promise<UsuarioResponseDto> {
    // Validaciones de email y carnet (como antes)

    const hashedPassword = await bcrypt.hash(createUsuarioDto.password, 10);

    // Usar transacción para crear usuario y perfil
    const usuario = await this.prisma.$transaction(async (prisma) => {
      // Crear usuario
      const newUser = await prisma.usuario.create({
        data: {
          email: createUsuarioDto.email,
          password: hashedPassword,
          rol: createUsuarioDto.rol,
          activo: createUsuarioDto.activo ?? true,
          nombre: createUsuarioDto.nombre,
          apellidos: createUsuarioDto.apellidos,
          carnetIdentidad: createUsuarioDto.carnetIdentidad,
          telefono: createUsuarioDto.telefono,
          municipio: createUsuarioDto.municipio,
          provincia: createUsuarioDto.provincia,
        },
      });

      // Crear perfil según el rol
      switch (createUsuarioDto.rol) {
        case RolUsuario.SOLICITANTE: {
          const solicitanteData =
            createUsuarioDto.perfil as CreatePerfilSolicitanteDto;
          await prisma.perfilSolicitante.create({
            data: {
              usuarioId: newUser.id,
              tipoPersona: solicitanteData.tipoPersona,
              cantHijos: solicitanteData.cantHijos ?? 1,
              direccion: solicitanteData.direccion,
              centroTrabajo: solicitanteData.centroTrabajo,
            },
          });
          break;
        }
        case RolUsuario.FUNCIONARIO_MUNICIPAL: {
          const funcionarioData =
            createUsuarioDto.perfil as CreatePerfilFuncionarioDto;
          await prisma.perfilFuncionario.create({
            data: {
              usuarioId: newUser.id,
              cargo: funcionarioData.cargo,
            },
          });
          break;
        }
        case RolUsuario.COMISION_OTORGAMIENTO: {
          const comisionData =
            createUsuarioDto.perfil as CreatePerfilComisionDto;
          await prisma.perfilComision.create({
            data: {
              usuarioId: newUser.id,
              cargo: comisionData.cargo,
            },
          });
          break;
        }
        case RolUsuario.DIRECTOR_CIRCULO: {
          const directorData =
            createUsuarioDto.perfil as CreatePerfilDirectorDto;
          // Verificar que el círculo existe y no tiene director
          const circulo = await prisma.circuloInfantil.findUnique({
            where: { id: directorData.circuloId },
          });
          if (!circulo) {
            throw new NotFoundException('Círculo no encontrado');
          }
          const directorExistente = await prisma.perfilDirector.findUnique({
            where: { circuloId: directorData.circuloId },
          });
          if (directorExistente) {
            throw new ConflictException('El círculo ya tiene un director');
          }
          await prisma.perfilDirector.create({
            data: {
              usuarioId: newUser.id,
              circuloId: directorData.circuloId,
            },
          });
          break;
        }
        // Otros roles (ADMINISTRADOR) no tienen perfil
      }

      // Retornar el usuario completo con perfiles
      return prisma.usuario.findUnique({
        where: { id: newUser.id },
        include: {
          perfilSolicitante: true,
          perfilFuncionario: true,
          perfilComision: true,
          perfilDirector: { include: { circulo: true } },
        },
      });
    });

    return this.toUsuarioResponseDto(usuario);
  }

  async findOne(id: string): Promise<UsuarioResponseDto> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: {
        perfilSolicitante: true,
        perfilFuncionario: true,
        perfilComision: true,
        perfilDirector: true,
        notificaciones: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return this.toUsuarioResponseDto(usuario);
  }

  async findByEmail(email: string): Promise<UsuarioResponseDto | null> {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: {
        perfilSolicitante: true,
        perfilFuncionario: true,
        perfilComision: true,
        perfilDirector: true,
      },
    });

    if (!usuario) {
      return null;
    }

    return this.toUsuarioResponseDto(usuario);
  }

  async findByRol(rol: RolUsuario): Promise<UsuarioResponseDto[]> {
    const usuarios = await this.prisma.usuario.findMany({
      where: { rol },
      include: {
        perfilSolicitante: true,
        perfilFuncionario: true,
        perfilComision: true,
        perfilDirector: true,
      },
    });

    return usuarios.map((usuario) => this.toUsuarioResponseDto(usuario));
  }

  async update(
    id: string,
    updateUsuarioDto: UpdateUsuarioDto,
  ): Promise<UsuarioResponseDto> {
    try {
      const usuario = await this.prisma.usuario.update({
        where: { id },
        data: updateUsuarioDto,
        include: {
          perfilSolicitante: true,
          perfilFuncionario: true,
          perfilComision: true,
          perfilDirector: true,
        },
      });

      return this.toUsuarioResponseDto(usuario);
    } catch (error) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
  }

  async updateEmail(id: string, email: string): Promise<{ message: string }> {
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuarioExistente) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const emailExistente = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (emailExistente && emailExistente.id !== id) {
      throw new ConflictException('El email ya está registrado');
    }

    await this.prisma.usuario.update({
      where: { id },
      data: { email },
    });

    return {
      message: `El email del usuario ${id} ha sido actualizado correctamente`,
    };
  }

  async remove(id: string) {
    try {
      await this.prisma.usuario.delete({
        where: { id },
      });

      return { message: `Usuario con ID ${id} eliminado exitosamente` };
    } catch (error) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
  }

  async toggleActivo(
    id: string,
    activo: boolean,
  ): Promise<{ message: string }> {
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuarioExistente) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    await this.prisma.usuario.update({
      where: { id },
      data: { activo },
    });

    const estado = activo ? 'activado' : 'desactivado';
    return { message: `Usuario ${id} ${estado} correctamente` };
  }

  async updateRefreshToken(
    id: string,
    refreshToken: string,
  ): Promise<{ message: string }> {
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuarioExistente) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    await this.prisma.usuario.update({
      where: { id },
      data: {
        refreshToken: hashedRefreshToken,
        tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
      },
    });

    return {
      message: `Refresh token del usuario ${id} actualizado correctamente`,
    };
  }

  async clearRefreshToken(id: string): Promise<{ message: string }> {
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuarioExistente) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    await this.prisma.usuario.update({
      where: { id },
      data: {
        refreshToken: null,
        tokenExpiry: null,
      },
    });

    return {
      message: `Refresh token del usuario ${id} limpiado correctamente`,
    };
  }

  async findAll(filtros?: {
    rol?: RolUsuario;
    activo?: boolean;
    email?: string;
    nombre?: string;
    municipio?: string;
  }): Promise<UsuarioResponseDto[]> {
    const where: any = {};

    if (filtros?.rol) where.rol = filtros.rol;
    if (filtros?.activo !== undefined) where.activo = filtros.activo;

    if (filtros?.email) {
      where.email = { contains: filtros.email, mode: 'insensitive' };
    }

    if (filtros?.nombre) {
      where.nombre = { contains: filtros.nombre, mode: 'insensitive' };
    }

    if (filtros?.municipio) {
      where.municipio = { contains: filtros.municipio, mode: 'insensitive' };
    }

    const usuarios = await this.prisma.usuario.findMany({
      where,
      include: {
        perfilSolicitante: true,
        perfilFuncionario: true,
        perfilComision: true,
        perfilDirector: true,
      },
    });

    return usuarios.map((usuario) => this.toUsuarioResponseDto(usuario));
  }

  private toUsuarioResponseDto(usuario: any): UsuarioResponseDto {
    return {
      id: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo,
      perfilSolicitante: usuario.perfilSolicitante,
      perfilFuncionario: usuario.perfilFuncionario,
      perfilComision: usuario.perfilComision,
      perfilDirector: usuario.perfilDirector,
    };
  }

  async getEstadisticas() {
    const usuarios = await this.prisma.usuario.findMany();

    const estadisticas = {
      ADMINISTRADOR: 0,
      SOLICITANTE: 0,
      FUNCIONARIO_MUNICIPAL: 0,
      COMISION_OTORGAMIENTO: 0,
      DIRECTOR_CIRCULO: 0,
    };

    usuarios.forEach((usuario) => {
      if (estadisticas[usuario.rol] !== undefined) {
        estadisticas[usuario.rol]++;
      }
    });

    const total = usuarios.length;

    return {
      total,
      estadisticas,
      porcentajes: {
        ADMINISTRADOR:
          total > 0 ? (estadisticas.ADMINISTRADOR / total) * 100 : 0,
        SOLICITANTE: total > 0 ? (estadisticas.SOLICITANTE / total) * 100 : 0,
        FUNCIONARIO_MUNICIPAL:
          total > 0 ? (estadisticas.FUNCIONARIO_MUNICIPAL / total) * 100 : 0,
        COMISION_OTORGAMIENTO:
          total > 0 ? (estadisticas.COMISION_OTORGAMIENTO / total) * 100 : 0,
        DIRECTOR_CIRCULO:
          total > 0 ? (estadisticas.DIRECTOR_CIRCULO / total) * 100 : 0,
      },
    };
  }
}
