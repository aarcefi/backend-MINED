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
  ParseIntPipe,
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
import { CapacidadCirculoService } from './capacidad.service';
import { CreateCapacidadDto } from './dto/create-capacidad.dto';
import { UpdateCapacidadDto } from './dto/update-capacidad.dto';

@ApiTags('Capacidades de Círculos')
@ApiBearerAuth()
@Controller('capacidades-circulos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CapacidadCirculoController {
  constructor(private readonly capacidadService: CapacidadCirculoService) {}

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Crear nueva capacidad para círculo infantil' })
  @ApiResponse({ status: 201, description: 'Capacidad creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({
    status: 409,
    description: 'Capacidad ya existe para este período',
  })
  create(@Body() createCapacidadDto: CreateCapacidadDto) {
    return this.capacidadService.create(createCapacidadDto);
  }

  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
  )
  @ApiOperation({ summary: 'Obtener todas las capacidades' })
  @ApiQuery({
    name: 'circuloId',
    required: false,
    description: 'Filtrar por círculo',
  })
  @ApiQuery({
    name: 'periodoId',
    required: false,
    description: 'Filtrar por período',
  })
  @ApiQuery({
    name: 'cuposDisponiblesMin',
    required: false,
    type: Number,
    description: 'Filtrar por cupos disponibles mínimos',
  })
  @ApiResponse({ status: 200, description: 'Lista de capacidades' })
  findAll(
    @Query('circuloId') circuloId?: string,
    @Query('periodoId') periodoId?: string,
    @Query('cuposDisponiblesMin') cuposDisponiblesMin?: number,
  ) {
    return this.capacidadService.findAll({
      circuloId,
      periodoId,
      cuposDisponiblesMin,
    });
  }

  @Get('disponibles')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener capacidades con cupos disponibles' })
  @ApiQuery({
    name: 'circuloId',
    required: false,
    description: 'Filtrar por círculo',
  })
  @ApiResponse({ status: 200, description: 'Lista de capacidades disponibles' })
  findDisponibles(@Query('circuloId') circuloId?: string) {
    return this.capacidadService.findConCuposDisponibles(circuloId);
  }

  @Get('estadisticas')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Obtener estadísticas de capacidades' })
  @ApiResponse({ status: 200, description: 'Estadísticas de capacidades' })
  getEstadisticas() {
    return this.capacidadService.getEstadisticas();
  }

  @Get(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
  )
  @ApiOperation({ summary: 'Obtener capacidad por ID' })
  @ApiParam({ name: 'id', description: 'ID de la capacidad' })
  @ApiResponse({ status: 200, description: 'Capacidad encontrada' })
  @ApiResponse({ status: 404, description: 'Capacidad no encontrada' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.capacidadService.findOne(id);
  }

  @Get('circulo/:circuloId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
  )
  @ApiOperation({ summary: 'Obtener capacidades por círculo' })
  @ApiParam({ name: 'circuloId', description: 'ID del círculo infantil' })
  @ApiResponse({ status: 200, description: 'Lista de capacidades del círculo' })
  findByCirculoId(@Param('circuloId', ParseUUIDPipe) circuloId: string) {
    return this.capacidadService.findByCirculoId(circuloId);
  }

  @Get('periodo/:periodoId/disponibles')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({
    summary: 'Obtener círculos con capacidad disponible en período',
  })
  @ApiParam({ name: 'periodoId', description: 'ID del período' })
  @ApiResponse({ status: 200, description: 'Lista de capacidades disponibles' })
  findDisponiblesByPeriodo(
    @Param('periodoId', ParseUUIDPipe) periodoId: string,
  ) {
    return this.capacidadService.findDisponiblesByPeriodo(periodoId);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Actualizar capacidad' })
  @ApiParam({ name: 'id', description: 'ID de la capacidad' })
  @ApiResponse({ status: 200, description: 'Capacidad actualizada' })
  @ApiResponse({ status: 404, description: 'Capacidad no encontrada' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCapacidadDto: UpdateCapacidadDto,
  ) {
    return this.capacidadService.update(id, updateCapacidadDto);
  }

  @Patch(':id/cupos')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Actualizar cupos ocupados de una capacidad' })
  @ApiParam({ name: 'id', description: 'ID de la capacidad' })
  @ApiResponse({ status: 200, description: 'Cupos actualizados' })
  @ApiResponse({ status: 404, description: 'Capacidad no encontrada' })
  updateCupos(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('cuposOcupados', ParseIntPipe) cuposOcupados: number,
  ) {
    return this.capacidadService.updateCupos(id, cuposOcupados);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Eliminar capacidad' })
  @ApiParam({ name: 'id', description: 'ID de la capacidad' })
  @ApiResponse({ status: 200, description: 'Capacidad eliminada' })
  @ApiResponse({ status: 404, description: 'Capacidad no encontrada' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.capacidadService.remove(id);
  }
}
