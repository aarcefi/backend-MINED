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
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSolicitudDto, UpdateSolicitudDto } from './dto';
import { UpdateNinoDto } from '../nino/index';
import {
  EstadoSolicitud,
  SectorPrioridad,
  TipoSolicitud,
  RolUsuario,
} from '@prisma/client';

@Injectable()
export class SolicitudService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateSolicitudDto, usuario: any) {
    // Verificar que el solicitante existe
    const solicitante = await this.prisma.perfilSolicitante.findUnique({
      where: { id: data.solicitanteId },
    });

    if (!solicitante) {
      throw new NotFoundException(
        `Solicitante con ID ${data.solicitanteId} no encontrado`,
      );
    }

    // Determinar el período activo automáticamente con la fecha actual
    const fechaActual = new Date();
    const periodoId = await this.obtenerPeriodoActivo(fechaActual);

    const periodo = await this.prisma.periodoOtorgamiento.findUnique({
      where: { id: periodoId },
    });

    if (!periodo) {
      throw new NotFoundException(`Período activo no encontrado`);
    }

    if (!periodo.activo) {
      throw new ConflictException('El período seleccionado no está activo');
    }

    // Verificar que la fecha actual esté dentro del período
    if (
      fechaActual < periodo.fechaInicio ||
      fechaActual > periodo.fechaCierre
    ) {
      throw new ConflictException(
        'La fecha actual está fuera del período activo',
      );
    }

    // Convertir la fecha de nacimiento de string a Date
    let fechaNacimientoDate: Date;
    try {
      fechaNacimientoDate = new Date(data.nino.fechaNacimiento);
      if (isNaN(fechaNacimientoDate.getTime())) {
        throw new Error('Fecha inválida');
      }
    } catch (error) {
      throw new BadRequestException(
        'Fecha de nacimiento inválida. Use formato YYYY-MM-DD',
      );
    }

    // Buscar o crear niño basado en CI/tarjeta menor
    let nino = await this.prisma.nino.findFirst({
      where: {
        tarjetaMenor: data.nino.tarjetaMenor,
        solicitanteId: data.solicitanteId,
      },
    });

    if (!nino) {
      // Crear nuevo niño con los datos proporcionados
      nino = await this.prisma.nino.create({
        data: {
          nombre: data.nino.nombre,
          apellidos: data.nino.apellidos,
          fechaNacimiento: fechaNacimientoDate,
          sexo: data.nino.sexo,
          tarjetaMenor: data.nino.tarjetaMenor,
          solicitanteId: data.solicitanteId,
          casoEspecial: data.nino.casoEspecial || false,
          tipoNecesidad: data.nino.tipoNecesidad || null,
        },
      });
    } else {
      // Si el niño ya existe, verificar que pertenezca al mismo solicitante
      if (nino.solicitanteId !== data.solicitanteId) {
        throw new ConflictException(
          'El niño ya está registrado con otro solicitante',
        );
      }
    }

    // Verificar que el niño no tenga ya una solicitud activa en este período
    const solicitudExistente = await this.prisma.solicitud.findFirst({
      where: {
        ninoId: nino.id,
        periodoId: periodoId,
        estado: {
          in: ['EN_REVISION', 'EN_ESPERA'],
        },
      },
    });

    if (solicitudExistente) {
      throw new ConflictException(
        'El niño ya tiene una solicitud activa en este período',
      );
    }

    // Calcular prioridad automáticamente
    const prioridad = this.calcularPrioridad(data, nino, solicitante);

    // Crear la solicitud con fecha actual
    const solicitud = await this.prisma.solicitud.create({
      data: {
        ninoId: nino.id,
        solicitanteId: data.solicitanteId,
        fechaSolicitud: fechaActual,
        sector: data.sector,
        tipoSolicitud: data.tipoSolicitud,
        estado: data.estado,
        periodoId: periodoId,
        observaciones: data.observaciones,
        prioridad,
      },
      include: {
        nino: {
          include: {
            solicitante: true,
          },
        },
        periodo: true,
        solicitante: true,
        documentos: true,
      },
    });

    // Crear trazabilidad inicial
    await this.prisma.trazabilidad.create({
      data: {
        solicitudId: solicitud.id,
        estadoAnterior: null,
        estadoNuevo: data.estado,
        usuarioId: usuario.id,
        comentario: 'Solicitud creada',
      },
    });

    return this.mapearSolicitudResponse(solicitud);
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
  ) {
    const where: any = {};

    if (filtros?.estado) {
      where.estado = filtros.estado;
    }

    if (filtros?.sector) {
      where.sector = filtros.sector;
    }

    if (filtros?.tipoSolicitud) {
      where.tipoSolicitud = filtros.tipoSolicitud;
    }

    if (filtros?.periodoId) {
      where.periodoId = filtros.periodoId;
    }

    if (filtros?.solicitanteId) {
      where.solicitanteId = filtros.solicitanteId;
    }

    if (filtros?.ninoId) {
      where.ninoId = filtros.ninoId;
    }

    if (filtros?.municipio) {
      where.solicitante = {
        municipio: {
          contains: filtros.municipio,
          mode: 'insensitive',
        },
      };
    }

    // Filtrar por municipio si es director de círculo
    if (usuario?.rol === RolUsuario.DIRECTOR_CIRCULO && usuario.perfil) {
      where.solicitante = {
        municipio: {
          contains: usuario.perfil.municipio,
          mode: 'insensitive',
        },
      };
    }

    if (filtros?.fechaDesde || filtros?.fechaHasta) {
      where.fechaSolicitud = {};

      if (filtros.fechaDesde) {
        where.fechaSolicitud.gte = filtros.fechaDesde;
      }

      if (filtros.fechaHasta) {
        where.fechaSolicitud.lte = filtros.fechaHasta;
      }
    }

    const solicitudes = await this.prisma.solicitud.findMany({
      where,
      include: {
        nino: {
          include: {
            solicitante: true,
          },
        },
        periodo: true,
        solicitante: true,
        documentos: {
          where: {
            validado: true,
          },
        },
        decisiones: true,
        matricula: true,
      },
      orderBy: [{ prioridad: 'desc' }, { fechaSolicitud: 'asc' }],
    });

    return solicitudes.map((s) => this.mapearSolicitudListResponse(s));
  }

  async findOne(id: string, usuario?: any) {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: {
        nino: {
          include: {
            solicitante: true,
          },
        },
        periodo: true,
        solicitante: true,
        documentos: {
          include: {
            validador: true,
          },
        },
        decisiones: {
          include: {
            sesion: true,
            comision: true,
          },
        },
        matricula: {
          include: {
            circulo: true,
            controles: true,
          },
        },
        trazas: {
          include: {
            usuario: true,
          },
          orderBy: {
            fecha: 'desc',
          },
        },
      },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }

    // Verificar permisos
    this.verificarPermisosSolicitud(solicitud, usuario);

    return this.mapearSolicitudResponse(solicitud);
  }

  async findBySolicitanteId(solicitanteId: string) {
    const solicitudes = await this.prisma.solicitud.findMany({
      where: { solicitanteId },
      include: {
        nino: true,
        periodo: true,
        solicitante: true,
        documentos: true,
        decisiones: true,
        matricula: true,
      },
      orderBy: {
        fechaSolicitud: 'desc',
      },
    });

    return solicitudes.map((s) => this.mapearSolicitudListResponse(s));
  }

  async findByNinoId(ninoId: string, usuario?: any) {
    const nino = await this.prisma.nino.findUnique({
      where: { id: ninoId },
      include: { solicitante: true },
    });

    if (!nino) {
      throw new NotFoundException(`Niño con ID ${ninoId} no encontrado`);
    }

    // Verificar permisos si es solicitante
    if (usuario?.rol === RolUsuario.SOLICITANTE) {
      if (usuario.perfilId !== nino.solicitanteId) {
        throw new ForbiddenException(
          'Solo puedes ver niños de tu propio perfil',
        );
      }
    }

    const solicitudes = await this.prisma.solicitud.findMany({
      where: { ninoId },
      include: {
        nino: true,
        periodo: true,
        solicitante: true,
        documentos: true,
        decisiones: true,
        matricula: true,
      },
      orderBy: {
        fechaSolicitud: 'desc',
      },
    });

    return solicitudes.map((s) => this.mapearSolicitudListResponse(s));
  }

  async findPendientesRevision(municipio?: string) {
    const where: any = {
      estado: 'EN_REVISION',
      documentos: {
        every: {
          validado: true,
        },
      },
    };

    if (municipio) {
      where.solicitante = {
        municipio: {
          contains: municipio,
          mode: 'insensitive',
        },
      };
    }

    const solicitudes = await this.prisma.solicitud.findMany({
      where,
      include: {
        nino: {
          include: {
            solicitante: true,
          },
        },
        periodo: true,
        solicitante: true,
        documentos: true,
      },
      orderBy: {
        prioridad: 'desc',
      },
    });

    return solicitudes.map((s) => this.mapearSolicitudListResponse(s));
  }

  async update(id: string, data: UpdateSolicitudDto, usuario: any) {
    // Primero obtener la solicitud completa con relaciones básicas
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: {
        nino: true,
        solicitante: true,
        periodo: true,
      },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }

    // Verificar permisos
    this.verificarPermisosSolicitud(solicitud, usuario);

    const updateData: any = {};

    // Si es solicitante, solo puede actualizar observaciones
    if (usuario.rol === RolUsuario.SOLICITANTE) {
      if (data.observaciones !== undefined) {
        updateData.observaciones = data.observaciones;
      }

      // También puede cambiar el estado a RECHAZADA si es su solicitud
      if (
        data.estado === EstadoSolicitud.RECHAZADA &&
        usuario.perfilId === solicitud.solicitanteId
      ) {
        updateData.estado = data.estado;
      }

      // Si no hay nada que actualizar, devolver la solicitud actual
      if (Object.keys(updateData).length === 0) {
        return this.mapearSolicitudUpdateResponse(solicitud);
      }
    }
    // Para otros roles (funcionarios, comisión, director, administrador)
    else {
      // Copiar todos los campos que vienen en data
      if (data.sector !== undefined) updateData.sector = data.sector;
      if (data.tipoSolicitud !== undefined)
        updateData.tipoSolicitud = data.tipoSolicitud;
      if (data.estado !== undefined) updateData.estado = data.estado;
      if (data.observaciones !== undefined)
        updateData.observaciones = data.observaciones;

      // Recalcular prioridad si se cambió algún dato relevante o se solicita explícitamente
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

    // Si no hay nada que actualizar, devolver la solicitud actual
    if (Object.keys(updateData).length === 0) {
      return this.mapearSolicitudUpdateResponse(solicitud);
    }

    // Actualizar la solicitud
    const solicitudActualizada = await this.prisma.solicitud.update({
      where: { id },
      data: updateData,
      include: {
        nino: true,
        periodo: true,
        solicitante: true,
      },
    });

    // Crear trazabilidad si cambió el estado
    if (data.estado && data.estado !== solicitud.estado) {
      await this.prisma.trazabilidad.create({
        data: {
          solicitudId: id,
          estadoAnterior: solicitud.estado,
          estadoNuevo: data.estado,
          usuarioId: usuario.id,
          comentario:
            data.estado === EstadoSolicitud.RECHAZADA &&
            usuario.rol === RolUsuario.SOLICITANTE
              ? 'Solicitud cancelada por el solicitante'
              : 'Estado actualizado',
        },
      });
    }

    return this.mapearSolicitudUpdateResponse(solicitudActualizada);
  }
  async updateNino(id: string, updateNinoDto: UpdateNinoDto, usuario: any) {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: {
        nino: true,
        solicitante: true,
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

    // Verificar permisos
    this.verificarPermisosSolicitud(solicitud, usuario);

    // Si es solicitante, verificar que sea el dueño del niño
    if (usuario.rol === RolUsuario.SOLICITANTE) {
      if (usuario.perfilId !== solicitud.solicitanteId) {
        throw new ForbiddenException(
          'Solo puedes actualizar niños de tus propias solicitudes',
        );
      }
    }

    // Preparar datos para actualizar
    const datosActualizacion: any = {};

    // Solo incluir campos que realmente vienen en el DTO
    if (updateNinoDto.nombre !== undefined) {
      datosActualizacion.nombre = updateNinoDto.nombre;
    }

    if (updateNinoDto.apellidos !== undefined) {
      datosActualizacion.apellidos = updateNinoDto.apellidos;
    }

    // Manejar fecha de nacimiento - convertir de string a Date
    if (updateNinoDto.fechaNacimiento !== undefined) {
      // Convertir string "YYYY-MM-DD" a Date
      const fechaParts = updateNinoDto.fechaNacimiento.split('-');
      if (fechaParts.length === 3) {
        const year = parseInt(fechaParts[0], 10);
        const month = parseInt(fechaParts[1], 10) - 1; // Meses en JS son 0-indexed
        const day = parseInt(fechaParts[2], 10);

        const fechaNacimientoDate = new Date(year, month, day);

        // Validar que la fecha sea válida
        if (isNaN(fechaNacimientoDate.getTime())) {
          throw new BadRequestException('Fecha de nacimiento inválida');
        }

        datosActualizacion.fechaNacimiento = fechaNacimientoDate;
      } else {
        throw new BadRequestException(
          'Formato de fecha inválido. Use YYYY-MM-DD',
        );
      }
    }

    if (updateNinoDto.sexo !== undefined) {
      datosActualizacion.sexo = updateNinoDto.sexo;
    }

    if (updateNinoDto.tarjetaMenor !== undefined) {
      // Verificar que la tarjeta menor no exista ya en otro niño
      const tarjetaExistente = await this.prisma.nino.findFirst({
        where: {
          tarjetaMenor: updateNinoDto.tarjetaMenor,
          id: { not: solicitud.nino.id }, // Excluir el niño actual
        },
      });

      if (tarjetaExistente) {
        throw new ConflictException(
          'La tarjeta menor ya está registrada para otro niño',
        );
      }

      datosActualizacion.tarjetaMenor = updateNinoDto.tarjetaMenor;
    }

    if (updateNinoDto.casoEspecial !== undefined) {
      datosActualizacion.casoEspecial = updateNinoDto.casoEspecial;
    }

    if (updateNinoDto.tipoNecesidad !== undefined) {
      datosActualizacion.tipoNecesidad = updateNinoDto.tipoNecesidad;
    }

    // Si no hay nada que actualizar, devolver la solicitud actual
    if (Object.keys(datosActualizacion).length === 0) {
      return this.mapearSolicitudUpdateResponse(solicitud);
    }

    // Actualizar el niño
    const ninoActualizado = await this.prisma.nino.update({
      where: { id: solicitud.nino.id },
      data: datosActualizacion,
    });

    // Recalcular prioridad si cambió algún dato relevante para la prioridad
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

    // Obtener la solicitud completa actualizada
    const solicitudCompleta = await this.prisma.solicitud.findUnique({
      where: { id },
      include: {
        nino: true,
        periodo: true,
        solicitante: true,
      },
    });

    return this.mapearSolicitudUpdateResponse(solicitudCompleta);
  }

  async cambiarEstado(
    id: string,
    estado: EstadoSolicitud,
    usuarioId: string,
    comentario?: string,
  ) {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: {
        nino: true,
        periodo: true,
        solicitante: true,
      },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }

    // Crear trazabilidad
    await this.prisma.trazabilidad.create({
      data: {
        solicitudId: id,
        estadoAnterior: solicitud.estado,
        estadoNuevo: estado,
        usuarioId: usuarioId,
        comentario: comentario || 'Cambio de estado',
      },
    });

    const solicitudActualizada = await this.prisma.solicitud.update({
      where: { id },
      data: { estado },
      include: {
        nino: true,
        periodo: true,
        solicitante: true,
      },
    });

    return this.mapearSolicitudUpdateResponse(solicitudActualizada);
  }

  async remove(id: string, usuario: any) {
    const solicitud = await this.prisma.solicitud.findUnique({
      where: { id },
      include: { solicitante: true },
    });

    if (!solicitud) {
      throw new NotFoundException(`Solicitud con ID ${id} no encontrada`);
    }

    // Verificar permisos
    this.verificarPermisosSolicitud(solicitud, usuario);

    // Verificar que no tenga documentos, decisiones o matrícula asociada
    const tieneDocumentos =
      (await this.prisma.documentoSolicitud.count({
        where: { solicitudId: id },
      })) > 0;

    const tieneDecisiones =
      (await this.prisma.decisionSolicitud.count({
        where: { solicitudId: id },
      })) > 0;

    const tieneMatricula =
      (await this.prisma.matricula.count({
        where: { solicitudId: id },
      })) > 0;

    if (tieneDocumentos || tieneDecisiones || tieneMatricula) {
      throw new ConflictException(
        'No se puede eliminar una solicitud con documentos, decisiones o matrícula asociada',
      );
    }

    await this.prisma.solicitud.delete({
      where: { id },
    });

    return { message: `Solicitud con ID ${id} eliminada exitosamente` };
  }

  async getEstadisticas(filtros?: { periodoId?: string; municipio?: string }) {
    const where: any = {};

    if (filtros?.periodoId) {
      where.periodoId = filtros.periodoId;
    }

    if (filtros?.municipio) {
      where.solicitante = {
        municipio: {
          contains: filtros.municipio,
          mode: 'insensitive',
        },
      };
    }

    const solicitudes = await this.prisma.solicitud.findMany({
      where,
      include: {
        nino: true,
        solicitante: true,
        decisiones: true,
      },
    });

    const total = solicitudes.length;

    // Estadísticas por estado
    const porEstado = {
      EN_REVISION: 0,
      APROBADA: 0,
      RECHAZADA: 0,
      EN_ESPERA: 0,
    };

    // Estadísticas por sector
    const porSector = {
      SALUD: 0,
      EDUCACION: 0,
      DEFENSA: 0,
      CASO_SOCIAL: 0,
      OTRO: 0,
    };

    // Estadísticas por tipo
    const porTipo = {
      TRABAJADOR: 0,
      ESTUDIANTE: 0,
      CASO_SOCIAL: 0,
    };

    solicitudes.forEach((solicitud) => {
      porEstado[solicitud.estado]++;
      porSector[solicitud.sector]++;
      porTipo[solicitud.tipoSolicitud]++;
    });

    // Solicitudes con decisiones
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

  // Función para determinar período activo
  private async obtenerPeriodoActivo(fecha: Date): Promise<string> {
    const periodo = await this.prisma.periodoOtorgamiento.findFirst({
      where: {
        fechaInicio: { lte: fecha },
        fechaCierre: { gte: fecha },
        activo: true,
      },
    });

    if (!periodo) {
      throw new NotFoundException(
        'No hay un período de otorgamiento activo para la fecha actual',
      );
    }

    return periodo.id;
  }

  private calcularPrioridad(
    data: CreateSolicitudDto,
    nino: any,
    solicitante: any,
  ): number {
    let prioridad = 0;

    // Prioridad por sector
    const prioridadSector = {
      SALUD: 30,
      EDUCACION: 25,
      DEFENSA: 20,
      CASO_SOCIAL: 35,
      OTRO: 10,
    };
    prioridad += prioridadSector[data.sector] || 10;

    // Prioridad por tipo de solicitud
    const prioridadTipo = {
      TRABAJADOR: 20,
      ESTUDIANTE: 25,
      CASO_SOCIAL: 30,
    };
    prioridad += prioridadTipo[data.tipoSolicitud] || 15;

    // Prioridad por caso especial del niño
    if (nino.casoEspecial) {
      prioridad += 15;
    }

    // Prioridad por tipo de necesidad
    if (nino.tipoNecesidad) {
      prioridad += 10;
    }

    // Prioridad por cantidad de hijos del solicitante
    if (solicitante.cantHijos > 1) {
      prioridad += (solicitante.cantHijos - 1) * 5;
    }

    // Prioridad por tipo de persona
    if (solicitante.tipoPersona === 'JURIDICA') {
      prioridad += 5;
    }

    return prioridad;
  }

  private verificarPermisosSolicitud(solicitud: any, usuario: any): void {
    // Administradores y funcionarios tienen acceso completo
    if (
      [RolUsuario.ADMINISTRADOR, RolUsuario.FUNCIONARIO_MUNICIPAL].includes(
        usuario.rol,
      )
    ) {
      return;
    }

    // Comisión de otorgamiento puede ver todas
    if (usuario.rol === RolUsuario.COMISION_OTORGAMIENTO) {
      return;
    }

    // Director de círculo solo puede ver de su municipio
    if (usuario.rol === RolUsuario.DIRECTOR_CIRCULO && usuario.perfil) {
      if (solicitud.solicitante.municipio !== usuario.perfil.municipio) {
        throw new ForbiddenException(
          'Solo puedes acceder a solicitudes de tu municipio',
        );
      }
      return;
    }

    // Solicitante solo puede ver sus propias solicitudes
    if (usuario.rol === RolUsuario.SOLICITANTE) {
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

  private mapearSolicitudListResponse(solicitud: any) {
    // Verificar que nino exista antes de acceder a sus propiedades
    if (!solicitud.nino) {
      throw new Error(`Solicitud ${solicitud.id} no tiene relación con niño`);
    }

    return {
      id: solicitud.id,
      fechaSolicitud: solicitud.fechaSolicitud,
      sector: solicitud.sector,
      tipoSolicitud: solicitud.tipoSolicitud,
      estado: solicitud.estado,
      prioridad: solicitud.prioridad,
      ninoNombre: solicitud.nino.nombre,
      ninoApellidos: solicitud.nino.apellidos,
      ninoTarjetaMenor: solicitud.nino.tarjetaMenor,
      solicitanteNombre: solicitud.solicitante.nombre,
      solicitanteApellidos: solicitud.solicitante.apellidos,
      periodoNombre: solicitud.periodo?.nombre || 'Sin período',
      tieneDocumentos: solicitud.documentos?.length > 0 || false,
      tieneMatricula: !!solicitud.matricula,
    };
  }

  private mapearSolicitudResponse(solicitud: any) {
    // Si la solicitud es null, retornar null
    if (!solicitud) {
      return null;
    }

    // Verificar que las relaciones existan antes de acceder a ellas
    return {
      id: solicitud.id,
      fechaSolicitud: solicitud.fechaSolicitud,
      sector: solicitud.sector,
      tipoSolicitud: solicitud.tipoSolicitud,
      estado: solicitud.estado,
      prioridad: solicitud.prioridad,
      observaciones: solicitud.observaciones,
      nino: solicitud.nino
        ? {
            id: solicitud.nino.id,
            nombre: solicitud.nino.nombre,
            apellidos: solicitud.nino.apellidos,
            tarjetaMenor: solicitud.nino.tarjetaMenor,
            fechaNacimiento: solicitud.nino.fechaNacimiento,
            sexo: solicitud.nino.sexo,
            casoEspecial: solicitud.nino.casoEspecial,
            tipoNecesidad: solicitud.nino.tipoNecesidad,
          }
        : null,
      periodo: solicitud.periodo
        ? {
            id: solicitud.periodo.id,
            nombre: solicitud.periodo.nombre,
            fechaInicio: solicitud.periodo.fechaInicio,
            fechaCierre: solicitud.periodo.fechaCierre,
          }
        : null,
      solicitante: solicitud.solicitante
        ? {
            id: solicitud.solicitante.id,
            nombre: solicitud.solicitante.nombre,
            apellidos: solicitud.solicitante.apellidos,
            municipio: solicitud.solicitante.municipio,
          }
        : null,
      documentos:
        solicitud.documentos?.map((doc) => ({
          id: doc.id,
          tipo: doc.tipo,
          url: doc.url,
          validado: doc.validado,
        })) || [],
      decisiones: solicitud.decisiones || [],
      matricula: solicitud.matricula || null,
      trazas: solicitud.trazas || [],
    };
  }

  private mapearSolicitudUpdateResponse(solicitud: any) {
    // Formatear fecha para mostrar solo YYYY-MM-DD
    const formatDate = (date: Date): string => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Solo devolver campos de la solicitud y del niño
    return {
      // Campos de la solicitud
      id: solicitud.id,
      fechaSolicitud: solicitud.fechaSolicitud,
      sector: solicitud.sector,
      tipoSolicitud: solicitud.tipoSolicitud,
      estado: solicitud.estado,
      prioridad: solicitud.prioridad,
      observaciones: solicitud.observaciones,

      // Campos del período (solo lo básico)
      periodo: solicitud.periodo
        ? {
            id: solicitud.periodo.id,
            nombre: solicitud.periodo.nombre,
          }
        : null,

      // Campos del niño con fecha formateada
      nino: solicitud.nino
        ? {
            id: solicitud.nino.id,
            nombre: solicitud.nino.nombre,
            apellidos: solicitud.nino.apellidos,
            tarjetaMenor: solicitud.nino.tarjetaMenor,
            fechaNacimiento: formatDate(solicitud.nino.fechaNacimiento), // Formateada
            sexo: solicitud.nino.sexo,
            casoEspecial: solicitud.nino.casoEspecial,
            tipoNecesidad: solicitud.nino.tipoNecesidad,
          }
        : null,
    };
  }
}
