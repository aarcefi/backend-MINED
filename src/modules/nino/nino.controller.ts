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
import { NinosService } from './nino.service';
import { CreateNinoDto } from './dto/create-nino.dto';
import { UpdateNinoDto } from './dto/update-nino.dto';

@ApiTags('Niños')
@ApiBearerAuth()
@Controller('ninos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NinoController {
  constructor(private readonly ninosService: NinosService) {}

  @Post()
  @Roles(RolUsuario.SOLICITANTE, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Registrar nuevo niño' })
  @ApiResponse({ status: 201, description: 'Niño registrado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Solicitante no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'La tarjeta del menor ya está registrada',
  })
  create(@Body() createNinoDto: CreateNinoDto) {
    return this.ninosService.create(createNinoDto);
  }

  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
  )
  @ApiOperation({ summary: 'Obtener todos los niños' })
  @ApiQuery({
    name: 'solicitanteId',
    required: false,
    description: 'Filtrar por solicitante',
  })
  @ApiQuery({
    name: 'casoEspecial',
    required: false,
    type: Boolean,
    description: 'Filtrar por caso especial',
  })
  @ApiQuery({
    name: 'edadMin',
    required: false,
    type: Number,
    description: 'Filtrar por edad mínima (años)',
  })
  @ApiQuery({
    name: 'edadMax',
    required: false,
    type: Number,
    description: 'Filtrar por edad máxima (años)',
  })
  @ApiQuery({ name: 'sexo', required: false, description: 'Filtrar por sexo' })
  @ApiQuery({
    name: 'tipoNecesidad',
    required: false,
    description: 'Filtrar por tipo de necesidad',
  })
  @ApiResponse({ status: 200, description: 'Lista de niños' })
  findAll(
    @Query('solicitanteId') solicitanteId?: string,
    @Query('casoEspecial') casoEspecial?: boolean,
    @Query('edadMin') edadMin?: number,
    @Query('edadMax') edadMax?: number,
    @Query('sexo') sexo?: string,
    @Query('tipoNecesidad') tipoNecesidad?: string,
  ) {
    return this.ninosService.findAll({
      solicitanteId,
      casoEspecial:
        casoEspecial !== undefined ? Boolean(casoEspecial) : undefined,
      edadMin: edadMin !== undefined ? Number(edadMin) : undefined,
      edadMax: edadMax !== undefined ? Number(edadMax) : undefined,
      sexo,
      tipoNecesidad,
    });
  }

  @Get('sin-solicitud')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Obtener niños sin solicitud activa' })
  @ApiQuery({
    name: 'periodoActivoId',
    required: false,
    description: 'ID del período activo para filtrar',
  })
  @ApiResponse({ status: 200, description: 'Lista de niños sin solicitud' })
  findSinSolicitud(@Query('periodoActivoId') periodoActivoId?: string) {
    return this.ninosService.findSinSolicitud(periodoActivoId);
  }

  @Get('casos-especiales')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
  )
  @ApiOperation({ summary: 'Obtener niños con casos especiales' })
  @ApiQuery({
    name: 'tipoNecesidad',
    required: false,
    description: 'Filtrar por tipo de necesidad',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de niños con casos especiales',
  })
  findCasosEspeciales(@Query('tipoNecesidad') tipoNecesidad?: string) {
    return this.ninosService.findCasosEspeciales(tipoNecesidad);
  }

  @Get('estadisticas')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Obtener estadísticas de niños' })
  @ApiResponse({ status: 200, description: 'Estadísticas de niños' })
  getEstadisticas() {
    return this.ninosService.getEstadisticas();
  }

  @Get('solicitante/:solicitanteId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener niños por solicitante' })
  @ApiParam({ name: 'solicitanteId', description: 'ID del solicitante' })
  @ApiResponse({ status: 200, description: 'Lista de niños del solicitante' })
  findBySolicitanteId(
    @Param('solicitanteId', ParseUUIDPipe) solicitanteId: string,
  ) {
    return this.ninosService.findBySolicitanteId(solicitanteId);
  }

  @Get('tarjeta/:tarjetaMenor')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener niño por tarjeta del menor' })
  @ApiParam({
    name: 'tarjetaMenor',
    description: 'Número de tarjeta del menor',
  })
  @ApiResponse({ status: 200, description: 'Niño encontrado' })
  @ApiResponse({ status: 404, description: 'Niño no encontrado' })
  findByTarjetaMenor(@Param('tarjetaMenor') tarjetaMenor: string) {
    return this.ninosService.findByTarjetaMenor(tarjetaMenor);
  }

  @Get(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener niño por ID' })
  @ApiParam({ name: 'id', description: 'ID del niño' })
  @ApiResponse({ status: 200, description: 'Niño encontrado' })
  @ApiResponse({ status: 404, description: 'Niño no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ninosService.findOne(id);
  }

  @Get(':id/historial')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener historial completo del niño' })
  @ApiParam({ name: 'id', description: 'ID del niño' })
  @ApiResponse({ status: 200, description: 'Historial del niño' })
  getHistorialCompleto(@Param('id', ParseUUIDPipe) id: string) {
    return this.ninosService.getHistorialCompleto(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.SOLICITANTE, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Actualizar niño' })
  @ApiParam({ name: 'id', description: 'ID del niño' })
  @ApiResponse({ status: 200, description: 'Niño actualizado' })
  @ApiResponse({ status: 404, description: 'Niño no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'La tarjeta del menor ya está registrada',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateNinoDto: UpdateNinoDto,
  ) {
    return this.ninosService.update(id, updateNinoDto);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Eliminar niño' })
  @ApiParam({ name: 'id', description: 'ID del niño' })
  @ApiResponse({ status: 200, description: 'Niño eliminado' })
  @ApiResponse({ status: 404, description: 'Niño no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'No se puede eliminar un niño con solicitudes activas',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.ninosService.remove(id);
  }
}
