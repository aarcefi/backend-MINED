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
import { SesionComisionService } from './sesion.service';
import { CreateSesionDto } from './dto/create-sesion.dto';
import { UpdateSesionDto } from './dto/update-sesion.dto';

@ApiTags('Sesiones de Comisión')
@ApiBearerAuth()
@Controller('sesion-comision')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SesionComisionController {
  constructor(private readonly service: SesionComisionService) {}

  @Post()
  @Roles(RolUsuario.COMISION_OTORGAMIENTO, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Crear nueva sesión de comisión' })
  @ApiResponse({ status: 201, description: 'Sesión creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Período no encontrado' })
  create(@Body() dto: CreateSesionDto) {
    return this.service.create(dto);
  }

  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
  )
  @ApiOperation({ summary: 'Obtener todas las sesiones' })
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
  @ApiQuery({
    name: 'conActa',
    required: false,
    type: Boolean,
    description: 'Filtrar por sesiones con acta',
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
  @ApiResponse({ status: 200, description: 'Lista de sesiones' })
  findAll(
    @Query('periodoId') periodoId?: string,
    @Query('municipio') municipio?: string,
    @Query('conActa') conActa?: boolean,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    return this.service.findAll({
      periodoId,
      municipio,
      conActa: conActa !== undefined ? Boolean(conActa) : undefined,
      fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
      fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
    });
  }

  @Get('proximas')
  @Roles(RolUsuario.COMISION_OTORGAMIENTO, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Obtener próximas sesiones' })
  @ApiQuery({
    name: 'dias',
    required: false,
    type: Number,
    description: 'Número de días a futuro (default: 7)',
  })
  @ApiResponse({ status: 200, description: 'Lista de próximas sesiones' })
  getProximasSesiones(@Query('dias') dias?: number) {
    return this.service.getProximasSesiones(dias ? Number(dias) : 7);
  }

  @Get('periodo/:periodoId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
  )
  @ApiOperation({ summary: 'Obtener sesiones por período' })
  @ApiParam({ name: 'periodoId', description: 'ID del período' })
  @ApiResponse({ status: 200, description: 'Lista de sesiones del período' })
  findByPeriodoId(@Param('periodoId', ParseUUIDPipe) periodoId: string) {
    return this.service.findByPeriodoId(periodoId);
  }

  @Get('municipio/:municipio')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
  )
  @ApiOperation({ summary: 'Obtener sesiones por municipio' })
  @ApiParam({ name: 'municipio', description: 'Nombre del municipio' })
  @ApiResponse({ status: 200, description: 'Lista de sesiones del municipio' })
  findByMunicipio(@Param('municipio') municipio: string) {
    return this.service.findByMunicipio(municipio);
  }

  @Get(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
  )
  @ApiOperation({ summary: 'Obtener sesión por ID' })
  @ApiParam({ name: 'id', description: 'ID de la sesión' })
  @ApiResponse({ status: 200, description: 'Sesión encontrada' })
  @ApiResponse({ status: 404, description: 'Sesión no encontrada' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/estadisticas')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
  )
  @ApiOperation({ summary: 'Obtener estadísticas de la sesión' })
  @ApiParam({ name: 'id', description: 'ID de la sesión' })
  @ApiResponse({ status: 200, description: 'Estadísticas de la sesión' })
  getEstadisticas(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getEstadisticas(id);
  }

  @Get('estadisticas/generales')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
  )
  @ApiOperation({ summary: 'Obtener estadísticas generales de sesiones' })
  @ApiQuery({
    name: 'periodoId',
    required: false,
    description: 'Filtrar por período',
  })
  @ApiResponse({ status: 200, description: 'Estadísticas generales' })
  getEstadisticasGenerales(@Query('periodoId') periodoId?: string) {
    return this.service.getEstadisticasGenerales(periodoId);
  }

  @Patch(':id')
  @Roles(RolUsuario.COMISION_OTORGAMIENTO, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Actualizar sesión' })
  @ApiParam({ name: 'id', description: 'ID de la sesión' })
  @ApiResponse({ status: 200, description: 'Sesión actualizada' })
  @ApiResponse({ status: 404, description: 'Sesión no encontrada' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSesionDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/acta')
  @Roles(RolUsuario.COMISION_OTORGAMIENTO)
  @ApiOperation({ summary: 'Actualizar acta de sesión' })
  @ApiParam({ name: 'id', description: 'ID de la sesión' })
  @ApiResponse({ status: 200, description: 'Acta actualizada' })
  @ApiResponse({ status: 404, description: 'Sesión no encontrada' })
  updateActa(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('actaUrl') actaUrl: string,
  ) {
    return this.service.updateActa(id, actaUrl);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COMISION_OTORGAMIENTO)
  @ApiOperation({ summary: 'Eliminar sesión' })
  @ApiParam({ name: 'id', description: 'ID de la sesión' })
  @ApiResponse({ status: 200, description: 'Sesión eliminada' })
  @ApiResponse({ status: 404, description: 'Sesión no encontrada' })
  @ApiResponse({
    status: 409,
    description: 'No se puede eliminar una sesión con decisiones asociadas',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
