/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import * as bcrypt from 'bcrypt';
import { RolUsuario } from '@prisma/client';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  async create(createUsuarioDto: CreateUsuarioDto) {
    // Verificar si el email ya existe
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { email: createUsuarioDto.email },
    });

    if (usuarioExistente) {
      throw new ConflictException('El email ya está registrado');
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(createUsuarioDto.password, 10);

    const usuario = await this.prisma.usuario.create({
      data: {
        ...createUsuarioDto,
        password: hashedPassword,
      },
      include: {
        perfilSolicitante: true,
        perfilFuncionario: true,
        perfilComision: true,
      },
    });

    const { password, ...result } = usuario;
    return result;
  }

  async findOne(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      include: {
        perfilSolicitante: true,
        perfilFuncionario: true,
        perfilComision: true,
        notificaciones: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    const { password, ...result } = usuario;
    return result;
  }

  async findByEmail(email: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
      include: {
        perfilSolicitante: true,
        perfilFuncionario: true,
        perfilComision: true,
      },
    });

    if (!usuario) {
      return null;
    }

    return usuario;
  }

  async findByRol(rol: RolUsuario) {
    const usuario = await this.prisma.usuario.findMany({
      where: { rol },
      include: {
        perfilSolicitante: true,
        perfilFuncionario: true,
        perfilComision: true,
      },
    });

    if (!usuario) {
      return null;
    }

    return usuario;
  }

  async update(id: string, updateUsuarioDto: UpdateUsuarioDto) {
    // Si se actualiza la contraseña, encriptarla
    if (updateUsuarioDto.password) {
      updateUsuarioDto.password = await bcrypt.hash(
        updateUsuarioDto.password,
        10,
      );
    }

    try {
      const usuario = await this.prisma.usuario.update({
        where: { id },
        data: updateUsuarioDto,
        include: {
          perfilSolicitante: true,
          perfilFuncionario: true,
          perfilComision: true,
        },
      });

      const { password, ...result } = usuario;
      return result;
    } catch (error) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
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

  async updateRefreshToken(id: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    return this.prisma.usuario.update({
      where: { id },
      data: {
        refreshToken: hashedRefreshToken,
        tokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días
      },
    });
  }

  async clearRefreshToken(id: string) {
    return this.prisma.usuario.update({
      where: { id },
      data: {
        refreshToken: null,
        tokenExpiry: null,
      },
    });
  }

  async findAll(filtros?: {
    rol?: RolUsuario;
    activo?: boolean;
    email?: string;
    nombre?: string;
    municipio?: string;
  }) {
    const where: any = {};

    if (filtros?.rol) {
      where.rol = filtros.rol;
    }

    if (filtros?.activo !== undefined) {
      where.activo = filtros.activo;
    }

    if (filtros?.email) {
      where.email = {
        contains: filtros.email,
        mode: 'insensitive',
      };
    }

    if (filtros?.nombre) {
      where.OR = [
        {
          perfilSolicitante: {
            nombre: {
              contains: filtros.nombre,
              mode: 'insensitive',
            },
          },
        },
        {
          perfilFuncionario: {
            nombre: {
              contains: filtros.nombre,
              mode: 'insensitive',
            },
          },
        },
        {
          perfilComision: {
            nombre: {
              contains: filtros.nombre,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    if (filtros?.municipio) {
      where.OR = [
        {
          perfilSolicitante: {
            municipio: {
              contains: filtros.municipio,
              mode: 'insensitive',
            },
          },
        },
        {
          perfilFuncionario: {
            municipio: {
              contains: filtros.municipio,
              mode: 'insensitive',
            },
          },
        },
        {
          perfilComision: {
            municipio: {
              contains: filtros.municipio,
              mode: 'insensitive',
            },
          },
        },
      ];
    }

    const usuarios = await this.prisma.usuario.findMany({
      where,
      include: {
        perfilSolicitante: true,
        perfilFuncionario: true,
        perfilComision: true,
      },
    });

    return usuarios.map((usuario) => {
      const { password, ...result } = usuario;
      return result;
    });
  }
}
