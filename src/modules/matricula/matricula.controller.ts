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
import { RolUsuario, EstadoMatricula } from '../../common/index';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { MatriculasService } from './matricula.service';
import { CreateMatriculaDto } from './dto/create-matricula.dto';
import { UpdateMatriculaDto } from './dto/update-matricula.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';

@ApiTags('Matrículas')
@ApiBearerAuth()
@Controller('matriculas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MatriculaController {
  constructor(private readonly matriculasService: MatriculasService) {}

  @Post()
  @Roles(RolUsuario.COMISION_OTORGAMIENTO, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Crear nueva matrícula' })
  @ApiResponse({ status: 201, description: 'Matrícula creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({
    status: 404,
    description: 'Solicitud o círculo no encontrado',
  })
  @ApiResponse({
    status: 409,
    description:
      'La solicitud ya tiene una matrícula o no hay capacidad disponible',
  })
  create(@Body() createMatriculaDto: CreateMatriculaDto) {
    return this.matriculasService.create(createMatriculaDto);
  }

  // ========== RUTAS FIJAS (sin parámetros dinámicos) ==========
  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener todas las matrículas' })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: EstadoMatricula,
    description: 'Filtrar por estado',
  })
  @ApiQuery({
    name: 'circuloId',
    required: false,
    description: 'Filtrar por círculo',
  })
  @ApiQuery({
    name: 'periodoId',
    required: false,
    description: 'Filtrar por período (a través de solicitud)',
  })
  @ApiQuery({
    name: 'solicitanteId',
    required: false,
    description: 'Filtrar por solicitante',
  })
  @ApiQuery({
    name: 'fechaOtorgamientoDesde',
    required: false,
    description: 'Filtrar desde fecha de otorgamiento (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'fechaOtorgamientoHasta',
    required: false,
    description: 'Filtrar hasta fecha de otorgamiento (YYYY-MM-DD)',
  })
  @ApiResponse({ status: 200, description: 'Lista de matrículas' })
  findAll(
    @Query('estado') estado?: EstadoMatricula,
    @Query('circuloId') circuloId?: string,
    @Query('periodoId') periodoId?: string,
    @Query('solicitanteId') solicitanteId?: string,
    @Query('fechaOtorgamientoDesde') fechaOtorgamientoDesde?: string,
    @Query('fechaOtorgamientoHasta') fechaOtorgamientoHasta?: string,
  ) {
    return this.matriculasService.findAll({
      estado,
      circuloId,
      periodoId,
      solicitanteId,
      fechaOtorgamientoDesde: fechaOtorgamientoDesde
        ? new Date(fechaOtorgamientoDesde)
        : undefined,
      fechaOtorgamientoHasta: fechaOtorgamientoHasta
        ? new Date(fechaOtorgamientoHasta)
        : undefined,
    });
  }

  @Get('activas')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener matrículas activas' })
  @ApiResponse({ status: 200, description: 'Lista de matrículas activas' })
  findActivas() {
    return this.matriculasService.findActivas();
  }

  @Get('vencidas')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener matrículas vencidas' })
  @ApiResponse({ status: 200, description: 'Lista de matrículas vencidas' })
  findVencidas() {
    return this.matriculasService.findVencidas();
  }

  @Get('pendientes-activacion')
  @Roles(RolUsuario.DIRECTOR_CIRCULO, RolUsuario.ADMINISTRADOR)
  @ApiOperation({
    summary:
      'Obtener matrículas pendientes de activación (últimos 5 días hábiles)',
  })
  @ApiQuery({
    name: 'circuloId',
    required: false,
    description: 'ID del círculo (solo para administradores)',
  })
  async getPendientesActivacion(
    @GetUser() usuario: any,
    @Query('circuloId') circuloId?: string, // opcional para admin
  ) {
    return this.matriculasService.getPendientesActivacion(usuario, circuloId);
  }

  // ========== RUTAS CON PARÁMETROS DINÁMICOS (van después) ==========
  @Get('circulo/:circuloId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener matrículas por círculo' })
  @ApiParam({ name: 'circuloId', description: 'ID del círculo infantil' })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: EstadoMatricula,
    description: 'Filtrar por estado',
  })
  @ApiResponse({ status: 200, description: 'Lista de matrículas del círculo' })
  findByCirculoId(
    @Param('circuloId', ParseUUIDPipe) circuloId: string,
    @Query('estado') estado?: EstadoMatricula,
  ) {
    return this.matriculasService.findByCirculoId(circuloId, estado);
  }

  @Get('solicitante/:solicitanteId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener matrículas por solicitante' })
  @ApiParam({ name: 'solicitanteId', description: 'ID del solicitante' })
  @ApiResponse({
    status: 200,
    description: 'Lista de matrículas del solicitante',
  })
  findBySolicitanteId(
    @Param('solicitanteId', ParseUUIDPipe) solicitanteId: string,
  ) {
    return this.matriculasService.findBySolicitanteId(solicitanteId);
  }

  @Get('solicitud/:solicitudId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener matrícula por solicitud' })
  @ApiParam({ name: 'solicitudId', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Matrícula encontrada' })
  @ApiResponse({ status: 404, description: 'Matrícula no encontrada' })
  findBySolicitudId(@Param('solicitudId', ParseUUIDPipe) solicitudId: string) {
    return this.matriculasService.findBySolicitudId(solicitudId);
  }

  @Get('folio/:folio')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.DIRECTOR_CIRCULO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener matrícula por folio' })
  @ApiParam({ name: 'folio', description: 'Folio de la matrícula' })
  @ApiResponse({ status: 200, description: 'Matrícula encontrada' })
  @ApiResponse({ status: 404, description: 'Matrícula no encontrada' })
  findByFolio(@Param('folio') folio: string) {
    return this.matriculasService.findByFolio(folio);
  }

  @Get('estadisticas/circulo/:circuloId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener estadísticas de matrículas por círculo' })
  @ApiParam({ name: 'circuloId', description: 'ID del círculo infantil' })
  @ApiResponse({ status: 200, description: 'Estadísticas del círculo' })
  getEstadisticasCirculo(@Param('circuloId', ParseUUIDPipe) circuloId: string) {
    return this.matriculasService.getEstadisticasCirculo(circuloId);
  }

  @Get('estadisticas/generales')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Obtener estadísticas generales de matrículas' })
  @ApiResponse({ status: 200, description: 'Estadísticas generales' })
  getEstadisticasGenerales() {
    return this.matriculasService.getEstadisticasGenerales();
  }

  @Get(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.DIRECTOR_CIRCULO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener matrícula por ID' })
  @ApiParam({ name: 'id', description: 'ID de la matrícula' })
  @ApiResponse({ status: 200, description: 'Matrícula encontrada' })
  @ApiResponse({ status: 404, description: 'Matrícula no encontrada' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.matriculasService.findOne(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.FUNCIONARIO_MUNICIPAL, RolUsuario.COMISION_OTORGAMIENTO)
  @ApiOperation({ summary: 'Actualizar matrícula' })
  @ApiParam({ name: 'id', description: 'ID de la matrícula' })
  @ApiResponse({ status: 200, description: 'Matrícula actualizada' })
  @ApiResponse({ status: 404, description: 'Matrícula no encontrada' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMatriculaDto: UpdateMatriculaDto,
  ) {
    return this.matriculasService.update(id, updateMatriculaDto);
  }

  @Patch(':id/estado')
  @Roles(RolUsuario.FUNCIONARIO_MUNICIPAL, RolUsuario.DIRECTOR_CIRCULO)
  @ApiOperation({ summary: 'Cambiar estado de matrícula' })
  @ApiParam({ name: 'id', description: 'ID de la matrícula' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 404, description: 'Matrícula no encontrada' })
  cambiarEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('estado') estado: EstadoMatricula,
  ) {
    return this.matriculasService.update(id, { estado } as UpdateMatriculaDto);
  }

  @Patch(':id/activar')
  @Roles(RolUsuario.DIRECTOR_CIRCULO, RolUsuario.ADMINISTRADOR)
  @ApiOperation({
    summary: 'Activar matrícula (cambiar de ESPERANDO_ACTIVACION a ACTIVA)',
  })
  @ApiParam({ name: 'id', description: 'ID de la matrícula' })
  @ApiResponse({ status: 200, description: 'Matrícula activada' })
  @ApiResponse({
    status: 400,
    description: 'La matrícula no está en estado ESPERANDO_ACTIVACION',
  })
  @ApiResponse({ status: 403, description: 'No tienes permiso' })
  @ApiResponse({ status: 404, description: 'Matrícula no encontrada' })
  async activarMatricula(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() usuario: any,
  ) {
    return this.matriculasService.activarMatricula(id, usuario);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Eliminar matrícula' })
  @ApiParam({ name: 'id', description: 'ID de la matrícula' })
  @ApiResponse({ status: 200, description: 'Matrícula eliminada' })
  @ApiResponse({ status: 404, description: 'Matrícula no encontrada' })
  @ApiResponse({
    status: 409,
    description:
      'No se puede eliminar una matrícula con controles trimestrales',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.matriculasService.remove(id);
  }
}
