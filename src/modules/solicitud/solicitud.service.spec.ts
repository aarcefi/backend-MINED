/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SolicitudService } from './solicitud.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NinosService } from '../nino/nino.service';
import { TrazabilidadService } from '../trazabilidad/trazabilidad.service';
import { PeriodoService } from '../periodo/periodo.service';
import { ValidacionIdentidadService } from '../validacion-ficha-unica/validacion-ficha-unica.service';
import { PriorityCalculator } from '../../common/prioridades/prioridad-calc.service.';
import { EventDispatcher } from '../../common/events/event-dispatcher.service';
import { DateUtilsService } from '../../common/utils/date-utils.service';
import {
  createPrismaMock,
  PrismaMock,
  setupTransaction,
} from '../../../test/prisma-mock';
import { EstadoSolicitud, RolUsuario } from '@prisma/client';

describe('SolicitudService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  let service: SolicitudService;
  let prisma: PrismaMock;
  let ninosService: any;
  let trazabilidad: any;
  let periodoService: any;
  let validacion: any;
  let priorityCalculator: any;
  let dispatcher: any;
  let dateUtils: any;

  // ── fixtures ───────────────────────────────────────────────
  const makeSolicitud = (over: any = {}) => ({
    id: 's1',
    solicitanteId: 'sol1',
    circuloId: 'c1',
    fechaSolicitud: new Date('2026-09-01'),
    anioSolicitado: 'ANIO_2',
    sector: 'SALUD',
    tipoSolicitud: 'TRABAJADOR',
    estado: 'EN_REVISION',
    prioridad: 100,
    observaciones: null,
    nino: {
      id: 'n1',
      nombre: 'N',
      apellidos: 'A',
      tarjetaMenor: 'TM1',
      fechaNacimiento: new Date('2024-01-01'),
      sexo: 'M',
      casoEspecial: false,
      tipoNecesidad: null,
    },
    periodo: {
      id: 'per1',
      nombre: 'Curso',
      fechaInicio: new Date('2026-09-01'),
      fechaCierre: new Date('2027-07-01'),
    },
    solicitante: {
      id: 'sol1',
      direccion: 'Calle 1',
      tipoPersona: 'MADRE',
      cantHijos: 1,
      centroTrabajo: 'H',
      usuario: {
        id: 'u1',
        email: 'a@b.c',
        nombre: 'N',
        apellidos: 'A',
        carnetIdentidad: '123',
        telefono: '5',
        municipioRel: { nombre: 'Playa' },
        provinciaRel: { nombre: 'La Habana' },
        municipioId: 'm1',
      },
    },
    circulo: {
      id: 'c1',
      nombre: 'X',
      direccion: 'Calle 2',
      tipo: 'NORMAL',
      tieneSextoAnio: false,
      municipioRel: { nombre: 'Playa' },
      provinciaRel: { nombre: 'La Habana' },
      municipioId: 'm1',
    },
    decisiones: [],
    documentos: [],
    matricula: null,
    ...over,
  });

  beforeEach(async () => {
    prisma = createPrismaMock();
    setupTransaction(prisma);
    ninosService = {
      create: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
    };
    trazabilidad = { crearTrazabilidadAutomatica: jest.fn() };
    periodoService = {
      obtenerPeriodoActivo: jest.fn().mockResolvedValue({ id: 'per1' }),
    };
    validacion = { obtenerNombre: jest.fn() };
    priorityCalculator = { calculatePriority: jest.fn().mockReturnValue(50) };
    dispatcher = { dispatch: jest.fn() };
    dateUtils = { calcularAnioVida: jest.fn().mockReturnValue('ANIO_2') };

    const module = await Test.createTestingModule({
      providers: [
        SolicitudService,
        { provide: PrismaService, useValue: prisma },
        { provide: NinosService, useValue: ninosService },
        { provide: TrazabilidadService, useValue: trazabilidad },
        { provide: PeriodoService, useValue: periodoService },
        { provide: ValidacionIdentidadService, useValue: validacion },
        { provide: PriorityCalculator, useValue: priorityCalculator },
        { provide: EventDispatcher, useValue: dispatcher },
        { provide: DateUtilsService, useValue: dateUtils },
      ],
    }).compile();

    service = module.get(SolicitudService);
  });

  // ── create ────────────────────────────────────────────────
  describe('create', () => {
    const dto = {
      solicitanteId: 'sol1',
      sector: 'SALUD',
      tipoSolicitud: 'TRABAJADOR',
      estado: 'EN_REVISION',
      nino: { tarjetaMenor: 'TM1', nombre: 'N', apellidos: 'A' },
    };

    beforeEach(() => {
      prisma.perfilSolicitante.findUnique.mockResolvedValue({
        id: 'sol1',
        cantHijos: 1,
        usuario: { municipioId: 'm1', municipioRel: { nombre: 'Playa' } },
      } as any);
      prisma.solicitud.findFirst.mockResolvedValue(null);
      validacion.obtenerNombre.mockResolvedValue({
        nombre: 'N',
        apellidos: 'A',
      });
      ninosService.create.mockResolvedValue({
        id: 'n1',
        fechaNacimiento: new Date('2024-01-01'),
      });
      prisma.solicitud.create.mockResolvedValue(makeSolicitud());
      prisma.usuario.findFirst.mockResolvedValue(null);
    });

    it('lanza NotFound si el solicitante no existe', async () => {
      prisma.perfilSolicitante.findUnique.mockResolvedValue(null);
      await expect(
        service.create(dto as any, { id: 'u1' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFound si el círculo no existe', async () => {
      prisma.circuloInfantil.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ ...dto, circuloId: 'cx' } as any, { id: 'u1' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza Conflict si ya existe solicitud del niño en el período', async () => {
      prisma.solicitud.findFirst.mockResolvedValue({ id: 'old' } as any);
      await expect(
        service.create(dto as any, { id: 'u1' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('lanza BadRequest si el niño no tiene edad válida', async () => {
      dateUtils.calcularAnioVida.mockReturnValue(null);
      await expect(
        service.create(dto as any, { id: 'u1' } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('crea solicitud en happy path', async () => {
      const r = await service.create(dto as any, { id: 'u1' } as any);
      expect(r.id).toBe('s1');
      expect(prisma.solicitud.create).toHaveBeenCalled();
      expect(priorityCalculator.calculatePriority).toHaveBeenCalled();
    });

    it('usa municipio del círculo si se envía circuloId', async () => {
      prisma.circuloInfantil.findUnique.mockResolvedValue({
        id: 'c1',
        municipioId: 'mc',
        municipioRel: { nombre: 'Centro Habana' },
      } as any);
      prisma.usuario.findFirst.mockResolvedValue({
        perfilComision: { id: 'pc1' },
      } as any);
      prisma.configuracionPrioridadComision.findUnique.mockResolvedValue({
        sectorPrioritario1: 'SALUD',
        sectorPrioritario2: null,
        sectorPrioritario3: null,
      } as any);

      await service.create(
        { ...dto, circuloId: 'c1' } as any,
        { id: 'u1' } as any,
      );

      const ctx = priorityCalculator.calculatePriority.mock.calls[0][0];
      expect(ctx.configuracionPrioridad).toEqual({
        sector1: 'SALUD',
        sector2: null,
        sector3: null,
      });
    });
  });

  // ── findAll ───────────────────────────────────────────────
  describe('findAll', () => {
    it('ADMIN aplica filtro.municipio', async () => {
      prisma.solicitud.findMany.mockResolvedValue([makeSolicitud()] as any);
      await service.findAll(
        { municipio: 'Playa' },
        { rol: RolUsuario.ADMINISTRADOR },
      );
      expect(prisma.solicitud.findMany).toHaveBeenCalled();
    });

    it('FUNCIONARIO usa su municipio (filtra si no coincide)', async () => {
      prisma.solicitud.findMany.mockResolvedValue([
        makeSolicitud(),
        makeSolicitud({
          id: 's2',
          circulo: null,
          solicitante: {
            ...makeSolicitud().solicitante,
            usuario: {
              ...makeSolicitud().solicitante.usuario,
              municipioRel: { nombre: 'Cerro' },
            },
          },
        }),
      ] as any);

      const r = await service.findAll({}, {
        rol: RolUsuario.FUNCIONARIO_MUNICIPAL,
        municipio: 'Playa',
      } as any);
      expect(r).toHaveLength(1);
      expect(r[0].id).toBe('s1');
    });

    it('DIRECTOR_CIRCULO usa municipio del perfil', async () => {
      prisma.solicitud.findMany.mockResolvedValue([] as any);
      await service.findAll(
        {},
        {
          rol: RolUsuario.DIRECTOR_CIRCULO,
          perfil: { municipio: 'Playa' },
        },
      );
      expect(prisma.solicitud.findMany).toHaveBeenCalled();
    });
  });

  // ── findOne / permisos ────────────────────────────────────
  describe('findOne', () => {
    it('lanza NotFound si no existe', async () => {
      prisma.solicitud.findUnique.mockResolvedValue(null);
      await expect(
        service.findOne('s1', { rol: RolUsuario.ADMINISTRADOR }),
      ).rejects.toThrow(NotFoundException);
    });

    it('ADMIN puede ver cualquier solicitud', async () => {
      prisma.solicitud.findUnique.mockResolvedValue(makeSolicitud());
      await expect(
        service.findOne('s1', { rol: RolUsuario.ADMINISTRADOR }),
      ).resolves.toBeTruthy();
    });

    it('SOLICITANTE dueño accede, ajeno falla', async () => {
      prisma.solicitud.findUnique.mockResolvedValue(makeSolicitud());
      await expect(
        service.findOne('s1', {
          rol: RolUsuario.SOLICITANTE,
          perfilId: 'sol1',
        }),
      ).resolves.toBeTruthy();

      await expect(
        service.findOne('s1', {
          rol: RolUsuario.SOLICITANTE,
          perfilId: 'otro',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('FUNCIONARIO de otro municipio falla', async () => {
      prisma.solicitud.findUnique.mockResolvedValue(makeSolicitud());
      await expect(
        service.findOne('s1', {
          rol: RolUsuario.FUNCIONARIO_MUNICIPAL,
          municipio: 'Cerro',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('DIRECTOR con círculo distinto falla', async () => {
      prisma.solicitud.findUnique.mockResolvedValue(makeSolicitud());
      await expect(
        service.findOne('s1', {
          rol: RolUsuario.DIRECTOR_CIRCULO,
          perfil: { circuloId: 'otro' },
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── findByNinoId ──────────────────────────────────────────
  it('findByNinoId bloquea solicitante ajeno', async () => {
    ninosService.findOne.mockResolvedValue({ solicitanteId: 'sol1' });
    await expect(
      service.findByNinoId('n1', {
        rol: RolUsuario.SOLICITANTE,
        perfilId: 'otro',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  // ── findPendientesRevision ────────────────────────────────
  it('findPendientesRevision filtra por municipio', async () => {
    prisma.solicitud.findMany.mockResolvedValue([
      makeSolicitud(),
      makeSolicitud({
        id: 's2',
        circulo: {
          ...makeSolicitud().circulo,
          municipioRel: { nombre: 'Cerro' },
        },
      }),
    ] as any);
    const r = await service.findPendientesRevision('Playa');
    expect(r).toHaveLength(1);
  });

  // ── update ────────────────────────────────────────────────
  describe('update', () => {
    beforeEach(() => {
      prisma.solicitud.findUnique.mockResolvedValue(makeSolicitud());
    });

    it('devuelve original si no hay cambios', async () => {
      const r = await service.update(
        's1',
        {} as any,
        {
          id: 'u1',
          rol: RolUsuario.ADMINISTRADOR,
        } as any,
      );
      expect(r.id).toBe('s1');
      expect(prisma.solicitud.update).not.toHaveBeenCalled();
    });

    it('actualiza sector y recalcula prioridad', async () => {
      prisma.usuario.findFirst.mockResolvedValue(null);
      prisma.solicitud.update.mockResolvedValue(
        makeSolicitud({ sector: 'EDUCACION' }),
      );

      await service.update(
        's1',
        { sector: 'EDUCACION' } as any,
        { id: 'u1', rol: RolUsuario.ADMINISTRADOR } as any,
      );

      expect(prisma.solicitud.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            sector: 'EDUCACION',
            prioridad: expect.any(Number),
          }),
        }),
      );
    });

    it('lanza NotFound si el circuloId no existe', async () => {
      prisma.circuloInfantil.findUnique.mockResolvedValue(null);
      await expect(
        service.update(
          's1',
          { circuloId: 'noexiste' } as any,
          { id: 'u1', rol: RolUsuario.ADMINISTRADOR } as any,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateNino ────────────────────────────────────────────
  it('updateNino recalcula prioridad si cambia casoEspecial', async () => {
    prisma.solicitud.findUnique
      .mockResolvedValueOnce(makeSolicitud())
      .mockResolvedValueOnce(makeSolicitud());
    ninosService.update.mockResolvedValue({
      casoEspecial: true,
      tipoNecesidad: 'X',
    });
    prisma.usuario.findFirst.mockResolvedValue(null);
    prisma.solicitud.update.mockResolvedValue({} as any);

    await service.updateNino(
      's1',
      { casoEspecial: true } as any,
      { id: 'u1', rol: RolUsuario.ADMINISTRADOR } as any,
    );
    expect(priorityCalculator.calculatePriority).toHaveBeenCalled();
  });

  // ── cambiarEstado ─────────────────────────────────────────
  describe('cambiarEstado', () => {
    it('rechaza a SOLICITANTE', async () => {
      prisma.solicitud.findUnique.mockResolvedValue(makeSolicitud());
      await expect(
        service.cambiarEstado('s1', EstadoSolicitud.APROBADA_COMISION, {
          id: 'u1',
          rol: RolUsuario.SOLICITANTE,
          perfilId: 'sol1',
        } as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('APROBADA_COMISION sin círculo → BadRequest', async () => {
      prisma.solicitud.findUnique.mockResolvedValue(
        makeSolicitud({ circulo: null, circuloId: null }),
      );
      await expect(
        service.cambiarEstado('s1', EstadoSolicitud.APROBADA_COMISION, {
          id: 'u1',
          rol: RolUsuario.COMISION_OTORGAMIENTO,
          municipio: 'Playa',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('APROBADA_COMISION con círculo → crea matrícula y dispatch', async () => {
      prisma.solicitud.findUnique.mockResolvedValue(makeSolicitud());
      prisma.matricula.findUnique.mockResolvedValue(null);
      prisma.matricula.create.mockResolvedValue({
        id: 'm1',
        folio: 'F1',
        fechaOtorgamiento: new Date(),
        fechaLimite: new Date(),
      } as any);
      prisma.perfilDirector.findUnique.mockResolvedValue({
        usuario: {
          id: 'dir',
          email: 'd@x',
          nombre: 'D',
          apellidos: 'D',
        },
      } as any);
      prisma.solicitud.update.mockResolvedValue(
        makeSolicitud({ estado: 'APROBADA_COMISION' }),
      );
      prisma.usuario.findMany.mockResolvedValue([] as any);
      prisma.notificacion.createMany.mockResolvedValue({ count: 0 } as any);

      const r = await service.cambiarEstado(
        's1',
        EstadoSolicitud.APROBADA_COMISION,
        {
          id: 'u1',
          rol: RolUsuario.COMISION_OTORGAMIENTO,
          municipio: 'Playa',
        } as any,
      );

      expect(r.estado).toBe(EstadoSolicitud.APROBADA_COMISION);
      expect(prisma.matricula.create).toHaveBeenCalled();
      expect(dispatcher.dispatch).toHaveBeenCalled();
    });

    it('APROBADA_DIRECCION notifica a la comisión', async () => {
      prisma.solicitud.findUnique.mockResolvedValue(makeSolicitud());
      prisma.solicitud.update.mockResolvedValue(
        makeSolicitud({ estado: 'APROBADA_DIRECCION' }),
      );
      prisma.usuario.findMany.mockResolvedValue([] as any);
      prisma.notificacion.createMany.mockResolvedValue({ count: 0 } as any);

      await service.cambiarEstado('s1', EstadoSolicitud.APROBADA_DIRECCION, {
        id: 'u1',
        rol: RolUsuario.FUNCIONARIO_MUNICIPAL,
        municipio: 'Playa',
      } as any);
      expect(prisma.notificacion.createMany).toHaveBeenCalled();
    });
  });

  // ── remove ────────────────────────────────────────────────
  describe('remove', () => {
    it('lanza NotFound si no existe', async () => {
      prisma.solicitud.findUnique.mockResolvedValue(null);
      await expect(
        service.remove('s1', { id: 'u1', rol: RolUsuario.ADMINISTRADOR }),
      ).rejects.toThrow(NotFoundException);
    });

    it('solicitante no puede borrar si no está EN_REVISION', async () => {
      prisma.solicitud.findUnique.mockResolvedValue(
        makeSolicitud({ estado: 'APROBADA_COMISION' }),
      );
      await expect(
        service.remove('s1', {
          id: 'u1',
          rol: RolUsuario.SOLICITANTE,
          perfilId: 'sol1',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('bloquea si hay decisiones o matrícula', async () => {
      prisma.solicitud.findUnique.mockResolvedValue(makeSolicitud());
      prisma.decisionSolicitud.count.mockResolvedValue(1);
      await expect(
        service.remove('s1', { id: 'u1', rol: RolUsuario.ADMINISTRADOR }),
      ).rejects.toThrow(ConflictException);
    });

    it('elimina en éxito', async () => {
      prisma.solicitud.findUnique.mockResolvedValue(makeSolicitud());
      prisma.decisionSolicitud.count.mockResolvedValue(0);
      prisma.matricula.count.mockResolvedValue(0);
      prisma.solicitud.delete.mockResolvedValue({} as any);
      await service.remove('s1', { id: 'u1', rol: RolUsuario.ADMINISTRADOR });
      expect(prisma.solicitud.delete).toHaveBeenCalled();
    });
  });

  // ── getEstadisticas ───────────────────────────────────────
  it('getEstadisticas filtra por municipio', async () => {
    prisma.solicitud.findMany.mockResolvedValue([
      makeSolicitud({ estado: 'EN_REVISION' }),
      makeSolicitud({
        id: 's2',
        solicitanteId: 'sol2',
        circulo: {
          ...makeSolicitud().circulo,
          municipioRel: { nombre: 'Cerro' },
        },
      }),
    ] as any);

    const r = await service.getEstadisticas({ municipio: 'Playa' });

    expect(r.total).toBe(1);
    expect(r.porEstado.EN_REVISION).toBe(1);
  });

  // ── helpers privados ──────────────────────────────────────
  it('generarFolioUnico genera tras colisión', async () => {
    prisma.matricula.findUnique
      .mockResolvedValueOnce({ id: 'exists' } as any)
      .mockResolvedValueOnce(null);
    const folio = await (service as any).generarFolioUnico();
    expect(folio).toMatch(/^MAT-\d{8}-\d{4}$/);
  });

  it('notificarPersonal no rompe si Prisma falla', async () => {
    prisma.usuario.findMany.mockRejectedValue(new Error('boom'));
    await expect(
      (service as any).notificarPersonal(
        RolUsuario.COMISION_OTORGAMIENTO,
        'Playa',
        't',
        'm',
      ),
    ).resolves.toBeUndefined();
  });

  // ── findBySolicitanteId ───────────────────────────────────
  it('findBySolicitanteId devuelve las solicitudes del solicitante', async () => {
    prisma.solicitud.findMany.mockResolvedValue([makeSolicitud()] as any);
    const r = await service.findBySolicitanteId('sol1');
    expect(r).toHaveLength(1);
    expect(prisma.solicitud.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { solicitanteId: 'sol1' } }),
    );
  });

  // ── findByNinoId (happy path) ─────────────────────────────
  it('findByNinoId devuelve las solicitudes del niño', async () => {
    ninosService.findOne.mockResolvedValue({ solicitanteId: 'sol1' });
    prisma.solicitud.findMany.mockResolvedValue([makeSolicitud()] as any);
    const r = await service.findByNinoId('n1', {
      rol: RolUsuario.SOLICITANTE,
      perfilId: 'sol1',
    });
    expect(r).toHaveLength(1);
  });

  // ── cambiarEstado: RECHAZADA_COMISION ─────────────────────
  it('cambiarEstado a RECHAZADA_COMISION dispara trazabilidad y evento', async () => {
    prisma.solicitud.findUnique.mockResolvedValue(
      makeSolicitud({ estado: EstadoSolicitud.APROBADA_DIRECCION }),
    );
    prisma.solicitud.update.mockResolvedValue(
      makeSolicitud({ estado: EstadoSolicitud.RECHAZADA_COMISION }),
    );
    prisma.usuario.findMany.mockResolvedValue([] as any);
    prisma.notificacion.createMany.mockResolvedValue({ count: 0 } as any);

    await service.cambiarEstado(
      's1',
      EstadoSolicitud.RECHAZADA_COMISION,
      {
        id: 'u1',
        rol: RolUsuario.COMISION_OTORGAMIENTO,
        municipio: 'Playa',
      } as any,
      'No cumple requisitos',
    );

    expect(trazabilidad.crearTrazabilidadAutomatica).toHaveBeenCalledWith(
      's1',
      EstadoSolicitud.APROBADA_DIRECCION,
      EstadoSolicitud.RECHAZADA_COMISION,
      'u1',
      'No cumple requisitos',
      expect.anything(),
    );
    expect(dispatcher.dispatch).toHaveBeenCalled();
  });

  // ── verificarPermisosSolicitud: rol inválido ──────────────
  it('rechaza rol desconocido', async () => {
    prisma.solicitud.findUnique.mockResolvedValue(makeSolicitud());
    await expect(
      service.findOne('s1', { rol: 'ROL_INEXISTENTE' as any }),
    ).rejects.toThrow(ForbiddenException);
  });

  // ── obtenerMotivoDenegacion (vía findOne) ─────────────────
  it('extrae motivoDenegacion cuando el comentario no es automático', async () => {
    prisma.solicitud.findUnique.mockResolvedValue(
      makeSolicitud({
        estado: EstadoSolicitud.RECHAZADA_COMISION,
        trazas: [
          { comentario: 'Falta documentación del menor', fecha: new Date() },
        ],
      }),
    );

    const r = await service.findOne('s1', { rol: RolUsuario.ADMINISTRADOR });
    expect(r.motivoDenegacion).toBe('Falta documentación del menor');
  });

  it('ignora comentarios automáticos (PREFIJO_COMENTARIO_AUTOMATICO)', async () => {
    prisma.solicitud.findUnique.mockResolvedValue(
      makeSolicitud({
        estado: EstadoSolicitud.RECHAZADA_COMISION,
        trazas: [{ comentario: 'Cambio de estado: X → Y', fecha: new Date() }],
      }),
    );

    const r = await service.findOne('s1', { rol: RolUsuario.ADMINISTRADOR });
    expect(r.motivoDenegacion).toBeNull();
  });

  // ── getEstadisticas sin filtro ────────────────────────────
  it('getEstadisticas sin municipio cuenta todo', async () => {
    prisma.solicitud.findMany.mockResolvedValue([
      makeSolicitud({ estado: 'EN_REVISION', decisiones: [] }),
      makeSolicitud({ estado: 'APROBADA_COMISION', decisiones: [] }),
    ] as any);
    const r = await service.getEstadisticas({});
    expect(r.total).toBe(2);
    expect(r.porEstado.EN_REVISION).toBe(1);
    expect(r.porEstado.APROBADA_COMISION).toBe(1);
  });

    // ── updateNino sin recálculo ──────────────────────────────
  it('updateNino sin cambios de caso no recalcula prioridad', async () => {
    prisma.solicitud.findUnique
      .mockResolvedValueOnce(makeSolicitud())
      .mockResolvedValueOnce(makeSolicitud());
    ninosService.update.mockResolvedValue({
      casoEspecial: false,
      tipoNecesidad: null,
    });
    priorityCalculator.calculatePriority.mockClear();

    await service.updateNino(
      's1',
      { nombre: 'NuevoNombre' } as any,
      { id: 'u1', rol: RolUsuario.ADMINISTRADOR } as any,
    );

    expect(priorityCalculator.calculatePriority).not.toHaveBeenCalled();
  });

  // ── update como SOLICITANTE ───────────────────────────────
  it('SOLICITANTE solo puede actualizar sus propios campos permitidos', async () => {
    prisma.solicitud.findUnique.mockResolvedValue(makeSolicitud());
    prisma.solicitud.update.mockResolvedValue(makeSolicitud());

    await service.update(
      's1',
      { observaciones: 'nueva obs' } as any,
      { id: 'u1', rol: RolUsuario.SOLICITANTE, perfilId: 'sol1' } as any,
    );

    expect(prisma.solicitud.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ observaciones: 'nueva obs' }),
      }),
    );
  });

    // ── update: ramas por rol y estadoCambio ──────────────────
  it('FUNCIONARIO actualiza estado y dispara trazabilidad + evento', async () => {
    prisma.solicitud.findUnique.mockResolvedValue(makeSolicitud());
    prisma.solicitud.update.mockResolvedValue(
      makeSolicitud({ estado: 'APROBADA_DIRECCION' }),
    );
    prisma.usuario.findMany.mockResolvedValue([] as any);
    prisma.notificacion.createMany.mockResolvedValue({ count: 0 } as any);

    await service.update(
      's1',
      { estado: EstadoSolicitud.APROBADA_DIRECCION } as any,
      { id: 'u1', rol: RolUsuario.FUNCIONARIO_MUNICIPAL, municipio: 'Playa' } as any,
    );

    expect(trazabilidad.crearTrazabilidadAutomatica).toHaveBeenCalled();
    expect(dispatcher.dispatch).toHaveBeenCalled();
  });

  it('SOLICITANTE solo puede cambiar observaciones y circuloId', async () => {
    prisma.solicitud.findUnique.mockResolvedValue(makeSolicitud());
    prisma.solicitud.update.mockResolvedValue(makeSolicitud());

    await service.update(
      's1',
      { observaciones: 'Nueva obs', circuloId: null } as any,
      { id: 'u1', rol: RolUsuario.SOLICITANTE, perfilId: 'sol1' } as any,
    );

    expect(prisma.solicitud.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          observaciones: 'Nueva obs',
          circuloId: null,
        }),
      }),
    );
  });

  it('COMISION puede fijar prioridad manualmente', async () => {
    prisma.solicitud.findUnique.mockResolvedValue(makeSolicitud());
    prisma.solicitud.update.mockResolvedValue(makeSolicitud({ prioridad: 999 }));

    await service.update(
      's1',
      { prioridad: 999 } as any,
      { id: 'u1', rol: RolUsuario.COMISION_OTORGAMIENTO, municipio: 'Playa' } as any,
    );

    expect(prisma.solicitud.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ prioridad: 999 }),
      }),
    );
  });

  // ── cambiarEstado: RECHAZADA_DIRECCION ────────────────────
  it('cambiarEstado a RECHAZADA_DIRECCION funciona', async () => {
    prisma.solicitud.findUnique.mockResolvedValue(makeSolicitud());
    prisma.solicitud.update.mockResolvedValue(
      makeSolicitud({ estado: EstadoSolicitud.RECHAZADA_DIRECCION }),
    );
    prisma.usuario.findMany.mockResolvedValue([] as any);
    prisma.notificacion.createMany.mockResolvedValue({ count: 0 } as any);

    const r = await service.cambiarEstado(
      's1',
      EstadoSolicitud.RECHAZADA_DIRECCION,
      { id: 'u1', rol: RolUsuario.FUNCIONARIO_MUNICIPAL, municipio: 'Playa' } as any,
      'Rechazada por dirección',
    );
    expect(r.estado).toBe(EstadoSolicitud.RECHAZADA_DIRECCION);
  });

  // ── cambiarEstado: APROBADA_COMISION con círculo distinto ─
  it('APROBADA_COMISION con circuloId distinto reasigna la solicitud', async () => {
    prisma.solicitud.findUnique.mockResolvedValue(
      makeSolicitud({ circuloId: 'c1' }),
    );
    prisma.circuloInfantil.findUnique.mockResolvedValue({
      id: 'c2',
      nombre: 'Otro',
      activo: true,
      municipioRel: { nombre: 'Playa' },
    } as any);
    prisma.matricula.findUnique.mockResolvedValue(null);
    prisma.matricula.create.mockResolvedValue({
      id: 'm1',
      folio: 'F1',
      fechaOtorgamiento: new Date(),
      fechaLimite: new Date(),
    } as any);
    prisma.perfilDirector.findUnique.mockResolvedValue(null);
    prisma.solicitud.update.mockResolvedValue(
      makeSolicitud({ estado: 'APROBADA_COMISION' }),
    );
    prisma.usuario.findMany.mockResolvedValue([] as any);
    prisma.notificacion.createMany.mockResolvedValue({ count: 0 } as any);

    await service.cambiarEstado(
      's1',
      EstadoSolicitud.APROBADA_COMISION,
      { id: 'u1', rol: RolUsuario.COMISION_OTORGAMIENTO, municipio: 'Playa' } as any,
      undefined,
      'c2',
    );

    expect(prisma.solicitud.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ circuloId: 'c2' }),
      }),
    );
  });

  // ── DIRECTOR accede a su propia solicitud ────────────────
  it('DIRECTOR accede a solicitud de su propio círculo', async () => {
    prisma.solicitud.findUnique.mockResolvedValue(makeSolicitud());
    await expect(
      service.findOne('s1', {
        rol: RolUsuario.DIRECTOR_CIRCULO,
        perfil: { circuloId: 'c1' },
      }),
    ).resolves.toBeTruthy();
  });

  // ── remove como FUNCIONARIO del mismo municipio ───────────
  it('FUNCIONARIO puede eliminar solicitud de su municipio', async () => {
    prisma.solicitud.findUnique.mockResolvedValue(makeSolicitud());
    prisma.decisionSolicitud.count.mockResolvedValue(0);
    prisma.matricula.count.mockResolvedValue(0);
    prisma.solicitud.delete.mockResolvedValue({} as any);

    await service.remove('s1', {
      id: 'u1',
      rol: RolUsuario.FUNCIONARIO_MUNICIPAL,
      municipio: 'Playa',
    });

    expect(prisma.solicitud.delete).toHaveBeenCalled();
  });

  // ── getEstadisticas con y sin decisiones ─────────────────
  it('getEstadisticas cuenta conDecision y sinDecision', async () => {
    prisma.solicitud.findMany.mockResolvedValue([
      makeSolicitud({ estado: 'EN_REVISION', decisiones: [{ id: 'd1' }] }),
      makeSolicitud({ estado: 'EN_REVISION', decisiones: [] }),
    ] as any);

    const r = await service.getEstadisticas({});
    expect(r.conDecision).toBe(1);
    expect(r.sinDecision).toBe(1);
    expect(r.porcentajeConDecision).toBe(50);
  });

  // ── getEstadisticas: porSector y porTipo ─────────────────
  it('getEstadisticas agrega porSector y porTipo', async () => {
    prisma.solicitud.findMany.mockResolvedValue([
      makeSolicitud({ sector: 'SALUD', tipoSolicitud: 'TRABAJADOR', decisiones: [] }),
      makeSolicitud({
        sector: 'EDUCACION',
        tipoSolicitud: 'ESTUDIANTE',
        decisiones: [],
      }),
    ] as any);

    const r = await service.getEstadisticas({});
    expect(r.porSector).toEqual({ SALUD: 1, EDUCACION: 1 });
    expect(r.porTipo.TRABAJADOR).toBe(1);
    expect(r.porTipo.ESTUDIANTE).toBe(1);
  });

  // ── notificarPersonal: usuarios coincidentes ─────────────
  it('notificarPersonal crea notificaciones para usuarios del municipio', async () => {
    prisma.usuario.findMany.mockResolvedValue([
      { id: 'u1', municipioRel: { nombre: 'Playa' } },
      { id: 'u2', municipioRel: { nombre: 'Cerro' } },
    ] as any);
    prisma.notificacion.createMany.mockResolvedValue({ count: 1 } as any);

    await (service as any).notificarPersonal(
      RolUsuario.FUNCIONARIO_MUNICIPAL,
      'Playa',
      't',
      'm',
    );

    const arg = prisma.notificacion.createMany.mock.calls[0][0] as any;
    expect(arg.data).toHaveLength(1);
    expect(arg.data[0].usuarioId).toBe('u1');
  });
});
