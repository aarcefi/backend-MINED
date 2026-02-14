/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePerfilSolicitanteDto } from './perfil-solicitante/dto/create-perfil-solicitante.dto';
import { CreatePerfilFuncionarioDto } from './perfil-funcionario/dto/create-perfil-funcionario.dto';
import { CreatePerfilComisionDto } from './perfil-comision/dto/create-perfil-comision.dto';

@Injectable()
export class PerfilesService {
  constructor(private prisma: PrismaService) {}

  // PERFIL SOLICITANTE
  async createPerfilSolicitante(
    usuarioId: string,
    createDto: CreatePerfilSolicitanteDto,
  ) {
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
    return this.prisma.perfilSolicitante.findUnique({
      where: { usuarioId },
      include: {
        usuario: {
          include: {
            trazas: {
              orderBy: {
                fecha: 'desc',
              },
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
  }

  // PERFIL FUNCIONARIO
  async createPerfilFuncionario(
    usuarioId: string,
    createDto: CreatePerfilFuncionarioDto,
  ) {
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
    return this.prisma.perfilFuncionario.findUnique({
      where: { usuarioId },
      include: {
        usuario: {
          include: {
            trazas: {
              orderBy: {
                fecha: 'desc',
              },
            },
          },
        },
        documentosVal: true,
        controles: true,
      },
    });
  }

  async findFuncionariosByMunicipio(municipio: string) {
    return this.prisma.perfilFuncionario.findMany({
      where: { municipio },
      include: {
        usuario: {
          include: {
            trazas: {
              orderBy: { fecha: 'desc' },
            },
          },
        },
      },
    });
  }

  // PERFIL COMISIÓN
  async createPerfilComision(
    usuarioId: string,
    createDto: CreatePerfilComisionDto,
  ) {
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
    return this.prisma.perfilComision.findUnique({
      where: { usuarioId },
      include: {
        usuario: {
          include: {
            trazas: {
              orderBy: {
                fecha: 'desc',
              },
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
  }

  async findComisionByMunicipio(municipio: string) {
    return this.prisma.perfilComision.findMany({
      where: { municipio },
      include: {
        usuario: {
          include: {
            trazas: {
              orderBy: { fecha: 'desc' },
            },
          },
        },
        decisiones: true,
      },
    });
  }

  // MÉTODOS GENERALES
  async findPerfilByUsuarioId(usuarioId: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: {
        perfilSolicitante: true,
        perfilFuncionario: true,
        perfilComision: true,
        trazas: {
          orderBy: { fecha: 'desc' },
        },
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Se retorna el perfil correspondiente; las trazas están disponibles en usuario.trazas
    return (
      usuario.perfilSolicitante ||
      usuario.perfilFuncionario ||
      usuario.perfilComision
    );
  }
}
