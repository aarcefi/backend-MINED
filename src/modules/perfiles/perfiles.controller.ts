import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { PerfilesService } from './perfiles.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';

@ApiTags('Perfiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('perfiles')
export class PerfilesController {
  constructor(private readonly perfilesService: PerfilesService) {}

  // PERFILES SOLICITANTES
  @Get('solicitantes/usuario/:usuarioId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener perfil de solicitante por usuario ID' })
  getPerfilSolicitante(@Param('usuarioId') usuarioId: string) {
    return this.perfilesService.findPerfilSolicitanteByUsuarioId(usuarioId);
  }

  // PERFILES FUNCIONARIOS
  @Get('funcionarios/usuario/:usuarioId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Obtener perfil de funcionario por usuario ID' })
  getPerfilFuncionario(@Param('usuarioId') usuarioId: string) {
    return this.perfilesService.findPerfilFuncionarioByUsuarioId(usuarioId);
  }

  @Get('funcionarios/municipio')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Buscar funcionarios por municipio' })
  @ApiQuery({ name: 'municipio', required: true })
  getFuncionariosByMunicipio(@Query('municipio') municipio: string) {
    return this.perfilesService.findFuncionariosByMunicipio(municipio);
  }

  // PERFILES COMISIÓN
  @Get('comision/usuario/:usuarioId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COMISION_OTORGAMIENTO)
  @ApiOperation({ summary: 'Obtener perfil de comisión por usuario ID' })
  getPerfilComision(@Param('usuarioId') usuarioId: string) {
    return this.perfilesService.findPerfilComisionByUsuarioId(usuarioId);
  }

  @Get('comision/municipio')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COMISION_OTORGAMIENTO)
  @ApiOperation({ summary: 'Buscar miembros de comisión por municipio' })
  @ApiQuery({ name: 'municipio', required: true })
  getComisionByMunicipio(@Query('municipio') municipio: string) {
    return this.perfilesService.findComisionByMunicipio(municipio);
  }

  // GENERAL
  @Get('usuario/:usuarioId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener perfil por usuario ID (según su rol)' })
  getPerfilByUsuarioId(@Param('usuarioId') usuarioId: string) {
    return this.perfilesService.findPerfilByUsuarioId(usuarioId);
  }
}
