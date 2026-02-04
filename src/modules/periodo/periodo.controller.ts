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
import { PeriodoService } from './periodo.service';
import { CreatePeriodoDto } from './dto/create-periodo.dto';
import { UpdatePeriodoDto } from './dto/update-periodo.dto';

@ApiTags('Períodos de Otorgamiento')
@ApiBearerAuth()
@Controller('periodo-otorgamiento')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PeriodoOtorgamientoController {
  constructor(private readonly service: PeriodoService) {}

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Crear nuevo período de otorgamiento' })
  @ApiResponse({ status: 201, description: 'Período creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({
    status: 409,
    description: 'Ya existe un período activo en las fechas seleccionadas',
  })
  create(@Body() dto: CreatePeriodoDto) {
    return this.service.create(dto);
  }

  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener todos los períodos' })
  @ApiQuery({
    name: 'activo',
    required: false,
    type: Boolean,
    description: 'Filtrar por estado activo',
  })
  @ApiQuery({
    name: 'nombre',
    required: false,
    description: 'Filtrar por nombre',
  })
  @ApiQuery({
    name: 'fechaInicioDesde',
    required: false,
    description: 'Filtrar desde fecha de inicio (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'fechaInicioHasta',
    required: false,
    description: 'Filtrar hasta fecha de inicio (YYYY-MM-DD)',
  })
  @ApiResponse({ status: 200, description: 'Lista de períodos' })
  findAll(
    @Query('activo') activo?: boolean,
    @Query('nombre') nombre?: string,
    @Query('fechaInicioDesde') fechaInicioDesde?: string,
    @Query('fechaInicioHasta') fechaInicioHasta?: string,
  ) {
    return this.service.findAll({
      activo: activo !== undefined ? Boolean(activo) : undefined,
      nombre,
      fechaInicioDesde: fechaInicioDesde
        ? new Date(fechaInicioDesde)
        : undefined,
      fechaInicioHasta: fechaInicioHasta
        ? new Date(fechaInicioHasta)
        : undefined,
    });
  }

  @Get('activo')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener período activo actual' })
  @ApiResponse({ status: 200, description: 'Período activo encontrado' })
  @ApiResponse({ status: 404, description: 'No hay período activo' })
  findActivo() {
    return this.service.findActivo();
  }

  @Get(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener período por ID' })
  @ApiParam({ name: 'id', description: 'ID del período' })
  @ApiResponse({ status: 200, description: 'Período encontrado' })
  @ApiResponse({ status: 404, description: 'Período no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/estadisticas')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
  )
  @ApiOperation({ summary: 'Obtener estadísticas del período' })
  @ApiParam({ name: 'id', description: 'ID del período' })
  @ApiResponse({ status: 200, description: 'Estadísticas del período' })
  getEstadisticas(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getEstadisticas(id);
  }

  @Get('estadisticas/generales')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Obtener estadísticas generales de períodos' })
  @ApiResponse({ status: 200, description: 'Estadísticas generales' })
  getEstadisticasGenerales() {
    return this.service.getEstadisticasGenerales();
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Actualizar período' })
  @ApiParam({ name: 'id', description: 'ID del período' })
  @ApiResponse({ status: 200, description: 'Período actualizado' })
  @ApiResponse({ status: 404, description: 'Período no encontrado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePeriodoDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/activar')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Activar/desactivar período' })
  @ApiParam({ name: 'id', description: 'ID del período' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 404, description: 'Período no encontrado' })
  toggleActivo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('activo') activo: boolean,
  ) {
    return this.service.toggleActivo(id, activo);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Eliminar período' })
  @ApiParam({ name: 'id', description: 'ID del período' })
  @ApiResponse({ status: 200, description: 'Período eliminado' })
  @ApiResponse({ status: 404, description: 'Período no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'No se puede eliminar un período con solicitudes asociadas',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
