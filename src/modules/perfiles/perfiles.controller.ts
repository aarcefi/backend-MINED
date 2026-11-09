/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Param,
  UseGuards,
  Query,
  Post,
  Body,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { PerfilesService } from './perfiles.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolUsuario } from '@prisma/client';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { ConfigurarPrioridadDto } from './perfil-comision/dto/configurar-prioridad.dto';

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

  @Get('comision/estadisticas')
  @Roles(RolUsuario.COMISION_OTORGAMIENTO)
  @ApiOperation({
    summary:
      'Estadísticas de solicitudes aprobadas por comisión, agrupadas por sector. Solo para el usuario autenticado.',
  })
  @ApiQuery({
    name: 'fechaDesde',
    required: false,
    description: 'Filtrar desde fecha de otorgamiento (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'fechaHasta',
    required: false,
    description: 'Filtrar hasta fecha de otorgamiento (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de solicitudes aprobadas por sector',
    schema: {
      example: {
        municipio: 'Plaza',
        comisionId: 'a1b2c3d4-a1b2-4a1b-8c3d-a1b2c3d4e5f6',
        comisionNombre: 'Carlos Rodríguez',
        totalSolicitudesAprobadas: 45,
        porSector: {
          SALUD: 10,
          EDUCACION: 15,
          DEFENSA: 5,
          CASO_SOCIAL: 12,
          OTRO: 3,
        },
        porcentajes: {
          SALUD: 22.22,
          EDUCACION: 33.33,
          DEFENSA: 11.11,
          CASO_SOCIAL: 26.67,
          OTRO: 6.67,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuario o perfil no encontrado' })
  @ApiResponse({
    status: 403,
    description: 'El usuario no es comisión de otorgamiento',
  })
  getEstadisticasComision(
    @GetUser() usuario: any,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.perfilesService.getEstadisticasComision(
      usuario.id,
      fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta ? new Date(fechaHasta) : undefined,
    );
  }

  @Post('comision/prioridad')
  @Roles(RolUsuario.COMISION_OTORGAMIENTO)
  @ApiOperation({
    summary: 'Configurar los 3 sectores prioritarios y recalcular solicitudes',
  })
  @ApiBody({ type: ConfigurarPrioridadDto })
  @ApiResponse({
    status: 200,
    description: 'Configuración guardada y solicitudes recalculadas',
    schema: {
      example: {
        configuracion: {
          id: '...',
          sectorPrioritario1: 'SALUD',
          sectorPrioritario2: 'EDUCACION',
          sectorPrioritario3: 'DEFENSA',
          periodoId: '...',
          comisionId: '...',
        },
        recalculo: {
          solicitudesActualizadas: 42,
          solicitudesSinCambio: 8,
          totalEvaluadas: 50,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Sectores duplicados o inválidos' })
  @ApiResponse({
    status: 403,
    description: 'Solo la comisión puede configurar',
  })
  configurarPrioridad(@Request() req, @Body() dto: ConfigurarPrioridadDto) {
    return this.perfilesService.configurarPrioridadComision(req.user.id, dto);
  }

  @Get('comision/:usuarioId/estadisticas') //Solo para Admins
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({
    summary:
      'Estadísticas de solicitudes aprobadas por comisión, agrupadas por sector. Solo para admins.',
  })
  @ApiQuery({
    name: 'usuarioId',
    required: true,
    description: 'Id del usuario de la comisión de otorgamiento',
  })
  @ApiQuery({
    name: 'fechaDesde',
    required: false,
    description: 'Filtrar desde fecha de otorgamiento (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'fechaHasta',
    required: false,
    description: 'Filtrar hasta fecha de otorgamiento (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas de solicitudes aprobadas por sector',
    schema: {
      example: {
        municipio: 'Plaza',
        comisionId: 'a1b2c3d4-a1b2-4a1b-8c3d-a1b2c3d4e5f6',
        comisionNombre: 'Carlos Rodríguez',
        totalSolicitudesAprobadas: 45,
        porSector: {
          SALUD: 10,
          EDUCACION: 15,
          DEFENSA: 5,
          CASO_SOCIAL: 12,
          OTRO: 3,
        },
        porcentajes: {
          SALUD: 22.22,
          EDUCACION: 33.33,
          DEFENSA: 11.11,
          CASO_SOCIAL: 26.67,
          OTRO: 6.67,
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Usuario o perfil no encontrado' })
  @ApiResponse({
    status: 403,
    description: 'El usuario no es comisión de otorgamiento',
  })
  async getEstadisticasComisionPorAdmin(
    @Param('usuarioId') usuarioId: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.perfilesService.getEstadisticasComision(
      usuarioId,
      fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta ? new Date(fechaHasta) : undefined,
    );
  }

  // PERFILES DIRECTOR
  @Get('director/usuario/:usuarioId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener perfil de director por usuario ID' })
  getPerfilDirector(@Param('usuarioId') usuarioId: string) {
    return this.perfilesService.findPerfilDirectorByUsuarioId(usuarioId);
  }

  @Get('director/circulo/:circuloId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener perfil de director por círculo ID' })
  getPerfilDirectorByCirculo(@Param('circuloId') circuloId: string) {
    return this.perfilesService.findPerfilDirectorByCirculoId(circuloId);
  }

  @Get('director/municipio')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Buscar directores por municipio' })
  @ApiQuery({ name: 'municipio', required: true })
  getDirectoresByMunicipio(@Query('municipio') municipio: string) {
    return this.perfilesService.findDirectoresByMunicipio(municipio);
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
