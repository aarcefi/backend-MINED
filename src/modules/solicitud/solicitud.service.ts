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
  Logger,
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
  EstadoMatricula,
} from '@prisma/client';
import { SolicitudResponseDto } from './dto/solicitud-response.dto';
import { PeriodoService } from '../periodo/periodo.service';
import { ValidacionIdentidadService } from '../validacion-ficha-unica/validacion-ficha-unica.service';
import {
  PriorityCalculator,
  PriorityContext,
} from '../../common/prioridades/index';
import { MatriculaPendienteActivacionEvent } from '../matricula/events/matricula-pendiente-activacion.event';
import { EventDispatcher } from '../../common/events/event-dispatcher.service';
import { SolicitudEstadoChangedEvent } from './events/solicitud-estado-changed.event';
import {
  DateUtilsService,
  AnioVida,
} from '../../common/utils/date-utils.service';
import { eliminarArchivosDocumentos } from '../documento/documento.service';
import { mismoMunicipio } from '../../common/utils/municipio';

const PREFIJO_COMENTARIO_AUTOMATICO = 'Cambio de estado:';

// Se filtra después de la consulta porque la coincidencia va en los dos sentidos
const delMunicipio = <T extends { solicitante?: any }>(
  solicitudes: T[],
  municipio?: string,
) =>
  municipio
    ? solicitudes.filter((s) =>
        mismoMunicipio(s.solicitante?.usuario?.municipio, municipio),
      )
    : solicitudes;

@Injectable()
export class SolicitudService {
  private readonly logger = new Logger(SolicitudService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ninosService: NinosService,
    private readonly periodoService: PeriodoService,
    @Inject(forwardRef(() => TrazabilidadService))
    private trazabilidadService: TrazabilidadService,
    private validacionFichaUnica: ValidacionIdentidadService,
    private priorityCalculator: PriorityCalculator,
    private eventDispatcher: EventDispatcher,
    private dateUtils: DateUtilsService,
  ) {}

  async create(
    data: CreateSolicitudDto,
    usuario: any,
  ): Promise<SolicitudResponseDto> {
    const solicitante = await this.prisma.perfilSolicitante.findUnique({
      where: { id: data.solicitanteId },
      include: { usuario: true },
    });
    if (!solicitante) {
      throw new NotFoundException(
        `Solicitante con ID ${data.solicitanteId} no encontrado`,
      );
    }

    const fechaActual = new Date();
    const periodoActivo =
      await this.periodoService.obtenerPeriodoActivo(fechaActual);

    // 🔥 Validar círculo si viene en el DTO
    if (data.circuloId) {
      const circulo = await this.prisma.circuloInfantil.findUnique({
        where: { id: data.circuloId },
      });
      if (!circulo) {
        throw new NotFoundException(
          `Círculo infantil con ID ${data.circuloId} no encontrado`,
        );
      }
    }

    let nino = await this.prisma.nino.findFirst({
      where: {
        tarjetaMenor: data.nino.tarjetaMenor,
        solicitanteId: data.solicitanteId,
      },
    });

    if (!nino) {
      // El carnet debe estar en el registro de identidad y el nombre sale de ahí,
      // no de lo que envíe el formulario
      const ciudadano = await this.validacionFichaUnica.obtenerNombre(
        data.nino.tarjetaMenor,
      );
      const createNinoDto: CreateNinoDto = {
        ...data.nino,
        nombre: ciudadano.nombre ?? data.nino.nombre,
        apellidos: ciudadano.apellidos ?? data.nino.apellidos,
        solicitanteId: data.solicitanteId,
      };
      nino = await this.ninosService.create(createNinoDto);
    } else {
      if (nino.solicitanteId !== data.solicitanteId) {
        throw new ConflictException(
          'El niño ya está registrado con otro solicitante',
        );
      }
    }

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

    const anioVida = this.dateUtils.calcularAnioVida(
      nino.fechaNacimiento,
      fechaActual,
    );
    if (!anioVida) {
      throw new BadRequestException(
        'El niño debe tener entre 1 y 6 años de edad para solicitar una plaza',
      );
    }

    const context: PriorityContext = {
      sector: data.sector,
      tipoSolicitud: data.tipoSolicitud,
      nino: {
        casoEspecial: nino.casoEspecial,
        tipoNecesidad: nino.tipoNecesidad ?? undefined,
      },
      solicitante: {
        cantHijos: solicitante.cantHijos,
      },
    };
    const prioridad = this.priorityCalculator.calculatePriority(context);

    if (data.tipoPersona || data.centroTrabajo !== undefined) {
      await this.prisma.perfilSolicitante.update({
        where: { id: data.solicitanteId },
        data: {
          tipoPersona: data.tipoPersona,
          centroTrabajo: data.centroTrabajo,
        },
      });
    }

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
        anioSolicitado: anioVida,
        circuloId: data.circuloId ?? null,
      },
      include: {
        nino: true,
        periodo: true,
        solicitante: { include: { usuario: true } },
        circulo: true, // 🔥 NUEVO
        documentos: true,
      },
    });

    await this.trazabilidadService.crearTrazabilidadAutomatica(
      solicitud.id,
      null,
      data.estado,
      usuario.id,
      'Solicitud creada',
      usuario,
    );

    await this.notificarPersonal(
      RolUsuario.FUNCIONARIO_MUNICIPAL,
      solicitante.usuario.municipio,
      'Nueva solicitud para revisar',
      `Se recibió la solicitud de ${nino.nombre} ${nino.apellidos}.`,
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

    const municipio =
      usuario?.rol === RolUsuario.DIRECTOR_CIRCULO && usuario.perfil
        ? usuario.perfil.municipio
        : filtros?.municipio;

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
        circulo: true,
        documentos: { where: { validado: true } },
        matricula: { include: { circulo: true } },
      },
      orderBy: [{ prioridad: 'desc' }, { fechaSolicitud: 'asc' }],
    });

    return delMunicipio(solicitudes, municipio).map((s) =>
      this.toResponseDto(s),
    );
  }

  async findOne(id: string, usuario?: any): Promise<SolicitudResponseDto> {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: {
        nino: { include: { solicitante: { include: { usuario: true } } } },
        periodo: true,
        solicitante: { include: { usuario: true } },
        circulo: true, // 🔥 NUEVO
        documentos: { include: { validador: true } },
        matricula: { include: { circulo: true, controles: true } },
        trazas: {
          where: {
            estadoNuevo: {
              in: [
                EstadoSolicitud.RECHAZADA_DIRECCION,
                EstadoSolicitud.RECHAZADA_COMISION,
              ],
            },
          },
          orderBy: { fecha: 'desc' },
          take: 1,
        },
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
        circulo: true, // 🔥 NUEVO
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
        circulo: true, // 🔥 NUEVO
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

    const solicitudes = await this.prisma.solicitud.findMany({
      where,
      include: {
        nino: { include: { solicitante: { include: { usuario: true } } } },
        periodo: true,
        solicitante: { include: { usuario: true } },
        circulo: true, // 🔥 NUEVO
        documentos: true,
        matricula: { include: { circulo: true } },
      },
      orderBy: { prioridad: 'desc' },
    });
    return delMunicipio(solicitudes, municipio).map((s) =>
      this.toResponseDto(s),
    );
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
        circulo: true, // 🔥 NUEVO
      },
    });
    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }

    this.verificarPermisosSolicitud(solicitud, usuario);

    const updateData: any = {};
    let estadoCambio = false;
    const estadoAnterior = solicitud.estado;

    // 🔥 Validar círculo si viene en el DTO
    if (data.circuloId !== undefined && data.circuloId !== null) {
      const circulo = await this.prisma.circuloInfantil.findUnique({
        where: { id: data.circuloId },
      });
      if (!circulo) {
        throw new NotFoundException(
          `Círculo infantil con ID ${data.circuloId} no encontrado`,
        );
      }
    }

    if (usuario.rol === RolUsuario.SOLICITANTE) {
      if (data.sector !== undefined) updateData.sector = data.sector;
      if (data.tipoSolicitud !== undefined)
        updateData.tipoSolicitud = data.tipoSolicitud;
      if (data.observaciones !== undefined)
        updateData.observaciones = data.observaciones;
      // 🔥 El solicitante puede actualizar el círculo
      if (data.circuloId !== undefined) updateData.circuloId = data.circuloId;
    } else {
      if (data.sector !== undefined) updateData.sector = data.sector;
      if (data.tipoSolicitud !== undefined)
        updateData.tipoSolicitud = data.tipoSolicitud;
      if (data.estado !== undefined) {
        updateData.estado = data.estado;
        if (data.estado !== estadoAnterior) {
          estadoCambio = true;
        }
      }
      if (data.observaciones !== undefined)
        updateData.observaciones = data.observaciones;
      // 🔥 Otros roles también pueden actualizar el círculo
      if (data.circuloId !== undefined) updateData.circuloId = data.circuloId;
      if (
        data.prioridad !== undefined &&
        usuario.rol === RolUsuario.COMISION_OTORGAMIENTO
      ) {
        updateData.prioridad = data.prioridad;
      }
    }

    const necesitaRecalcular =
      data.sector !== undefined || data.tipoSolicitud !== undefined;
    if (necesitaRecalcular) {
      const context: PriorityContext = {
        sector: data.sector ?? solicitud.sector,
        tipoSolicitud: data.tipoSolicitud ?? solicitud.tipoSolicitud,
        nino: {
          casoEspecial: solicitud.nino.casoEspecial,
          tipoNecesidad: solicitud.nino.tipoNecesidad ?? undefined,
        },
        solicitante: {
          cantHijos: solicitud.solicitante.cantHijos,
        },
      };
      updateData.prioridad = this.priorityCalculator.calculatePriority(context);
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
        circulo: true, // 🔥 NUEVO
        documentos: true,
        matricula: true,
      },
    });

    if (estadoCambio && data.estado) {
      await this.trazabilidadService.crearTrazabilidadAutomatica(
        id,
        estadoAnterior,
        data.estado,
        usuario.id,
        data.estado === EstadoSolicitud.RECHAZADA_COMISION ||
          data.estado === EstadoSolicitud.RECHAZADA_DIRECCION
          ? 'Solicitud rechazada'
          : 'Estado actualizado',
        usuario,
      );
    }

    if (estadoCambio && data.estado && usuario.rol !== RolUsuario.SOLICITANTE) {
      const nino = solicitud.nino;
      const solicitanteUsuario = solicitud.solicitante.usuario;
      const nombreSolicitante = `${solicitanteUsuario.nombre} ${solicitanteUsuario.apellidos}`;
      const evento = new SolicitudEstadoChangedEvent({
        solicitudId: id,
        usuarioId: solicitanteUsuario.id,
        email: solicitanteUsuario.email,
        nombreSolicitante,
        ninoNombre: nino.nombre,
        ninoApellidos: nino.apellidos,
        estadoAnterior,
        estadoNuevo: data.estado,
        comentario: data.observaciones,
      });
      await this.eventDispatcher.dispatch(evento);
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
        circulo: true, // 🔥 NUEVO
      },
    });
    if (!solicitud)
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    if (!solicitud.nino)
      throw new NotFoundException('No se encontró niño asociado');

    this.verificarPermisosSolicitud(solicitud, usuario);

    const ninoActualizado = await this.ninosService.update(
      solicitud.nino.id,
      updateNinoDto,
    );

    const necesitaRecalcular =
      updateNinoDto.casoEspecial !== undefined ||
      updateNinoDto.tipoNecesidad !== undefined;

    if (necesitaRecalcular) {
      const context: PriorityContext = {
        sector: solicitud.sector,
        tipoSolicitud: solicitud.tipoSolicitud,
        nino: {
          casoEspecial: ninoActualizado.casoEspecial,
          tipoNecesidad: ninoActualizado.tipoNecesidad ?? undefined,
        },
        solicitante: {
          cantHijos: solicitud.solicitante.cantHijos,
        },
      };
      const nuevaPrioridad = this.priorityCalculator.calculatePriority(context);
      await this.prisma.solicitud.update({
        where: { id },
        data: { prioridad: nuevaPrioridad },
      });
    }

    const solicitudCompleta = await this.prisma.solicitud.findUnique({
      where: { id },
      include: {
        nino: true,
        periodo: true,
        solicitante: { include: { usuario: true } },
        circulo: true, // 🔥 NUEVO
        documentos: true,
        matricula: true,
      },
    });
    return this.toResponseDto(solicitudCompleta);
  }

  async cambiarEstado(
    id: string,
    nuevoEstado: EstadoSolicitud,
    usuario: any,
    comentario?: string,
    circuloId?: string,
  ): Promise<SolicitudResponseDto> {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: {
        nino: true,
        periodo: true,
        solicitante: { include: { usuario: true } },
        circulo: true,
      },
    });
    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }

    this.verificarPermisosSolicitud(solicitud, usuario);

    if (usuario.rol === RolUsuario.SOLICITANTE) {
      throw new ForbiddenException(
        'Los solicitantes no pueden cambiar el estado de sus solicitudes',
      );
    }

    const estadoAnterior = solicitud.estado;

    // 🔥 Crear matrícula si se aprueba por comisión: usa el círculo elegido por
    // la comisión o, si no eligió ninguno, el preferido en la solicitud
    if (nuevoEstado === EstadoSolicitud.APROBADA_COMISION) {
      let circuloAsignado = solicitud.circulo;

      if (circuloId && circuloId !== solicitud.circuloId) {
        circuloAsignado = await this.prisma.circuloInfantil.findUnique({
          where: { id: circuloId },
        });
        if (!circuloAsignado?.activo) {
          throw new NotFoundException(
            'El círculo seleccionado no existe o no está activo',
          );
        }
      }

      if (!circuloAsignado) {
        throw new BadRequestException(
          'Debe seleccionar un círculo infantil para otorgar la plaza.',
        );
      }

      const matriculaExistente = await this.prisma.matricula.findUnique({
        where: { solicitudId: id },
      });
      if (matriculaExistente) {
        throw new ConflictException(
          'Esta solicitud ya tiene una matrícula asignada',
        );
      }

      const fechaOtorgamiento = new Date();
      const fechaLimite = this.calcularFechaLimite(fechaOtorgamiento, 5);

      if (circuloAsignado.id !== solicitud.circuloId) {
        await this.prisma.solicitud.update({
          where: { id },
          data: { circuloId: circuloAsignado.id },
        });
      }

      const matricula = await this.prisma.matricula.create({
        data: {
          solicitudId: id,
          circuloId: circuloAsignado.id,
          fechaOtorgamiento,
          fechaLimite,
          estado: EstadoMatricula.ESPERANDO_ACTIVACION,
          boletaUrl: null,
          folio: await this.generarFolioUnico(),
        },
      });

      // Notificar al director del círculo
      const director = await this.prisma.perfilDirector.findUnique({
        where: { circuloId: circuloAsignado.id },
        include: { usuario: true },
      });

      if (director?.usuario) {
        const evento = new MatriculaPendienteActivacionEvent({
          matriculaId: matricula.id,
          folio: matricula.folio,
          circuloNombre: circuloAsignado.nombre,
          directorId: director.usuario.id,
          directorEmail: director.usuario.email,
          directorNombre: `${director.usuario.nombre} ${director.usuario.apellidos}`,
          fechaOtorgamiento: matricula.fechaOtorgamiento,
          fechaLimite: matricula.fechaLimite,
        });
        await this.eventDispatcher.dispatch(evento);
      }
    }

    // Trazabilidad
    await this.trazabilidadService.crearTrazabilidadAutomatica(
      id,
      solicitud.estado,
      nuevoEstado,
      usuario.id,
      comentario || `Cambio de estado: ${solicitud.estado} → ${nuevoEstado}`,
      usuario,
    );

    // Actualizar estado
    const solicitudActualizada = await this.prisma.solicitud.update({
      where: { id },
      data: { estado: nuevoEstado },
      include: {
        nino: true,
        periodo: true,
        solicitante: { include: { usuario: true } },
        circulo: true, // 🔥 NUEVO
        documentos: true,
        matricula: true,
      },
    });

    // Disparar evento para notificaciones al solicitante
    const solicitanteUsuario = solicitud.solicitante.usuario;
    const nino = solicitud.nino;
    const nombreSolicitante = `${solicitanteUsuario.nombre} ${solicitanteUsuario.apellidos}`;

    const evento = new SolicitudEstadoChangedEvent({
      solicitudId: id,
      usuarioId: solicitanteUsuario.id,
      email: solicitanteUsuario.email,
      nombreSolicitante,
      ninoNombre: nino.nombre,
      ninoApellidos: nino.apellidos,
      estadoAnterior,
      estadoNuevo: nuevoEstado,
      comentario,
    });
    await this.eventDispatcher.dispatch(evento);

    if (nuevoEstado === EstadoSolicitud.APROBADA_DIRECCION) {
      await this.notificarPersonal(
        RolUsuario.COMISION_OTORGAMIENTO,
        solicitanteUsuario.municipio,
        'Solicitud lista para evaluar',
        `La Dirección Municipal aprobó la solicitud de ${nino.nombre} ${nino.apellidos}.`,
      );
    }

    return this.toResponseDto(solicitudActualizada);
  }

  // ========== Métodos auxiliares ==========

  // Aviso interno: si falla, la operación principal ya está hecha y no se revierte
  private async notificarPersonal(
    rol: RolUsuario,
    municipio: string,
    titulo: string,
    mensaje: string,
  ) {
    try {
      const usuarios = await this.prisma.usuario.findMany({
        where: { rol, activo: true },
        select: { id: true, municipio: true },
      });
      await this.prisma.notificacion.createMany({
        data: usuarios
          .filter((u) => mismoMunicipio(u.municipio, municipio))
          .map((u) => ({ usuarioId: u.id, titulo, mensaje, tipo: 'SISTEMA' })),
      });
    } catch (error) {
      this.logger.error('No se pudo notificar al personal', error);
    }
  }

  private calcularFechaLimite(fechaInicio: Date, diasHabiles: number): Date {
    const fecha = new Date(fechaInicio);
    let diasAgregados = 0;
    while (diasAgregados < diasHabiles) {
      fecha.setDate(fecha.getDate() + 1);
      const diaSemana = fecha.getDay();
      if (diaSemana !== 0 && diaSemana !== 6) {
        // No sábado ni domingo
        diasAgregados++;
      }
    }
    return fecha;
  }

  private async generarFolioUnico(): Promise<string> {
    const fecha = new Date();
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    let folio = `MAT-${year}${month}${day}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    let intentos = 0;
    while (intentos < 10) {
      const existe = await this.prisma.matricula.findUnique({
        where: { folio },
      });
      if (!existe) return folio;
      folio = `MAT-${year}${month}${day}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      intentos++;
    }
    throw new Error('No se pudo generar folio único');
  }

  async remove(id: string, usuario: any): Promise<{ message: string }> {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: {
        solicitante: { include: { usuario: true } },
        documentos: { select: { archivoUrl: true } },
      },
    });
    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }

    this.verificarPermisosSolicitud(solicitud, usuario);

    if (
      usuario?.rol === RolUsuario.SOLICITANTE &&
      solicitud.estado !== EstadoSolicitud.EN_REVISION
    ) {
      throw new ConflictException(
        'Solo se puede retirar una solicitud que sigue en revisión',
      );
    }

    const tieneDecisiones =
      (await this.prisma.decisionSolicitud.count({
        where: { solicitudId: id },
      })) > 0;
    const tieneMatricula =
      (await this.prisma.matricula.count({ where: { solicitudId: id } })) > 0;

    if (tieneDecisiones || tieneMatricula) {
      throw new ConflictException(
        'No se puede eliminar una solicitud con decisiones o matrícula asociada',
      );
    }

    await this.prisma.solicitud.delete({ where: { id } });
    await eliminarArchivosDocumentos(
      solicitud.documentos.map((documento) => documento.archivoUrl),
    );
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
      REVISADA: 0,
      APROBADA_COMISION: 0,
      APROBADA_DIRECCION: 0,
      RECHAZADA_COMISION: 0,
      RECHAZADA_DIRECCION: 0,
      EN_ESPERA: 0,
    };
    const porSector: Record<string, number> = {};
    const porTipo = { TRABAJADOR: 0, ESTUDIANTE: 0, CASO_SOCIAL: 0 };

    solicitudes.forEach((s) => {
      porEstado[s.estado]++;
      porSector[s.sector] = (porSector[s.sector] ?? 0) + 1;
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
        REVISADA: total > 0 ? (porEstado.REVISADA / total) * 100 : 0,
        APROBADA_COMISION:
          total > 0 ? (porEstado.APROBADA_COMISION / total) * 100 : 0,
        APROBADA_DIRECCION:
          total > 0 ? (porEstado.APROBADA_DIRECCION / total) * 100 : 0,
        RECHAZADA_COMISION:
          total > 0 ? (porEstado.RECHAZADA_COMISION / total) * 100 : 0,
        RECHAZADA_DIRECCION:
          total > 0 ? (porEstado.RECHAZADA_DIRECCION / total) * 100 : 0,
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

  private verificarPermisosSolicitud(solicitud: any, usuario: any): void {
    if (
      usuario?.rol === RolUsuario.ADMINISTRADOR ||
      usuario?.rol === RolUsuario.COMISION_OTORGAMIENTO
    ) {
      return;
    }
    if ([RolUsuario.FUNCIONARIO_MUNICIPAL].includes(usuario?.rol)) {
      if (
        !mismoMunicipio(
          solicitud.solicitante.usuario?.municipio,
          usuario.municipio,
        )
      ) {
        throw new ForbiddenException(
          'Solo puedes acceder a solicitudes de tu municipio',
        );
      }
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

  private obtenerMotivoDenegacion(solicitud: any): string | null {
    const comentario: string | undefined = solicitud.trazas?.[0]?.comentario;
    return comentario && !comentario.startsWith(PREFIJO_COMENTARIO_AUTOMATICO)
      ? comentario
      : null;
  }

  private toResponseDto(solicitud: any): SolicitudResponseDto {
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
      anioVida: solicitud.anioSolicitado,
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
      // 🔥 NUEVO
      circulo: solicitud.circulo
        ? {
            id: solicitud.circulo.id,
            nombre: solicitud.circulo.nombre,
            direccion: solicitud.circulo.direccion,
            municipio: solicitud.circulo.municipio,
            provincia: solicitud.circulo.provincia,
            tipo: solicitud.circulo.tipo,
            tieneSextoAnio: solicitud.circulo.tieneSextoAnio,
          }
        : null,
      documentos:
        solicitud.documentos?.map((doc) => ({
          id: doc.id,
          tipo: doc.tipoDocumento,
          nombreArchivo: doc.nombreArchivo,
          validado: doc.validado,
        })) || [],
      matricula: solicitud.matricula || null,
      motivoDenegacion: this.obtenerMotivoDenegacion(solicitud),
    };
  }
}
