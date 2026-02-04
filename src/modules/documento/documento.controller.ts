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
import { RolUsuario, TipoDocumento } from '../../common/index';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { DocumentoService } from './documento.service';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';

@ApiTags('Documentos de Solicitud')
@ApiBearerAuth()
@Controller('documentos-solicitud')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentoController {
  constructor(private readonly documentoService: DocumentoService) {}

  @Post()
  @Roles(RolUsuario.SOLICITANTE, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Subir nuevo documento para solicitud' })
  @ApiResponse({ status: 201, description: 'Documento subido exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  create(@Body() createDocumentoDto: CreateDocumentoDto) {
    return this.documentoService.create(createDocumentoDto);
  }

  @Post('multiple')
  @Roles(RolUsuario.SOLICITANTE, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Subir múltiples documentos' })
  @ApiResponse({ status: 201, description: 'Documentos subidos exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  createMultiple(@Body() createDocumentosDto: CreateDocumentoDto[]) {
    return this.documentoService.createMultiple(createDocumentosDto);
  }

  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
  )
  @ApiOperation({ summary: 'Obtener todos los documentos' })
  @ApiQuery({
    name: 'solicitudId',
    required: false,
    description: 'Filtrar por solicitud',
  })
  @ApiQuery({
    name: 'tipo',
    required: false,
    enum: TipoDocumento,
    description: 'Filtrar por tipo',
  })
  @ApiQuery({
    name: 'validado',
    required: false,
    type: Boolean,
    description: 'Filtrar por estado de validación',
  })
  @ApiQuery({
    name: 'validadorId',
    required: false,
    description: 'Filtrar por validador',
  })
  @ApiResponse({ status: 200, description: 'Lista de documentos' })
  findAll(
    @Query('solicitudId') solicitudId?: string,
    @Query('tipo') tipo?: TipoDocumento,
    @Query('validado') validado?: boolean,
    @Query('validadorId') validadorId?: string,
  ) {
    return this.documentoService.findAll({
      solicitudId,
      tipo,
      validado: validado !== undefined ? Boolean(validado) : undefined,
      validadorId,
    });
  }

  @Get('solicitud/:solicitudId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener documentos por solicitud' })
  @ApiParam({ name: 'solicitudId', description: 'ID de la solicitud' })
  @ApiQuery({
    name: 'tipo',
    required: false,
    enum: TipoDocumento,
    description: 'Filtrar por tipo',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de documentos de la solicitud',
  })
  findBySolicitudId(
    @Param('solicitudId', ParseUUIDPipe) solicitudId: string,
    @Query('tipo') tipo?: TipoDocumento,
  ) {
    return this.documentoService.findBySolicitudId(solicitudId, tipo);
  }

  @Get('solicitud/:solicitudId/tipo/:tipo')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener documentos por solicitud y tipo' })
  @ApiParam({ name: 'solicitudId', description: 'ID de la solicitud' })
  @ApiParam({
    name: 'tipo',
    enum: TipoDocumento,
    description: 'Tipo de documento',
  })
  @ApiResponse({ status: 200, description: 'Lista de documentos filtrados' })
  findBySolicitudAndTipo(
    @Param('solicitudId', ParseUUIDPipe) solicitudId: string,
    @Param('tipo') tipo: TipoDocumento,
  ) {
    return this.documentoService.findBySolicitudAndTipo(solicitudId, tipo);
  }

  @Get('pendientes-validacion')
  @Roles(RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Obtener documentos pendientes de validación' })
  @ApiQuery({
    name: 'validadorId',
    required: false,
    description: 'Filtrar por validador',
  })
  @ApiResponse({ status: 200, description: 'Lista de documentos pendientes' })
  findPendientesValidacion(@Query('validadorId') validadorId?: string) {
    return this.documentoService.findPendientesValidacion(validadorId);
  }

  @Get(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Obtener documento por ID' })
  @ApiParam({ name: 'id', description: 'ID del documento' })
  @ApiResponse({ status: 200, description: 'Documento encontrado' })
  @ApiResponse({ status: 404, description: 'Documento no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentoService.findOne(id);
  }

  @Patch(':id')
  @Roles(RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Actualizar documento' })
  @ApiParam({ name: 'id', description: 'ID del documento' })
  @ApiResponse({ status: 200, description: 'Documento actualizado' })
  @ApiResponse({ status: 404, description: 'Documento no encontrado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDocumentoDto: UpdateDocumentoDto,
  ) {
    return this.documentoService.update(id, updateDocumentoDto);
  }

  @Patch(':id/validar')
  @Roles(RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Validar documento' })
  @ApiParam({ name: 'id', description: 'ID del documento' })
  @ApiResponse({ status: 200, description: 'Documento validado' })
  @ApiResponse({ status: 404, description: 'Documento no encontrado' })
  validarDocumento(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('validado') validado: boolean,
    @Body('validadorId') validadorId: string,
  ) {
    return this.documentoService.validarDocumento(id, validado, validadorId);
  }

  @Delete(':id')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Eliminar documento' })
  @ApiParam({ name: 'id', description: 'ID del documento' })
  @ApiResponse({ status: 200, description: 'Documento eliminado' })
  @ApiResponse({ status: 404, description: 'Documento no encontrado' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentoService.remove(id);
  }

  @Get('estadisticas/validacion')
  @Roles(RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Obtener estadísticas de validación' })
  @ApiResponse({ status: 200, description: 'Estadísticas de validación' })
  getEstadisticasValidacion() {
    return this.documentoService.getEstadisticasValidacion();
  }
}
