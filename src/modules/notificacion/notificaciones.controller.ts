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
import { RolUsuario } from '../../common/index';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { NotificacionesService } from './notificaciones.service';
import { CreateNotificacionDto } from './dto/create-notificacion.dto';

@ApiTags('Notificaciones')
@ApiBearerAuth()
@Controller('notificaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Post()
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
  )
  @ApiOperation({ summary: 'Crear nueva notificación' })
  @ApiResponse({ status: 201, description: 'Notificación creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  create(@Body() createNotificacionDto: CreateNotificacionDto) {
    return this.notificacionesService.create(createNotificacionDto);
  }

  @Post('solicitud-estado')
  @Roles(RolUsuario.FUNCIONARIO_MUNICIPAL, RolUsuario.COMISION_OTORGAMIENTO)
  @ApiOperation({
    summary: 'Crear notificación por cambio de estado en solicitud',
  })
  @ApiResponse({ status: 201, description: 'Notificación creada exitosamente' })
  createNotificacionCambioEstado(
    @Body()
    data: {
      usuarioId: string;
      solicitudId: string;
      estadoAnterior: string;
      estadoNuevo: string;
    },
  ) {
    return this.notificacionesService.createNotificacionSolicitudCambioEstado(
      data.usuarioId,
      data.solicitudId,
      data.estadoAnterior,
      data.estadoNuevo,
    );
  }

  @Post('documento-validado')
  @Roles(RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Crear notificación por documento validado' })
  @ApiResponse({ status: 201, description: 'Notificación creada exitosamente' })
  createNotificacionDocumentoValidado(
    @Body() data: { usuarioId: string; documentoId: string; validado: boolean },
  ) {
    return this.notificacionesService.createNotificacionDocumentoValidado(
      data.usuarioId,
      data.documentoId,
      data.validado,
    );
  }

  @Post('recordatorio-control')
  @Roles(RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Crear notificación de recordatorio de control' })
  @ApiResponse({ status: 201, description: 'Notificación creada exitosamente' })
  createNotificacionRecordatorioControl(
    @Body() data: { usuarioId: string; matriculaId: string; fechaLimite: Date },
  ) {
    return this.notificacionesService.createNotificacionRecordatorioControl(
      data.usuarioId,
      data.matriculaId,
      data.fechaLimite,
    );
  }

  @Get()
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Obtener todas las notificaciones (solo admin)' })
  @ApiQuery({
    name: 'usuarioId',
    required: false,
    description: 'Filtrar por usuario',
  })
  @ApiQuery({ name: 'tipo', required: false, description: 'Filtrar por tipo' })
  @ApiQuery({
    name: 'leida',
    required: false,
    type: Boolean,
    description: 'Filtrar por estado de lectura',
  })
  @ApiQuery({
    name: 'fechaInicio',
    required: false,
    description: 'Filtrar desde fecha (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'fechaFin',
    required: false,
    description: 'Filtrar hasta fecha (YYYY-MM-DD)',
  })
  @ApiResponse({ status: 200, description: 'Lista de notificaciones' })
  findAll(
    @Query('usuarioId') usuarioId?: string,
    @Query('tipo') tipo?: string,
    @Query('leida') leida?: boolean,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    return this.notificacionesService.findAll({
      usuarioId,
      tipo,
      leida: leida !== undefined ? Boolean(leida) : undefined,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : undefined,
      fechaFin: fechaFin ? new Date(fechaFin) : undefined,
    });
  }

  @Get('mis-notificaciones')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.DIRECTOR_CIRCULO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener notificaciones del usuario actual' })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificaciones del usuario',
  })
  findMisNotificaciones(@Query('usuarioId') usuarioId: string) {
    return this.notificacionesService.findAllByUsuario(usuarioId);
  }

  @Get('mis-notificaciones/no-leidas')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.DIRECTOR_CIRCULO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({
    summary: 'Obtener notificaciones no leídas del usuario actual',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificaciones no leídas',
  })
  findMisNotificacionesNoLeidas(@Query('usuarioId') usuarioId: string) {
    return this.notificacionesService.findUnreadByUsuario(usuarioId);
  }

  @Get('usuario/:usuarioId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Obtener notificaciones por usuario' })
  @ApiParam({ name: 'usuarioId', description: 'ID del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Lista de notificaciones del usuario',
  })
  findByUsuarioId(@Param('usuarioId', ParseUUIDPipe) usuarioId: string) {
    return this.notificacionesService.findAllByUsuario(usuarioId);
  }

  @Get('usuario/:usuarioId/estadisticas')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.DIRECTOR_CIRCULO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({
    summary: 'Obtener estadísticas de notificaciones del usuario',
  })
  @ApiParam({ name: 'usuarioId', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Estadísticas de notificaciones' })
  getEstadisticasUsuario(@Param('usuarioId', ParseUUIDPipe) usuarioId: string) {
    return this.notificacionesService.getNotificationStats(usuarioId);
  }

  @Get(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.DIRECTOR_CIRCULO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener notificación por ID' })
  @ApiParam({ name: 'id', description: 'ID de la notificación' })
  @ApiResponse({ status: 200, description: 'Notificación encontrada' })
  @ApiResponse({ status: 404, description: 'Notificación no encontrada' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificacionesService.findOne(id);
  }

  @Patch(':id/marcar-leida')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.DIRECTOR_CIRCULO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  @ApiParam({ name: 'id', description: 'ID de la notificación' })
  @ApiResponse({ status: 200, description: 'Notificación marcada como leída' })
  @ApiResponse({ status: 404, description: 'Notificación no encontrada' })
  marcarComoLeida(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificacionesService.markAsRead(id);
  }

  @Patch('usuario/:usuarioId/marcar-todas-leidas')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.DIRECTOR_CIRCULO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Marcar todas las notificaciones como leídas' })
  @ApiParam({ name: 'usuarioId', description: 'ID del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Todas las notificaciones marcadas como leídas',
  })
  marcarTodasComoLeidas(@Param('usuarioId', ParseUUIDPipe) usuarioId: string) {
    return this.notificacionesService.markAllAsRead(usuarioId);
  }

  @Delete(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.DIRECTOR_CIRCULO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Eliminar notificación' })
  @ApiParam({ name: 'id', description: 'ID de la notificación' })
  @ApiResponse({ status: 200, description: 'Notificación eliminada' })
  @ApiResponse({ status: 404, description: 'Notificación no encontrada' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificacionesService.remove(id);
  }

  @Delete('usuario/:usuarioId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Eliminar todas las notificaciones de un usuario' })
  @ApiParam({ name: 'usuarioId', description: 'ID del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Todas las notificaciones eliminadas',
  })
  removeTodasPorUsuario(@Param('usuarioId', ParseUUIDPipe) usuarioId: string) {
    return this.notificacionesService.removeAllByUsuario(usuarioId);
  }

  @Get('estadisticas/generales')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Obtener estadísticas generales de notificaciones' })
  @ApiResponse({ status: 200, description: 'Estadísticas generales' })
  getEstadisticasGenerales() {
    return this.notificacionesService.getEstadisticasGenerales();
  }
}
