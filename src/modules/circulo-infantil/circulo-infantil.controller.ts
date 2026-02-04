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
import { RolUsuario, TipoCirculo } from '../../common/index';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { CirculoInfantilService } from './circulo-infantil.service';
import { CreateCirculoInfantilDto } from './dto/create-circulo-infantil.dto';
import { UpdateCirculoInfantilDto } from './dto/update-circulo-infantil.dto';

@ApiTags('Círculos Infantiles')
@ApiBearerAuth()
@Controller('circulos-infantiles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CirculoInfantilController {
  constructor(private readonly circuloService: CirculoInfantilService) {}

  @Post()
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Crear nuevo círculo infantil' })
  @ApiResponse({ status: 201, description: 'Círculo creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  create(@Body() createCirculoDto: CreateCirculoInfantilDto) {
    return this.circuloService.create(createCirculoDto);
  }

  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener todos los círculos infantiles' })
  @ApiQuery({
    name: 'municipio',
    required: false,
    description: 'Filtrar por municipio',
  })
  @ApiQuery({
    name: 'provincia',
    required: false,
    description: 'Filtrar por provincia',
  })
  @ApiQuery({
    name: 'tipo',
    required: false,
    enum: TipoCirculo,
    description: 'Filtrar por tipo',
  })
  @ApiQuery({
    name: 'activo',
    required: false,
    type: Boolean,
    description: 'Filtrar por estado activo',
  })
  @ApiResponse({ status: 200, description: 'Lista de círculos infantiles' })
  findAll(
    @Query('municipio') municipio?: string,
    @Query('provincia') provincia?: string,
    @Query('tipo') tipo?: TipoCirculo,
    @Query('activo') activo?: boolean,
  ) {
    return this.circuloService.findAll({
      municipio,
      provincia,
      tipo,
      activo: activo !== undefined ? Boolean(activo) : undefined,
    });
  }

  @Get('activos')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener círculos infantiles activos' })
  @ApiResponse({ status: 200, description: 'Lista de círculos activos' })
  findActivos() {
    return this.circuloService.findActivos();
  }

  @Get('municipio/:municipio')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener círculos por municipio' })
  @ApiParam({ name: 'municipio', description: 'Nombre del municipio' })
  @ApiResponse({ status: 200, description: 'Lista de círculos del municipio' })
  findByMunicipio(@Param('municipio') municipio: string) {
    return this.circuloService.findByMunicipio(municipio);
  }

  @Get(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener círculo infantil por ID' })
  @ApiParam({ name: 'id', description: 'ID del círculo infantil' })
  @ApiResponse({ status: 200, description: 'Círculo encontrado' })
  @ApiResponse({ status: 404, description: 'Círculo no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.circuloService.findOne(id);
  }

  @Get(':id/capacidades')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
  )
  @ApiOperation({ summary: 'Obtener capacidades de un círculo' })
  @ApiParam({ name: 'id', description: 'ID del círculo infantil' })
  @ApiQuery({
    name: 'periodoId',
    required: false,
    description: 'Filtrar por período',
  })
  @ApiResponse({ status: 200, description: 'Lista de capacidades' })
  findCapacidades(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('periodoId') periodoId?: string,
  ) {
    return this.circuloService.findCapacidades(id, periodoId);
  }

  @Get(':id/matriculas')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener matrículas de un círculo' })
  @ApiParam({ name: 'id', description: 'ID del círculo infantil' })
  @ApiQuery({
    name: 'estado',
    required: false,
    description: 'Filtrar por estado de matrícula',
  })
  @ApiResponse({ status: 200, description: 'Lista de matrículas' })
  findMatriculas(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('estado') estado?: string,
  ) {
    return this.circuloService.findMatriculas(id, estado);
  }

  @Get(':id/estadisticas')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener estadísticas del círculo' })
  @ApiParam({ name: 'id', description: 'ID del círculo infantil' })
  @ApiResponse({ status: 200, description: 'Estadísticas del círculo' })
  getEstadisticas(@Param('id', ParseUUIDPipe) id: string) {
    return this.circuloService.getEstadisticas(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Actualizar círculo infantil' })
  @ApiParam({ name: 'id', description: 'ID del círculo infantil' })
  @ApiResponse({ status: 200, description: 'Círculo actualizado' })
  @ApiResponse({ status: 404, description: 'Círculo no encontrado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCirculoDto: UpdateCirculoInfantilDto,
  ) {
    return this.circuloService.update(id, updateCirculoDto);
  }

  @Patch(':id/activar')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Activar/desactivar círculo infantil' })
  @ApiParam({ name: 'id', description: 'ID del círculo infantil' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 404, description: 'Círculo no encontrado' })
  toggleActivo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('activo') activo: boolean,
  ) {
    return this.circuloService.toggleActivo(id, activo);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR)
  @ApiOperation({ summary: 'Eliminar círculo infantil' })
  @ApiParam({ name: 'id', description: 'ID del círculo infantil' })
  @ApiResponse({ status: 200, description: 'Círculo eliminado' })
  @ApiResponse({ status: 404, description: 'Círculo no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'No se puede eliminar, tiene matrículas activas',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.circuloService.remove(id);
  }
}
