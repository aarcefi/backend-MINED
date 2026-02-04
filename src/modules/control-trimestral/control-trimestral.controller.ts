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
import { RolUsuario, VinculoLaboral } from '../../common/index';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { ControlTrimestralService } from './control-trimestral.service';
import { CreateControlTrimestralDto } from './dto/create-control-trimestral.dto';
import { UpdateControlTrimestralDto } from './dto/update-control-trimestral.dto';

@ApiTags('Controles Trimestrales')
@ApiBearerAuth()
@Controller('controles-trimestrales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ControlTrimestralController {
  constructor(private readonly controlService: ControlTrimestralService) {}

  @Post()
  @Roles(RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Crear nuevo control trimestral' })
  @ApiResponse({ status: 201, description: 'Control creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({
    status: 404,
    description: 'Matrícula o funcionario no encontrado',
  })
  create(@Body() createControlDto: CreateControlTrimestralDto) {
    return this.controlService.create(createControlDto);
  }

  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener todos los controles trimestrales' })
  @ApiQuery({
    name: 'matriculaId',
    required: false,
    description: 'Filtrar por matrícula',
  })
  @ApiQuery({
    name: 'funcionarioId',
    required: false,
    description: 'Filtrar por funcionario',
  })
  @ApiQuery({
    name: 'vinculo',
    required: false,
    enum: VinculoLaboral,
    description: 'Filtrar por vínculo laboral',
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
  @ApiResponse({ status: 200, description: 'Lista de controles trimestrales' })
  findAll(
    @Query('matriculaId') matriculaId?: string,
    @Query('funcionarioId') funcionarioId?: string,
    @Query('vinculo') vinculo?: VinculoLaboral,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    return this.controlService.findAll({
      matriculaId,
      funcionarioId,
      vinculo,
      fechaInicio: fechaInicio ? new Date(fechaInicio) : undefined,
      fechaFin: fechaFin ? new Date(fechaFin) : undefined,
    });
  }

  @Get('matricula/:matriculaId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.DIRECTOR_CIRCULO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener controles por matrícula' })
  @ApiParam({ name: 'matriculaId', description: 'ID de la matrícula' })
  @ApiResponse({
    status: 200,
    description: 'Lista de controles de la matrícula',
  })
  findByMatriculaId(@Param('matriculaId', ParseUUIDPipe) matriculaId: string) {
    return this.controlService.findByMatriculaId(matriculaId);
  }

  @Get('solicitante/:solicitanteId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener controles por solicitante' })
  @ApiParam({ name: 'solicitanteId', description: 'ID del solicitante' })
  @ApiResponse({
    status: 200,
    description: 'Lista de controles del solicitante',
  })
  findBySolicitanteId(
    @Param('solicitanteId', ParseUUIDPipe) solicitanteId: string,
  ) {
    return this.controlService.findBySolicitanteId(solicitanteId);
  }

  @Get('pendientes')
  @Roles(RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Obtener matrículas con controles pendientes' })
  @ApiQuery({
    name: 'municipio',
    required: false,
    description: 'Filtrar por municipio',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de matrículas con controles pendientes',
  })
  findControlesPendientes(@Query('municipio') municipio?: string) {
    return this.controlService.findControlesPendientes(municipio);
  }

  @Get(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.DIRECTOR_CIRCULO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener control trimestral por ID' })
  @ApiParam({ name: 'id', description: 'ID del control trimestral' })
  @ApiResponse({ status: 200, description: 'Control encontrado' })
  @ApiResponse({ status: 404, description: 'Control no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.controlService.findOne(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Actualizar control trimestral' })
  @ApiParam({ name: 'id', description: 'ID del control trimestral' })
  @ApiResponse({ status: 200, description: 'Control actualizado' })
  @ApiResponse({ status: 404, description: 'Control no encontrado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateControlDto: UpdateControlTrimestralDto,
  ) {
    return this.controlService.update(id, updateControlDto);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Eliminar control trimestral' })
  @ApiParam({ name: 'id', description: 'ID del control trimestral' })
  @ApiResponse({ status: 200, description: 'Control eliminado' })
  @ApiResponse({ status: 404, description: 'Control no encontrado' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.controlService.remove(id);
  }

  @Get('estadisticas/vinculos')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Obtener estadísticas de vínculos laborales' })
  @ApiResponse({ status: 200, description: 'Estadísticas de vínculos' })
  getEstadisticasVinculos() {
    return this.controlService.getEstadisticasVinculos();
  }
}
