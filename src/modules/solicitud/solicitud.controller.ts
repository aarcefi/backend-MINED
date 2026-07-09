/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
  Request,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Roles } from '../../auth/decorators/roles.decorator';
import {
  RolUsuario,
  EstadoSolicitud,
  SectorPrioridad,
  TipoSolicitud,
} from '../../common/index';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { SolicitudService } from './solicitud.service';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { UpdateSolicitudDto } from './dto/update-solicitud.dto';
import { SolicitudResponseDto } from './dto/solicitud-response.dto';
import { SolicitudListResponseDto } from './dto/solicitud-list-response.dto';
import { UpdateNinoDto } from '../nino/index';

@ApiTags('Solicitudes')
@ApiBearerAuth()
@Controller('solicitud')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SolicitudController {
  constructor(private readonly solicitudService: SolicitudService) {}

  @Post()
  @Roles(RolUsuario.SOLICITANTE, RolUsuario.FUNCIONARIO_MUNICIPAL)
  @ApiOperation({ summary: 'Crear nueva solicitud' })
  @ApiResponse({ status: 201, description: 'Solicitud creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({
    status: 404,
    description: 'Tutor no encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'El niño ya tiene una solicitud activa en este período',
  })
  create(@Request() req, @Body() dto: CreateSolicitudDto) {
    return this.solicitudService.create(dto, req.user);
  }

  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener todas las solicitudes' })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: EstadoSolicitud,
    description: 'Filtrar por estado',
  })
  @ApiQuery({
    name: 'sector',
    required: false,
    enum: SectorPrioridad,
    description: 'Filtrar por sector',
  })
  @ApiQuery({
    name: 'tipoSolicitud',
    required: false,
    enum: TipoSolicitud,
    description: 'Filtrar por tipo',
  })
  @ApiQuery({
    name: 'periodoId',
    required: false,
    description: 'Filtrar por período',
  })
  @ApiQuery({
    name: 'solicitanteId',
    required: false,
    description: 'Filtrar por solicitante',
  })
  @ApiQuery({
    name: 'ninoId',
    required: false,
    description: 'Filtrar por niño',
  })
  @ApiQuery({
    name: 'municipio',
    required: false,
    description: 'Filtrar por municipio',
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
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitudes',
    type: [SolicitudListResponseDto],
  })
  findAll(
    @Request() req,
    @Query('estado') estado?: EstadoSolicitud | 'APROBADA' | 'RECHAZADA',
    @Query('sector') sector?: SectorPrioridad,
    @Query('tipoSolicitud') tipoSolicitud?: TipoSolicitud,
    @Query('periodoId') periodoId?: string,
    @Query('solicitanteId') solicitanteId?: string,
    @Query('ninoId') ninoId?: string,
    @Query('municipio') municipio?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
  ) {
    if (req.user.rol === RolUsuario.SOLICITANTE) {
      if (!req.user.perfilId) {
        throw new UnauthorizedException('Perfil de solicitante no encontrado');
      }
      solicitanteId = req.user.perfilId;
    }

    if (req.user.rol === RolUsuario.DIRECTOR_CIRCULO && req.user.perfil) {
      municipio = req.user.perfil.municipio;
    }

    const estadoNormalizado =
      estado === 'APROBADA'
        ? EstadoSolicitud.APROBADA_DIRECCION
        : estado === 'RECHAZADA'
          ? EstadoSolicitud.RECHAZADA_DIRECCION
          : estado;

    return this.solicitudService.findAll(
      {
        estado: estadoNormalizado,
        sector,
        tipoSolicitud,
        periodoId,
        solicitanteId,
        ninoId,
        municipio,
        fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
        fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
      },
      req.user,
    );
  }

  @Get('pendientes-revision')
  @Roles(
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener solicitudes pendientes de revisión' })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitudes pendientes de revisión',
    type: [SolicitudListResponseDto],
  })
<<<<<<< HEAD
  findPendientesRevision(
    @Request() req,
    @Query('municipio') municipioQuery?: string,
  ) {
    // Filtrar por municipio si es director de círculo
    const municipio =
      req.user.rol === RolUsuario.DIRECTOR_CIRCULO
        ? req.user.perfil?.municipio
        : municipioQuery || req.user.municipio;

=======
  findPendientesRevision(@Request() req) {
    const municipio =
      req.user.rol === RolUsuario.DIRECTOR_CIRCULO
        ? req.user.perfil?.municipio
        : undefined;
>>>>>>> 78b2c27 (Ultimo commit antes de exponer)
    return this.solicitudService.findPendientesRevision(municipio);
  }

  @Get('solicitante/:solicitanteId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.SOLICITANTE,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener solicitudes por solicitante' })
  @ApiParam({ name: 'solicitanteId', description: 'ID del solicitante' })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitudes del solicitante',
    type: [SolicitudListResponseDto],
  })
  findBySolicitanteId(
    @Request() req,
    @Param('solicitanteId', ParseUUIDPipe) solicitanteId: string,
  ) {
    if (req.user.rol === RolUsuario.SOLICITANTE) {
      if (!req.user.perfilId) {
        throw new UnauthorizedException('Perfil de solicitante no encontrado');
      }
      solicitanteId = req.user.perfilId;
    }
    return this.solicitudService.findBySolicitanteId(solicitanteId);
  }

  @Get('nino/:ninoId')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.SOLICITANTE,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener solicitudes por niño' })
  @ApiParam({ name: 'ninoId', description: 'ID del niño' })
  @ApiResponse({
    status: 200,
    description: 'Lista de solicitudes del niño',
    type: [SolicitudListResponseDto],
  })
  findByNinoId(@Request() req, @Param('ninoId', ParseUUIDPipe) ninoId: string) {
    return this.solicitudService.findByNinoId(ninoId, req.user);
  }

  @Get('estadisticas')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener estadísticas de solicitudes' })
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
  @ApiResponse({ status: 200, description: 'Estadísticas de solicitudes' })
  getEstadisticas(
    @Request() req,
    @Query('periodoId') periodoId?: string,
    @Query('municipio') municipio?: string,
  ) {
    if (req.user.rol === RolUsuario.DIRECTOR_CIRCULO && req.user.perfil) {
      municipio = req.user.perfil.municipio;
    }
    return this.solicitudService.getEstadisticas({ periodoId, municipio });
  }

  @Get(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Obtener solicitud por ID' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({
    status: 200,
    description: 'Solicitud encontrada',
    type: SolicitudResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  findOne(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.solicitudService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.SOLICITANTE,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({
    summary: 'Actualizar datos de la solicitud (sin datos del niño)',
  })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud actualizada' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  update(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSolicitudDto,
  ) {
    return this.solicitudService.update(id, dto, req.user);
  }

  @Patch(':id/nino')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.SOLICITANTE,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({
    summary: 'Actualizar datos del niño asociado a la solicitud',
  })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Datos del niño actualizados' })
  @ApiResponse({ status: 404, description: 'Solicitud o niño no encontrado' })
  async updateNino(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateNinoDto: UpdateNinoDto,
  ) {
    return this.solicitudService.updateNino(id, updateNinoDto, req.user);
  }

  @Patch(':id/estado')
  @Roles(
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.COMISION_OTORGAMIENTO,
    RolUsuario.DIRECTOR_CIRCULO,
  )
  @ApiOperation({ summary: 'Cambiar estado de solicitud' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        estado: {
          type: 'string',
          enum: Object.values(EstadoSolicitud),
          example: 'APROBADA_COMISION',
        },
        comentario: {
          type: 'string',
          example: 'Aprobada por comisión',
          nullable: true,
        },
        circuloId: {
          type: 'string',
          description:
            'ID del círculo asignado (requerido si el estado es APROBADA_COMISION)',
          example: '123e4567-e89b-12d3-a456-426614174000',
          nullable: true,
        },
      },
      required: ['estado'],
    },
  })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 400, description: 'Estado requerido o falta círculo' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  cambiarEstado(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('estado') estado: EstadoSolicitud | 'APROBADA' | 'RECHAZADA',
    @Body('comentario') comentario?: string,
    @Body('circuloId') circuloId?: string,
  ) {
    if (!estado) {
      throw new BadRequestException('El campo "estado" es requerido');
    }
<<<<<<< HEAD
    const estadoNormalizado =
      estado === 'APROBADA'
        ? req.user.rol === RolUsuario.COMISION_OTORGAMIENTO
          ? EstadoSolicitud.APROBADA_COMISION
          : EstadoSolicitud.APROBADA_DIRECCION
        : estado === 'RECHAZADA'
          ? req.user.rol === RolUsuario.COMISION_OTORGAMIENTO
            ? EstadoSolicitud.RECHAZADA_COMISION
            : EstadoSolicitud.RECHAZADA_DIRECCION
          : estado;

=======
    if (estado === EstadoSolicitud.APROBADA_COMISION && !circuloId) {
      throw new BadRequestException(
        'Se requiere el ID del círculo para aprobar la solicitud',
      );
    }
>>>>>>> 78b2c27 (Ultimo commit antes de exponer)
    return this.solicitudService.cambiarEstado(
      id,
      estadoNormalizado,
      req.user,
      comentario,
      circuloId,
    );
  }

  @Delete(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR,
    RolUsuario.FUNCIONARIO_MUNICIPAL,
    RolUsuario.SOLICITANTE,
  )
  @ApiOperation({ summary: 'Eliminar solicitud' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Solicitud eliminada' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  @ApiResponse({
    status: 409,
    description:
      'No se puede eliminar una solicitud con documentos, decisiones o matrícula asociada',
  })
  remove(@Request() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.solicitudService.remove(id, req.user);
  }
}
