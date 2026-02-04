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
import { RolUsuario, ResultadoDecision } from '../../common/index';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { DecisionSolicitudService } from './decision.service';
import { CreateDecisionDto } from './dto/create-decision.dto';
import { UpdateDecisionDto } from './dto/update-decision.dto';

@ApiTags('Decisiones de Solicitud')
@ApiBearerAuth()
@Controller('decisiones-solicitud')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DecisionSolicitudController {
  constructor(private readonly decisionService: DecisionSolicitudService) {}

  @Post()
  @Roles(RolUsuario.COMISION_OTORGAMIENTO)
  @ApiOperation({ summary: 'Crear nueva decisión de solicitud' })
  @ApiResponse({ status: 201, description: 'Decisión creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({
    status: 404,
    description: 'Solicitud, sesión o comisión no encontrada',
  })
  @ApiResponse({
    status: 409,
    description: 'La solicitud ya tiene una decisión en esta sesión',
  })
  create(@Body() createDecisionDto: CreateDecisionDto) {
    return this.decisionService.create(createDecisionDto);
  }

  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
  )
  @ApiOperation({ summary: 'Obtener todas las decisiones' })
  @ApiQuery({
    name: 'solicitudId',
    required: false,
    description: 'Filtrar por solicitud',
  })
  @ApiQuery({
    name: 'sesionId',
    required: false,
    description: 'Filtrar por sesión',
  })
  @ApiQuery({
    name: 'comisionId',
    required: false,
    description: 'Filtrar por comisión',
  })
  @ApiQuery({
    name: 'resultado',
    required: false,
    enum: ResultadoDecision,
    description: 'Filtrar por resultado',
  })
  @ApiQuery({
    name: 'periodoId',
    required: false,
    description: 'Filtrar por período',
  })
  @ApiResponse({ status: 200, description: 'Lista de decisiones' })
  findAll(
    @Query('solicitudId') solicitudId?: string,
    @Query('sesionId') sesionId?: string,
    @Query('comisionId') comisionId?: string,
    @Query('resultado') resultado?: ResultadoDecision,
    @Query('periodoId') periodoId?: string,
  ) {
    return this.decisionService.findAll({
      solicitudId,
      sesionId,
      comisionId,
      resultado,
      periodoId,
    });
  }

  @Get('sesion/:sesionId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
  )
  @ApiOperation({ summary: 'Obtener decisiones por sesión' })
  @ApiParam({ name: 'sesionId', description: 'ID de la sesión' })
  @ApiResponse({ status: 200, description: 'Lista de decisiones de la sesión' })
  findBySesionId(@Param('sesionId', ParseUUIDPipe) sesionId: string) {
    return this.decisionService.findBySesionId(sesionId);
  }

  @Get('comision/:comisionId')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COMISION_OTORGAMIENTO)
  @ApiOperation({ summary: 'Obtener decisiones por comisión' })
  @ApiParam({ name: 'comisionId', description: 'ID de la comisión' })
  @ApiResponse({
    status: 200,
    description: 'Lista de decisiones de la comisión',
  })
  findByComisionId(@Param('comisionId', ParseUUIDPipe) comisionId: string) {
    return this.decisionService.findByComisionId(comisionId);
  }

  @Get('solicitud/:solicitudId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener decisión por solicitud' })
  @ApiParam({ name: 'solicitudId', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Decisión de la solicitud' })
  @ApiResponse({
    status: 404,
    description: 'No hay decisión para esta solicitud',
  })
  findBySolicitudId(@Param('solicitudId', ParseUUIDPipe) solicitudId: string) {
    return this.decisionService.findBySolicitudId(solicitudId);
  }

  @Get('estadisticas/resultados')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
  )
  @ApiOperation({ summary: 'Obtener estadísticas de resultados' })
  @ApiQuery({
    name: 'periodoId',
    required: false,
    description: 'Filtrar por período',
  })
  @ApiQuery({
    name: 'sesionId',
    required: false,
    description: 'Filtrar por sesión',
  })
  @ApiResponse({ status: 200, description: 'Estadísticas de resultados' })
  getEstadisticasResultados(
    @Query('periodoId') periodoId?: string,
    @Query('sesionId') sesionId?: string,
  ) {
    return this.decisionService.getEstadisticasResultados({
      periodoId,
      sesionId,
    });
  }

  @Get('puntuacion/rango')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
  )
  @ApiOperation({ summary: 'Obtener decisiones por rango de puntuación' })
  @ApiQuery({
    name: 'min',
    required: true,
    type: Number,
    description: 'Puntuación mínima',
  })
  @ApiQuery({
    name: 'max',
    required: true,
    type: Number,
    description: 'Puntuación máxima',
  })
  @ApiResponse({ status: 200, description: 'Lista de decisiones en el rango' })
  getByPuntuacionRange(@Query('min') min: number, @Query('max') max: number) {
    return this.decisionService.getDecisionsByPuntuacionRange(min, max);
  }

  @Get('periodo/:periodoId/resultado/:resultado')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
  )
  @ApiOperation({ summary: 'Obtener decisiones por período y resultado' })
  @ApiParam({ name: 'periodoId', description: 'ID del período' })
  @ApiParam({
    name: 'resultado',
    enum: ResultadoDecision,
    description: 'Resultado de la decisión',
  })
  @ApiResponse({ status: 200, description: 'Lista de decisiones' })
  getByPeriodoAndResultado(
    @Param('periodoId', ParseUUIDPipe) periodoId: string,
    @Param('resultado') resultado: ResultadoDecision,
  ) {
    return this.decisionService.getDecisionsByPeriodoAndResultado(
      periodoId,
      resultado,
    );
  }

  @Get(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener decisión por ID' })
  @ApiParam({ name: 'id', description: 'ID de la decisión' })
  @ApiResponse({ status: 200, description: 'Decisión encontrada' })
  @ApiResponse({ status: 404, description: 'Decisión no encontrada' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.decisionService.findOne(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.COMISION_OTORGAMIENTO)
  @ApiOperation({ summary: 'Actualizar decisión' })
  @ApiParam({ name: 'id', description: 'ID de la decisión' })
  @ApiResponse({ status: 200, description: 'Decisión actualizada' })
  @ApiResponse({ status: 404, description: 'Decisión no encontrada' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDecisionDto: UpdateDecisionDto,
  ) {
    return this.decisionService.update(id, updateDecisionDto);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.COMISION_OTORGAMIENTO)
  @ApiOperation({ summary: 'Eliminar decisión' })
  @ApiParam({ name: 'id', description: 'ID de la decisión' })
  @ApiResponse({ status: 200, description: 'Decisión eliminada' })
  @ApiResponse({ status: 404, description: 'Decisión no encontrada' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.decisionService.remove(id);
  }
}
