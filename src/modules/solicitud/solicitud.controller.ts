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
    description: 'Niño, tutor o período no encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'El niño ya tiene una solicitud activa en este período',
  })
  create(@Body() dto: CreateSolicitudDto) {
    return this.solicitudService.create(dto);
  }

  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
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
  @ApiResponse({ status: 200, description: 'Lista de solicitudes' })
  findAll(
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
    return this.solicitudService.findAll({
      estado,
      sector,
      tipoSolicitud,
      periodoId,
      solicitanteId,
      ninoId,
      municipio,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
    });
  }

  @Get('pendientes-revision')
  @Roles(RolUsuario.FUNCIONARIO_MUNICIPAL, RolUsuario.COMISION_OTORGAMIENTO)
  @ApiOperation({ summary: 'Obtener solicitudes pendientes de revisión' })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitudes pendientes de revisión',
  })
  findPendientesRevision() {
    return this.solicitudService.findPendientesRevision();
  }

  @Get('solicitante/:solicitanteId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener solicitudes por solicitante' })
  @ApiParam({ name: 'solicitanteId', description: 'ID del solicitante' })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitudes del solicitante',
  })
  findBySolicitanteId(
    @Param('solicitanteId', ParseUUIDPipe) solicitanteId: string,
  ) {
    return this.solicitudService.findBySolicitanteId(solicitanteId);
  }

  @Get('nino/:ninoId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener solicitudes por niño' })
  @ApiParam({ name: 'ninoId', description: 'ID del niño' })
  @ApiResponse({ status: 200, description: 'Lista de solicitudes del niño' })
  findByNinoId(@Param('ninoId', ParseUUIDPipe) ninoId: string) {
    return this.solicitudService.findByNinoId(ninoId);
  }

  @Get('registro/:numeroRegistro')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener solicitud por número de registro' })
  @ApiParam({
    name: 'numeroRegistro',
    description: 'Número de registro de la solicitud',
  })
  @ApiResponse({ status: 200, description: 'Solicitud encontrada' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  findByNumeroRegistro(@Param('numeroRegistro') numeroRegistro: string) {
    return this.solicitudService.findByNumeroRegistro(numeroRegistro);
  }

  @Get('estadisticas')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
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
    @Query('periodoId') periodoId?: string,
    @Query('municipio') municipio?: string,
  ) {
    return this.solicitudService.getEstadisticas({ periodoId, municipio });
  }

  @Get(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener solicitud por ID' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud encontrada' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.solicitudService.findOne(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.FUNCIONARIO_MUNICIPAL, RolUsuario.COMISION_OTORGAMIENTO)
  @ApiOperation({ summary: 'Actualizar solicitud' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud actualizada' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSolicitudDto,
  ) {
    return this.solicitudService.update(id, dto);
  }

  @Patch(':id/estado')
  @Roles(RolUsuario.FUNCIONARIO_MUNICIPAL, RolUsuario.COMISION_OTORGAMIENTO)
  @ApiOperation({ summary: 'Cambiar estado de solicitud' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrado' })
  cambiarEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('estado') estado: EstadoSolicitud,
    @Body('usuarioId') usuarioId: string,
    @Body('comentario') comentario?: string,
  ) {
    return this.solicitudService.cambiarEstado(
      id,
      estado,
      usuarioId,
      comentario,
    );
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Eliminar solicitud' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud eliminada' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  @ApiResponse({
    status: 409,
    description:
      'No se puede eliminar una solicitud con documentos, decisiones o matrícula asociada',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.solicitudService.remove(id);
  }
}
