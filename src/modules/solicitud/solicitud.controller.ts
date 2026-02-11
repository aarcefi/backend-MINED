/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import {
  RolUsuario,
  EstadoSolicitud,
  SectorPrioridad,
  TipoSolicitud,
} from '../../common/index';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SolicitudService } from './solicitud.service';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { UpdateSolicitudDto } from './dto/update-solicitud.dto';
import { SolicitudResponseDto } from './dto/solicitud-response.dto';
import { SolicitudListResponseDto } from './dto/solicitud-list-response.dto';
import { UpdateNinoDto } from '../nino/index';

@ApiTags('Solicitudes')
@ApiBearerAuth()
@Controller('solicitud')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SolicitudController {
  constructor(private readonly solicitudService: SolicitudService) {}

  @Post()
  @Roles(RolUsuario.SOLICITANTE, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Crear nueva solicitud' })
  @ApiResponse({ status: 201, description: 'Solicitud creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({
    status: 404,
    description: 'Tutor no encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'El niño ya tiene una solicitud activa en este período',
  })
  create(@Request() req, @Body() dto: CreateSolicitudDto) {
    return this.solicitudService.create(dto, req.user);
  }

  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener todas las solicitudes' })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: EstadoSolicitud,
    description: 'Filtrar por estado',
  })
  @ApiQuery({
    name: 'sector',
    required: false,
    enum: SectorPrioridad,
    description: 'Filtrar por sector',
  })
  @ApiQuery({
    name: 'tipoSolicitud',
    required: false,
    enum: TipoSolicitud,
    description: 'Filtrar por tipo',
  })
  @ApiQuery({
    name: 'periodoId',
    required: false,
    description: 'Filtrar por período',
  })
  @ApiQuery({
    name: 'solicitanteId',
    required: false,
    description: 'Filtrar por solicitante',
  })
  @ApiQuery({
    name: 'ninoId',
    required: false,
    description: 'Filtrar por niño',
  })
  @ApiQuery({
    name: 'municipio',
    required: false,
    description: 'Filtrar por municipio',
  })
  @ApiQuery({
    name: 'fechaDesde',
    required: false,
    description: 'Filtrar desde fecha (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'fechaHasta',
    required: false,
    description: 'Filtrar hasta fecha (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitudes',
    type: [SolicitudListResponseDto],
  })
  findAll(
    @Request() req,
    @Query('estado') estado?: EstadoSolicitud,
    @Query('sector') sector?: SectorPrioridad,
    @Query('tipoSolicitud') tipoSolicitud?: TipoSolicitud,
    @Query('periodoId') periodoId?: string,
    @Query('solicitanteId') solicitanteId?: string,
    @Query('ninoId') ninoId?: string,
    @Query('municipio') municipio?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    // Si es solicitante, solo ver sus propias solicitudes
    if (req.user.rol === RolUsuario.SOLICITANTE) {
      if (!req.user.perfilId) {
        throw new UnauthorizedException('Perfil de solicitante no encontrado');
      }
      solicitanteId = req.user.perfilId;
    }

    // Si es director de círculo, filtrar por su municipio
    if (req.user.rol === RolUsuario.DIRECTOR_CIRCULO && req.user.perfil) {
      municipio = req.user.perfil.municipio;
    }

    return this.solicitudService.findAll(
      {
        estado,
        sector,
        tipoSolicitud,
        periodoId,
        solicitanteId,
        ninoId,
        municipio,
        fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
        fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
      },
      req.user,
    );
  }

  @Get('pendientes-revision')
  @Roles(
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener solicitudes pendientes de revisión' })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitudes pendientes de revisión',
    type: [SolicitudListResponseDto],
  })
  findPendientesRevision(@Request() req) {
    // Filtrar por municipio si es director de círculo
    const municipio =
      req.user.rol === RolUsuario.DIRECTOR_CIRCULO
        ? req.user.perfil?.municipio
        : undefined;

    return this.solicitudService.findPendientesRevision(municipio);
  }

  @Get('solicitante/:solicitanteId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.SOLICITANTE,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener solicitudes por solicitante' })
  @ApiParam({ name: 'solicitanteId', description: 'ID del solicitante' })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitudes del solicitante',
    type: [SolicitudListResponseDto],
  })
  findBySolicitanteId(
    @Request() req,
    @Param('solicitanteId', ParseUUIDPipe) solicitanteId: string,
  ) {
    // Si es solicitante, solo puede ver sus propias solicitudes
    if (req.user.rol === RolUsuario.SOLICITANTE) {
      if (!req.user.perfilId) {
        throw new UnauthorizedException('Perfil de solicitante no encontrado');
      }
      solicitanteId = req.user.perfilId;
    }
    return this.solicitudService.findBySolicitanteId(solicitanteId);
  }

  @Get('nino/:ninoId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.SOLICITANTE,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener solicitudes por niño' })
  @ApiParam({ name: 'ninoId', description: 'ID del niño' })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitudes del niño',
    type: [SolicitudListResponseDto],
  })
  findByNinoId(@Request() req, @Param('ninoId', ParseUUIDPipe) ninoId: string) {
    return this.solicitudService.findByNinoId(ninoId, req.user);
  }

  @Get('estadisticas')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener estadísticas de solicitudes' })
  @ApiQuery({
    name: 'periodoId',
    required: false,
    description: 'Filtrar por período',
  })
  @ApiQuery({
    name: 'municipio',
    required: false,
    description: 'Filtrar por municipio',
  })
  @ApiResponse({ status: 200, description: 'Estadísticas de solicitudes' })
  getEstadisticas(
    @Request() req,
    @Query('periodoId') periodoId?: string,
    @Query('municipio') municipio?: string,
  ) {
    // Si es director de círculo, filtrar por su municipio
    if (req.user.rol === RolUsuario.DIRECTOR_CIRCULO && req.user.perfil) {
      municipio = req.user.perfil.municipio;
    }

    return this.solicitudService.getEstadisticas({ periodoId, municipio });
  }

  @Get(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener solicitud por ID' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({
    status: 200,
    description: 'Solicitud encontrada',
    type: SolicitudResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  findOne(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.solicitudService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({
    summary: 'Actualizar datos de la solicitud (sin datos del niño)',
  })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud actualizada' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  update(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSolicitudDto,
  ) {
    return this.solicitudService.update(id, dto, req.user);
  }

  @Patch(':id/nino')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.SOLICITANTE,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({
    summary: 'Actualizar datos del niño asociado a la solicitud',
  })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Datos del niño actualizados' })
  @ApiResponse({ status: 404, description: 'Solicitud o niño no encontrado' })
  async updateNino(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateNinoDto: UpdateNinoDto,
  ) {
    return this.solicitudService.updateNino(id, updateNinoDto, req.user);
  }

  @Patch(':id/estado')
  @Roles(
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Cambiar estado de solicitud' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  cambiarEstado(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('estado') estado: EstadoSolicitud,
    @Body('comentario') comentario?: string,
  ) {
    return this.solicitudService.cambiarEstado(
      id,
      estado,
      req.user.id,
      comentario,
    );
  }

  @Delete(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Eliminar solicitud' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud eliminada' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  @ApiResponse({
    status: 409,
    description:
      'No se puede eliminar una solicitud con documentos, decisiones o matrícula asociada',
  })
  remove(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.solicitudService.remove(id, req.user);
  }
}
