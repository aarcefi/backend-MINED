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
import { RolUsuario, EstadoSolicitud } from '../../common/index';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { TrazabilidadService } from './trazabilidad.service';
import { CreateTrazabilidadDto } from './dto/create-trazabilidad.dto';
import { UpdateTrazabilidadDto } from './dto/update-trazabilidad.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';

@ApiTags('Trazabilidad')
@ApiBearerAuth()
@Controller('trazabilidad')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrazabilidadController {
  constructor(private readonly service: TrazabilidadService) {}

  @Post()
  @Roles(RolUsuario.FUNCIONARIO_MUNICIPAL, RolUsuario.COMISION_OTORGAMIENTO)
  @ApiOperation({ summary: 'Crear nueva trazabilidad' })
  @ApiResponse({ status: 201, description: 'Trazabilidad creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({
    status: 404,
    description: 'Solicitud o usuario no encontrado',
  })
  create(@Body() dto: CreateTrazabilidadDto, @GetUser() usuario: any) {
    return this.service.create(dto, usuario);
  }

  @Post('automatica')
  @Roles(RolUsuario.FUNCIONARIO_MUNICIPAL, RolUsuario.COMISION_OTORGAMIENTO)
  @ApiOperation({
    summary: 'Crear trazabilidad automática por cambio de estado',
  })
  crearTrazabilidadAutomatica(
    @Body()
    data: {
      solicitudId: string;
      estadoAnterior: EstadoSolicitud;
      estadoNuevo: EstadoSolicitud;
      usuarioId: string;
      comentario?: string;
    },
    @GetUser() usuario: any,
  ) {
    return this.service.crearTrazabilidadAutomatica(
      data.solicitudId,
      data.estadoAnterior,
      data.estadoNuevo,
      data.usuarioId,
      data.comentario,
      usuario,
    );
  }

  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
  )
  @ApiOperation({ summary: 'Obtener todas las trazabilidades' })
  @ApiQuery({
    name: 'solicitudId',
    required: false,
    description: 'Filtrar por solicitud',
  })
  @ApiQuery({
    name: 'usuarioId',
    required: false,
    description: 'Filtrar por usuario',
  })
  @ApiQuery({
    name: 'estadoAnterior',
    required: false,
    enum: EstadoSolicitud,
    description: 'Filtrar por estado anterior',
  })
  @ApiQuery({
    name: 'estadoNuevo',
    required: false,
    enum: EstadoSolicitud,
    description: 'Filtrar por estado nuevo',
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
  @ApiResponse({ status: 200, description: 'Lista de trazabilidades' })
  findAll(
    @Query('solicitudId') solicitudId?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('estadoAnterior') estadoAnterior?: EstadoSolicitud,
    @Query('estadoNuevo') estadoNuevo?: EstadoSolicitud,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.service.findAll({
      solicitudId,
      usuarioId,
      estadoAnterior,
      estadoNuevo,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
    });
  }

  @Get('solicitud/:solicitudId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener trazabilidades por solicitud' })
  @ApiParam({ name: 'solicitudId', description: 'ID de la solicitud' })
  @ApiResponse({
    status: 200,
    description: 'Lista de trazabilidades de la solicitud',
  })
  findBySolicitudId(@Param('solicitudId', ParseUUIDPipe) solicitudId: string) {
    return this.service.findBySolicitudId(solicitudId);
  }

  @Get('usuario/:usuarioId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Obtener trazabilidades por usuario' })
  @ApiParam({ name: 'usuarioId', description: 'ID del usuario' })
  @ApiResponse({
    status: 200,
    description: 'Lista de trazabilidades del usuario',
  })
  findByUsuarioId(@Param('usuarioId', ParseUUIDPipe) usuarioId: string) {
    return this.service.findByUsuarioId(usuarioId);
  }

  @Get('estadisticas')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Obtener estadísticas de trazabilidad' })
  @ApiQuery({
    name: 'usuarioId',
    required: false,
    description: 'Filtrar por usuario',
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
  @ApiResponse({ status: 200, description: 'Estadísticas de trazabilidad' })
  getEstadisticas(
    @Query('usuarioId') usuarioId?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.service.getEstadisticas({
      usuarioId,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
    });
  }

  @Get(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
  )
  @ApiOperation({ summary: 'Obtener trazabilidad por ID' })
  @ApiParam({ name: 'id', description: 'ID de la trazabilidad' })
  @ApiResponse({ status: 200, description: 'Trazabilidad encontrada' })
  @ApiResponse({ status: 404, description: 'Trazabilidad no encontrada' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar trazabilidad' })
  @ApiParam({ name: 'id', description: 'ID de la trazabilidad' })
  @ApiResponse({ status: 200, description: 'Trazabilidad actualizada' })
  @ApiResponse({ status: 404, description: 'Trazabilidad no encontrada' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrazabilidadDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Eliminar trazabilidad' })
  @ApiParam({ name: 'id', description: 'ID de la trazabilidad' })
  @ApiResponse({ status: 200, description: 'Trazabilidad eliminada' })
  @ApiResponse({ status: 404, description: 'Trazabilidad no encontrada' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
