/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NinosService } from '../nino/nino.service';
import { TrazabilidadService } from '../trazabilidad/trazabilidad.service';
import { CreateSolicitudDto, UpdateSolicitudDto } from './dto';
import { UpdateNinoDto } from '../nino/dto/update-nino.dto';
import { CreateNinoDto } from '../nino/dto/create-nino.dto';
import {
  EstadoSolicitud,
  SectorPrioridad,
  TipoSolicitud,
  RolUsuario,
} from '@prisma/client';
import { SolicitudResponseDto } from './dto/solicitud-response.dto';
import { PeriodoService } from '../periodo/periodo.service';

@Injectable()
export class SolicitudService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ninosService: NinosService,
    private readonly periodoService: PeriodoService,
    @Inject(forwardRef(() => TrazabilidadService))
    private trazabilidadService: TrazabilidadService,
  ) {}

  async create(
    data: CreateSolicitudDto,
    usuario: any,
  ): Promise<SolicitudResponseDto> {
    // Verificar que el solicitante existe
    const solicitante = await this.prisma.perfilSolicitante.findUnique({
      where: { id: data.solicitanteId },
      include: { usuario: true },
    });
    if (!solicitante) {
      throw new NotFoundException(
        `Solicitante con ID ${data.solicitanteId} no encontrado`,
      );
    }

    // Obtener período activo usando PeriodoService
    const periodoActivo = await this.periodoService.findActivo();
    if (!periodoActivo) {
      throw new NotFoundException('No hay un período de otorgamiento activo');
    }
    const fechaActual = new Date();
    if (
      fechaActual < periodoActivo.fechaInicio ||
      fechaActual > periodoActivo.fechaCierre
    ) {
      throw new ConflictException(
        'La fecha actual está fuera del período activo',
      );
    }

    // Buscar niño existente por tarjetaMenor y solicitanteId
    let nino = await this.prisma.nino.findFirst({
      where: {
        tarjetaMenor: data.nino.tarjetaMenor,
        solicitanteId: data.solicitanteId,
      },
    });

    if (!nino) {
      // Crear nuevo niño usando NinosService
      const createNinoDto: CreateNinoDto = {
        ...data.nino,
        solicitanteId: data.solicitanteId,
      };
      nino = await this.ninosService.create(createNinoDto);
    } else {
      // Verificar que pertenezca al mismo solicitante
      if (nino.solicitanteId !== data.solicitanteId) {
        throw new ConflictException(
          'El niño ya está registrado con otro solicitante',
        );
      }
    }

    // Verificar solicitud activa en el período
    const solicitudExistente = await this.prisma.solicitud.findFirst({
      where: {
        ninoId: nino.id,
        periodoId: periodoActivo.id,
        estado: { in: ['EN_REVISION', 'EN_ESPERA'] },
      },
    });
    if (solicitudExistente) {
      throw new ConflictException(
        'El niño ya tiene una solicitud activa en este período',
      );
    }

    // Calcular prioridad
    const prioridad = this.calcularPrioridad(data, nino, solicitante);

    // Crear solicitud
    const solicitud = await this.prisma.solicitud.create({
      data: {
        ninoId: nino.id,
        solicitanteId: data.solicitanteId,
        fechaSolicitud: fechaActual,
        sector: data.sector,
        tipoSolicitud: data.tipoSolicitud,
        estado: data.estado,
        periodoId: periodoActivo.id,
        observaciones: data.observaciones,
        prioridad,
      },
      include: {
        nino: true,
        periodo: true,
        solicitante: { include: { usuario: true } },
        documentos: true,
      },
    });

    // Trazabilidad inicial
    await this.trazabilidadService.crearTrazabilidadAutomatica(
      solicitud.id,
      null,
      data.estado,
      usuario.id,
      'Solicitud creada',
    );

    return this.toResponseDto(solicitud);
  }

  async findAll(
    filtros?: {
      estado?: EstadoSolicitud;
      sector?: SectorPrioridad;
      tipoSolicitud?: TipoSolicitud;
      periodoId?: string;
      solicitanteId?: string;
      ninoId?: string;
      municipio?: string;
      fechaDesde?: Date;
      fechaHasta?: Date;
    },
    usuario?: any,
  ): Promise<SolicitudResponseDto[]> {
    const where: any = {};

    if (filtros?.estado) where.estado = filtros.estado;
    if (filtros?.sector) where.sector = filtros.sector;
    if (filtros?.tipoSolicitud) where.tipoSolicitud = filtros.tipoSolicitud;
    if (filtros?.periodoId) where.periodoId = filtros.periodoId;
    if (filtros?.solicitanteId) where.solicitanteId = filtros.solicitanteId;
    if (filtros?.ninoId) where.ninoId = filtros.ninoId;

    if (filtros?.municipio) {
      where.solicitante = {
        usuario: {
          municipio: { contains: filtros.municipio, mode: 'insensitive' },
        },
      };
    }

    // Filtro por municipio para directores de círculo
    if (usuario?.rol === RolUsuario.DIRECTOR_CIRCULO && usuario.perfil) {
      where.solicitante = {
        usuario: {
          municipio: {
            contains: usuario.perfil.municipio,
            mode: 'insensitive',
          },
        },
      };
    }

    if (filtros?.fechaDesde || filtros?.fechaHasta) {
      where.fechaSolicitud = {};
      if (filtros.fechaDesde) where.fechaSolicitud.gte = filtros.fechaDesde;
      if (filtros.fechaHasta) where.fechaSolicitud.lte = filtros.fechaHasta;
    }

    const solicitudes = await this.prisma.solicitud.findMany({
      where,
      include: {
        nino: { include: { solicitante: { include: { usuario: true } } } },
        periodo: true,
        solicitante: { include: { usuario: true } },
        documentos: { where: { validado: true } },
        matricula: { include: { circulo: true } },
      },
      orderBy: [{ prioridad: 'desc' }, { fechaSolicitud: 'asc' }],
    });

    return solicitudes.map((s) => this.toResponseDto(s));
  }

  async findOne(id: string, usuario?: any): Promise<SolicitudResponseDto> {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: {
        nino: { include: { solicitante: { include: { usuario: true } } } },
        periodo: true,
        solicitante: { include: { usuario: true } },
        documentos: { include: { validador: true } },
        matricula: { include: { circulo: true, controles: true } },
      },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }

    this.verificarPermisosSolicitud(solicitud, usuario);
    return this.toResponseDto(solicitud);
  }

  async findBySolicitanteId(
    solicitanteId: string,
  ): Promise<SolicitudResponseDto[]> {
    const solicitudes = await this.prisma.solicitud.findMany({
      where: { solicitanteId },
      include: {
        nino: { include: { solicitante: { include: { usuario: true } } } },
        periodo: true,
        solicitante: { include: { usuario: true } },
        documentos: true,
        matricula: { include: { circulo: true } },
      },
      orderBy: { fechaSolicitud: 'desc' },
    });
    return solicitudes.map((s) => this.toResponseDto(s));
  }

  async findByNinoId(
    ninoId: string,
    usuario?: any,
  ): Promise<SolicitudResponseDto[]> {
    const nino = await this.ninosService.findOne(ninoId);

    if (
      usuario?.rol === RolUsuario.SOLICITANTE &&
      usuario.perfilId !== nino.solicitanteId
    ) {
      throw new ForbiddenException('Solo puedes ver niños de tu propio perfil');
    }

    const solicitudes = await this.prisma.solicitud.findMany({
      where: { ninoId },
      include: {
        nino: { include: { solicitante: { include: { usuario: true } } } },
        periodo: true,
        solicitante: { include: { usuario: true } },
        documentos: true,
        matricula: { include: { circulo: true } },
      },
      orderBy: { fechaSolicitud: 'desc' },
    });

    return solicitudes.map((s) => this.toResponseDto(s));
  }

  async findPendientesRevision(
    municipio?: string,
  ): Promise<SolicitudResponseDto[]> {
    const where: any = {
      estado: 'EN_REVISION',
      documentos: { every: { validado: true } },
    };
    if (municipio) {
      where.solicitante = {
        usuario: {
          municipio: { contains: municipio, mode: 'insensitive' },
        },
      };
    }

    const solicitudes = await this.prisma.solicitud.findMany({
      where,
      include: {
        nino: { include: { solicitante: { include: { usuario: true } } } },
        periodo: true,
        solicitante: { include: { usuario: true } },
        documentos: true,
        matricula: { include: { circulo: true } },
      },
      orderBy: { prioridad: 'desc' },
    });
    return solicitudes.map((s) => this.toResponseDto(s));
  }

  async update(
    id: string,
    data: UpdateSolicitudDto,
    usuario: any,
  ): Promise<SolicitudResponseDto> {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: {
        nino: true,
        solicitante: { include: { usuario: true } },
        periodo: true,
      },
    });
    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }

    this.verificarPermisosSolicitud(solicitud, usuario);

    const updateData: any = {};

    // Si es solicitante, solo puede modificar observaciones o cancelar (estado RECHAZADA)
    if (usuario.rol === RolUsuario.SOLICITANTE) {
      if (data.observaciones !== undefined) {
        updateData.observaciones = data.observaciones;
      }
      if (
        data.estado === EstadoSolicitud.RECHAZADA &&
        usuario.perfilId === solicitud.solicitanteId
      ) {
        updateData.estado = data.estado;
      }
    } else {
      // Otros roles pueden modificar más campos
      if (data.sector !== undefined) updateData.sector = data.sector;
      if (data.tipoSolicitud !== undefined)
        updateData.tipoSolicitud = data.tipoSolicitud;
      if (data.estado !== undefined) updateData.estado = data.estado;
      if (data.observaciones !== undefined)
        updateData.observaciones = data.observaciones;

      // Recalcular prioridad si es necesario
      const necesitaRecalcularPrioridad =
        data.necesitaActualizarPrioridad ||
        data.sector !== undefined ||
        data.tipoSolicitud !== undefined ||
        data.estado !== undefined;

      if (necesitaRecalcularPrioridad) {
        const prioridad = this.calcularPrioridad(
          {
            sector: data.sector || solicitud.sector,
            tipoSolicitud: data.tipoSolicitud || solicitud.tipoSolicitud,
            estado: data.estado || solicitud.estado,
            observaciones: data.observaciones || solicitud.observaciones,
            solicitanteId: solicitud.solicitanteId,
            nino: solicitud.nino,
          } as any,
          solicitud.nino,
          solicitud.solicitante,
        );
        updateData.prioridad = prioridad;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return this.toResponseDto(solicitud);
    }

    const solicitudActualizada = await this.prisma.solicitud.update({
      where: { id },
      data: updateData,
      include: {
        nino: true,
        periodo: true,
        solicitante: { include: { usuario: true } },
        documentos: true,
        matricula: true,
      },
    });

    // Trazabilidad si cambió el estado
    if (data.estado && data.estado !== solicitud.estado) {
      await this.trazabilidadService.crearTrazabilidadAutomatica(
        id,
        solicitud.estado,
        data.estado,
        usuario.id,
        data.estado === EstadoSolicitud.RECHAZADA &&
          usuario.rol === RolUsuario.SOLICITANTE
          ? 'Solicitud cancelada por el solicitante'
          : 'Estado actualizado',
      );
    }

    return this.toResponseDto(solicitudActualizada);
  }

  async updateNino(
    id: string,
    updateNinoDto: UpdateNinoDto,
    usuario: any,
  ): Promise<SolicitudResponseDto> {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: {
        nino: true,
        solicitante: { include: { usuario: true } },
        periodo: true,
      },
    });
    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }
    if (!solicitud.nino) {
      throw new NotFoundException(
        `No se encontró niño asociado a la solicitud`,
      );
    }

    this.verificarPermisosSolicitud(solicitud, usuario);

    // Actualizar niño usando NinosService
    const ninoActualizado = await this.ninosService.update(
      solicitud.nino.id,
      updateNinoDto,
    );

    // Recalcular prioridad si afecta
    const necesitaRecalcularPrioridad =
      updateNinoDto.casoEspecial !== undefined ||
      updateNinoDto.tipoNecesidad !== undefined;
    if (necesitaRecalcularPrioridad) {
      const prioridad = this.calcularPrioridad(
        {
          sector: solicitud.sector,
          tipoSolicitud: solicitud.tipoSolicitud,
          estado: solicitud.estado,
          observaciones: solicitud.observaciones,
          solicitanteId: solicitud.solicitanteId,
          nino: { ...solicitud.nino, ...updateNinoDto },
        } as any,
        ninoActualizado,
        solicitud.solicitante,
      );
      await this.prisma.solicitud.update({
        where: { id },
        data: { prioridad },
      });
    }

    // Obtener solicitud actualizada
    const solicitudCompleta = await this.prisma.solicitud.findUnique({
      where: { id },
      include: {
        nino: true,
        periodo: true,
        solicitante: { include: { usuario: true } },
        documentos: true,
        matricula: true,
      },
    });
    return this.toResponseDto(solicitudCompleta);
  }

  async cambiarEstado(
    id: string,
    estado: EstadoSolicitud,
    usuarioId: string,
    comentario?: string,
  ): Promise<SolicitudResponseDto> {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: {
        nino: true,
        periodo: true,
        solicitante: { include: { usuario: true } },
      },
    });
    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }

    await this.trazabilidadService.crearTrazabilidadAutomatica(
      id,
      solicitud.estado,
      estado,
      usuarioId,
      comentario || 'Cambio de estado',
    );

    const solicitudActualizada = await this.prisma.solicitud.update({
      where: { id },
      data: { estado },
      include: {
        nino: true,
        periodo: true,
        solicitante: { include: { usuario: true } },
        documentos: true,
        matricula: true,
      },
    });

    return this.toResponseDto(solicitudActualizada);
  }

  async remove(id: string, usuario: any): Promise<{ message: string }> {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: { solicitante: { include: { usuario: true } } },
    });
    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }

    this.verificarPermisosSolicitud(solicitud, usuario);

    const tieneDocumentos =
      (await this.prisma.documentoSolicitud.count({
        where: { solicitudId: id },
      })) > 0;
    const tieneDecisiones =
      (await this.prisma.decisionSolicitud.count({
        where: { solicitudId: id },
      })) > 0;
    const tieneMatricula =
      (await this.prisma.matricula.count({ where: { solicitudId: id } })) > 0;

    if (tieneDocumentos || tieneDecisiones || tieneMatricula) {
      throw new ConflictException(
        'No se puede eliminar una solicitud con documentos, decisiones o matrícula asociada',
      );
    }

    await this.prisma.solicitud.delete({ where: { id } });
    return { message: `Solicitud con ID ${id} eliminada exitosamente` };
  }

  async getEstadisticas(filtros?: { periodoId?: string; municipio?: string }) {
    const where: any = {};
    if (filtros?.periodoId) where.periodoId = filtros.periodoId;
    if (filtros?.municipio) {
      where.solicitante = {
        usuario: {
          municipio: { contains: filtros.municipio, mode: 'insensitive' },
        },
      };
    }

    const solicitudes = await this.prisma.solicitud.findMany({
      where,
      include: {
        nino: true,
        solicitante: { include: { usuario: true } },
        decisiones: true,
      },
    });

    const total = solicitudes.length;
    const porEstado = {
      EN_REVISION: 0,
      APROBADA: 0,
      RECHAZADA: 0,
      EN_ESPERA: 0,
    };
    const porSector = {
      SALUD: 0,
      EDUCACION: 0,
      DEFENSA: 0,
      CASO_SOCIAL: 0,
      OTRO: 0,
    };
    const porTipo = { TRABAJADOR: 0, ESTUDIANTE: 0, CASO_SOCIAL: 0 };

    solicitudes.forEach((s) => {
      porEstado[s.estado]++;
      porSector[s.sector]++;
      porTipo[s.tipoSolicitud]++;
    });

    const conDecision = solicitudes.filter(
      (s) => s.decisiones.length > 0,
    ).length;
    const sinDecision = total - conDecision;

    return {
      total,
      porEstado,
      porcentajesEstado: {
        EN_REVISION: total > 0 ? (porEstado.EN_REVISION / total) * 100 : 0,
        APROBADA: total > 0 ? (porEstado.APROBADA / total) * 100 : 0,
        RECHAZADA: total > 0 ? (porEstado.RECHAZADA / total) * 100 : 0,
        EN_ESPERA: total > 0 ? (porEstado.EN_ESPERA / total) * 100 : 0,
      },
      porSector,
      porTipo,
      conDecision,
      sinDecision,
      porcentajeConDecision: total > 0 ? (conDecision / total) * 100 : 0,
    };
  }

  // ========== Métodos privados ==========

  private calcularPrioridad(data: any, nino: any, solicitante: any): number {
    let prioridad = 0;

    const prioridadSector = {
      SALUD: 30,
      EDUCACION: 25,
      DEFENSA: 20,
      CASO_SOCIAL: 35,
      OTRO: 10,
    };
    prioridad += prioridadSector[data.sector] || 10;

    const prioridadTipo = { TRABAJADOR: 20, ESTUDIANTE: 25, CASO_SOCIAL: 30 };
    prioridad += prioridadTipo[data.tipoSolicitud] || 15;

    if (nino.casoEspecial) prioridad += 15;
    if (nino.tipoNecesidad) prioridad += 10;
    if (solicitante.cantHijos > 1) prioridad += (solicitante.cantHijos - 1) * 5;
    // Nota: tipoPersona ya no existe en solicitante? Se mantenía, pero si no, eliminar o ajustar
    // if (solicitante.tipoPersona === 'JURIDICA') prioridad += 5; // Comentado porque no está en el nuevo esquema

    return prioridad;
  }

  private verificarPermisosSolicitud(solicitud: any, usuario: any): void {
    if (
      [RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL].includes(
        usuario?.rol,
      )
    ) {
      return;
    }
    if (usuario?.rol === RolUsuario.COMISION_OTORGAMIENTO) {
      return;
    }
    if (usuario?.rol === RolUsuario.DIRECTOR_CIRCULO && usuario.perfil) {
      if (
        solicitud.solicitante.usuario?.municipio !== usuario.perfil.municipio
      ) {
        throw new ForbiddenException(
          'Solo puedes acceder a solicitudes de tu municipio',
        );
      }
      return;
    }
    if (usuario?.rol === RolUsuario.SOLICITANTE) {
      if (solicitud.solicitanteId !== usuario.perfilId) {
        throw new ForbiddenException(
          'Solo puedes acceder a tus propias solicitudes',
        );
      }
      return;
    }
    throw new ForbiddenException(
      'No tienes permiso para acceder a esta solicitud',
    );
  }

  private toResponseDto(solicitud: any): SolicitudResponseDto {
    // Verificaciones de integridad
    if (!solicitud) {
      throw new Error('No se proporcionó una solicitud para mapear');
    }
    if (!solicitud.nino) {
      throw new Error(`La solicitud ${solicitud.id} no tiene un niño asociado`);
    }
    if (!solicitud.solicitante) {
      throw new Error(
        `La solicitud ${solicitud.id} no tiene un solicitante asociado`,
      );
    }
    if (!solicitud.periodo) {
      throw new Error(
        `La solicitud ${solicitud.id} no tiene un período asociado`,
      );
    }

    return {
      id: solicitud.id,
      fechaSolicitud: solicitud.fechaSolicitud,
      sector: solicitud.sector,
      tipoSolicitud: solicitud.tipoSolicitud,
      estado: solicitud.estado,
      prioridad: solicitud.prioridad,
      observaciones: solicitud.observaciones,
      nino: {
        id: solicitud.nino.id,
        nombre: solicitud.nino.nombre,
        apellidos: solicitud.nino.apellidos,
        tarjetaMenor: solicitud.nino.tarjetaMenor,
        fechaNacimiento: solicitud.nino.fechaNacimiento,
        sexo: solicitud.nino.sexo,
        casoEspecial: solicitud.nino.casoEspecial,
        tipoNecesidad: solicitud.nino.tipoNecesidad,
      },
      periodo: {
        id: solicitud.periodo.id,
        nombre: solicitud.periodo.nombre,
        fechaInicio: solicitud.periodo.fechaInicio,
        fechaCierre: solicitud.periodo.fechaCierre,
      },
      solicitante: {
        id: solicitud.solicitante.id,
        correo: solicitud.solicitante.usuario?.email,
        nombre: solicitud.solicitante.usuario?.nombre,
        apellidos: solicitud.solicitante.usuario?.apellidos,
        carnetIdentidad: solicitud.solicitante.usuario?.carnetIdentidad,
        telefono: solicitud.solicitante.usuario?.telefono,
        direccion: solicitud.solicitante.direccion,
        tipoPersona: solicitud.solicitante.tipoPersona,
        cantHijos: solicitud.solicitante.cantHijos,
        centroTrabajo: solicitud.solicitante.centroTrabajo,
        municipio: solicitud.solicitante.usuario?.municipio,
        provincia: solicitud.solicitante.usuario?.provincia,
      },
      documentos:
        solicitud.documentos?.map((doc) => ({
          id: doc.id,
          tipo: doc.tipo,
          url: doc.url,
          validado: doc.validado,
        })) || [],
      matricula: solicitud.matricula || null,
    };
  }
}
