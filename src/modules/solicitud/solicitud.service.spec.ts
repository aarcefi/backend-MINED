/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Test, TestingModule } from '@nestjs/testing';
import { SolicitudService } from './solicitud.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NinosService } from '../nino/nino.service';
import { PeriodoService } from '../periodo/periodo.service';
import { TrazabilidadService } from '../trazabilidad/trazabilidad.service';
import { ValidacionIdentidadService } from '../validacion-ficha-unica/validacion-ficha-unica.service';
import { PriorityCalculator } from '../../common/prioridades/prioridad-calc.service.';
import { DateUtilsService } from '../../common/utils/date-utils.service';
import { EventDispatcher } from '../../common/events/event-dispatcher.service';
import { CreateSolicitudDto, UpdateSolicitudDto } from './dto';
import {
  EstadoSolicitud,
  RolUsuario,
  SectorPrioridad,
  TipoSolicitud,
} from '../../common/enums';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('SolicitudService', () => {
  let service: SolicitudService;
  let prisma: PrismaService;
  let ninosService: NinosService;
  let periodoService: PeriodoService;
  let trazabilidadService: TrazabilidadService;
  let validacionService: ValidacionIdentidadService;
  let priorityCalculator: PriorityCalculator;
  let eventDispatcher: EventDispatcher;

  const mockSolicitante = {
    id: 'solicitante-id',
    usuarioId: 'user-id',
    direccion: 'Calle 123',
    centroTrabajo: 'Oficina',
    tipoPersona: 'MADRE',
    cantHijos: 2,
    usuario: {
      id: 'user-id',
      email: 'solicitante@example.com',
      nombre: 'María',
      apellidos: 'González',
      carnetIdentidad: '85010112345',
      telefono: '+5351234567',
      municipio: 'La Habana',
      provincia: 'La Habana',
    },
  };

  const mockNino = {
    id: 'nino-id',
    nombre: 'Juan',
    apellidos: 'Pérez',
    fechaNacimiento: new Date('2021-05-10'),
    sexo: 'M',
    tarjetaMenor: 'TM001',
    solicitanteId: 'solicitante-id',
    casoEspecial: false,
    tipoNecesidad: null,
  };

  const mockSolicitud = {
    id: 'solicitud-id',
    ninoId: 'nino-id',
    solicitanteId: 'solicitante-id',
    fechaSolicitud: new Date(),
    sector: SectorPrioridad.SALUD,
    tipoSolicitud: TipoSolicitud.TRABAJADOR,
    estado: EstadoSolicitud.EN_REVISION,
    periodoId: 'periodo-id',
    observaciones: 'Observaciones',
    prioridad: 50,
    anioSolicitado: 'ANIO_3',
    nino: mockNino,
    periodo: {
      id: 'periodo-id',
      nombre: 'Periodo',
      fechaInicio: new Date(),
      fechaCierre: new Date(),
    },
    solicitante: mockSolicitante,
    documentos: [],
    matricula: null,
  };

  const mockPrisma = {
    perfilSolicitante: { findUnique: jest.fn() },
    nino: { findFirst: jest.fn() },
    solicitud: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    documentoSolicitud: { count: jest.fn() },
    decisionSolicitud: { count: jest.fn() },
    matricula: { count: jest.fn() },
    $transaction: jest.fn().mockImplementation(async (cb) => cb(mockPrisma)),
  };

  const mockNinosService = {
    create: jest.fn().mockResolvedValue(mockNino),
    update: jest.fn().mockResolvedValue(mockNino),
    findOne: jest.fn().mockResolvedValue(mockNino),
  };

  const mockPeriodoService = {
    obtenerPeriodoActivo: jest.fn().mockResolvedValue({
      id: 'periodo-id',
      fechaInicio: new Date('2026-01-01'),
      fechaCierre: new Date('2026-06-30'),
    }),
  };

  const mockTrazabilidadService = {
    crearTrazabilidadAutomatica: jest.fn().mockResolvedValue({}),
  };

  const mockValidacionService = {
    verificarCarnetIdentidad: jest.fn().mockResolvedValue(true),
  };

  const mockPriorityCalculator = {
    calculatePriority: jest.fn().mockReturnValue(50),
    getPriorityBreakdown: jest.fn(),
  };

  const mockDateUtils = {
    calcularAnioVida: jest.fn().mockReturnValue('ANIO_3'),
  };

  const mockEventDispatcher = {
    dispatch: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolicitudService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NinosService, useValue: mockNinosService },
        { provide: PeriodoService, useValue: mockPeriodoService },
        { provide: TrazabilidadService, useValue: mockTrazabilidadService },
        {
          provide: ValidacionIdentidadService,
          useValue: mockValidacionService,
        },
        { provide: PriorityCalculator, useValue: mockPriorityCalculator },
        { provide: DateUtilsService, useValue: mockDateUtils },
        { provide: EventDispatcher, useValue: mockEventDispatcher },
      ],
    }).compile();

    service = module.get<SolicitudService>(SolicitudService);
    prisma = module.get<PrismaService>(PrismaService);
    ninosService = module.get<NinosService>(NinosService);
    periodoService = module.get<PeriodoService>(PeriodoService);
    trazabilidadService = module.get<TrazabilidadService>(TrazabilidadService);
    validacionService = module.get<ValidacionIdentidadService>(
      ValidacionIdentidadService,
    );
    priorityCalculator = module.get<PriorityCalculator>(PriorityCalculator);
    eventDispatcher = module.get<EventDispatcher>(EventDispatcher);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto: CreateSolicitudDto = {
      solicitanteId: 'solicitante-id',
      sector: SectorPrioridad.SALUD,
      tipoSolicitud: TipoSolicitud.TRABAJADOR,
      estado: EstadoSolicitud.EN_REVISION,
      observaciones: 'Observaciones',
      nino: {
        nombre: 'Juan',
        apellidos: 'Pérez',
        fechaNacimiento: '2021-05-10',
        sexo: 'M',
        tarjetaMenor: 'TM001',
        casoEspecial: false,
        tipoNecesidad: null,
      },
    };

    it('should throw NotFoundException if solicitante does not exist', async () => {
      mockPrisma.perfilSolicitante.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.create(createDto, { id: 'user-id' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if fecha actual fuera del periodo activo', async () => {
      mockPrisma.perfilSolicitante.findUnique.mockResolvedValueOnce(
        mockSolicitante,
      );
      const periodoInvalido = {
        id: 'periodo-id',
        fechaInicio: new Date('2026-01-01'),
        fechaCierre: new Date('2026-03-31'),
      };
      mockPeriodoService.obtenerPeriodoActivo.mockResolvedValueOnce(
        periodoInvalido,
      );
      // Simular fecha actual fuera del rango
      const mockDate = new Date('2026-06-01');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
      await expect(
        service.create(createDto, { id: 'user-id' }),
      ).rejects.toThrow(ConflictException);
      jest.spyOn(global, 'Date').mockRestore();
    });

    it('should find existing nino and use it', async () => {
      mockPrisma.perfilSolicitante.findUnique.mockResolvedValueOnce(
        mockSolicitante,
      );
      mockPeriodoService.obtenerPeriodoActivo.mockResolvedValueOnce({
        id: 'periodo-id',
        fechaInicio: new Date('2026-01-01'),
        fechaCierre: new Date('2026-12-31'),
      });
      mockPrisma.nino.findFirst.mockResolvedValueOnce(mockNino);
      mockPrisma.solicitud.findFirst.mockResolvedValueOnce(null);
      mockPrisma.solicitud.create.mockResolvedValueOnce(mockSolicitud);

      const result = await service.create(createDto, { id: 'user-id' });
      expect(result).toHaveProperty('id', 'solicitud-id');
      expect(
        mockValidacionService.verificarCarnetIdentidad,
      ).not.toHaveBeenCalled();
    });

    it('should create a new nino if not found and verify carnet', async () => {
      mockPrisma.perfilSolicitante.findUnique.mockResolvedValueOnce(
        mockSolicitante,
      );
      mockPeriodoService.obtenerPeriodoActivo.mockResolvedValueOnce({
        id: 'periodo-id',
        fechaInicio: new Date('2026-01-01'),
        fechaCierre: new Date('2026-12-31'),
      });
      mockPrisma.nino.findFirst.mockResolvedValueOnce(null);
      mockPrisma.solicitud.findFirst.mockResolvedValueOnce(null);
      mockPrisma.solicitud.create.mockResolvedValueOnce(mockSolicitud);

      const result = await service.create(createDto, { id: 'user-id' });
      expect(
        mockValidacionService.verificarCarnetIdentidad,
      ).toHaveBeenCalledWith('TM001');
      expect(mockNinosService.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'solicitud-id');
    });

    it('should throw ConflictException if nino belongs to another solicitante', async () => {
      mockPrisma.perfilSolicitante.findUnique.mockResolvedValueOnce(
        mockSolicitante,
      );
      mockPeriodoService.obtenerPeriodoActivo.mockResolvedValueOnce({
        id: 'periodo-id',
        fechaInicio: new Date('2026-01-01'),
        fechaCierre: new Date('2026-12-31'),
      });
      mockPrisma.nino.findFirst.mockResolvedValueOnce({
        ...mockNino,
        solicitanteId: 'other',
      });
      await expect(
        service.create(createDto, { id: 'user-id' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if active solicitud exists for nino in periodo', async () => {
      mockPrisma.perfilSolicitante.findUnique.mockResolvedValueOnce(
        mockSolicitante,
      );
      mockPeriodoService.obtenerPeriodoActivo.mockResolvedValueOnce({
        id: 'periodo-id',
        fechaInicio: new Date('2026-01-01'),
        fechaCierre: new Date('2026-12-31'),
      });
      mockPrisma.nino.findFirst.mockResolvedValueOnce(mockNino);
      mockPrisma.solicitud.findFirst.mockResolvedValueOnce({ id: 'existing' });
      await expect(
        service.create(createDto, { id: 'user-id' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should calculate priority and create solicitud', async () => {
      mockPrisma.perfilSolicitante.findUnique.mockResolvedValueOnce(
        mockSolicitante,
      );
      mockPeriodoService.obtenerPeriodoActivo.mockResolvedValueOnce({
        id: 'periodo-id',
        fechaInicio: new Date('2026-01-01'),
        fechaCierre: new Date('2026-12-31'),
      });
      mockPrisma.nino.findFirst.mockResolvedValueOnce(mockNino);
      mockPrisma.solicitud.findFirst.mockResolvedValueOnce(null);
      mockPrisma.solicitud.create.mockResolvedValueOnce(mockSolicitud);
      mockDateUtils.calcularAnioVida.mockReturnValueOnce('ANIO_3');

      const result = await service.create(createDto, { id: 'user-id' });
      expect(priorityCalculator.calculatePriority).toHaveBeenCalled();
      expect(
        mockTrazabilidadService.crearTrazabilidadAutomatica,
      ).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'solicitud-id');
    });

    it('should throw BadRequestException if child age not between 1 and 6', async () => {
      mockPrisma.perfilSolicitante.findUnique.mockResolvedValueOnce(
        mockSolicitante,
      );
      mockPeriodoService.obtenerPeriodoActivo.mockResolvedValueOnce({
        id: 'periodo-id',
        fechaInicio: new Date('2026-01-01'),
        fechaCierre: new Date('2026-12-31'),
      });
      mockPrisma.nino.findFirst.mockResolvedValueOnce(mockNino);
      mockDateUtils.calcularAnioVida.mockReturnValueOnce(null);
      await expect(
        service.create(createDto, { id: 'user-id' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return list of solicitudes with filters', async () => {
      mockPrisma.solicitud.findMany.mockResolvedValueOnce([mockSolicitud]);
      const result = await service.findAll(
        { estado: EstadoSolicitud.EN_REVISION },
        { rol: RolUsuario.ADMINISTRADOR },
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', 'solicitud-id');
    });

    it('should apply municipio filter for solicitante', async () => {
      mockPrisma.solicitud.findMany.mockResolvedValueOnce([mockSolicitud]);
      await service.findAll(
        { municipio: 'La Habana' },
        { rol: RolUsuario.ADMINISTRADOR },
      );
      expect(mockPrisma.solicitud.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            solicitante: {
              usuario: {
                municipio: { contains: 'La Habana', mode: 'insensitive' },
              },
            },
          }),
        }),
      );
    });

    it('should filter by director de circulo municipio', async () => {
      mockPrisma.solicitud.findMany.mockResolvedValueOnce([mockSolicitud]);
      await service.findAll(
        {},
        {
          rol: RolUsuario.DIRECTOR_CIRCULO,
          perfil: { municipio: 'Centro Habana' },
        },
      );
      expect(mockPrisma.solicitud.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            solicitante: {
              usuario: {
                municipio: { contains: 'Centro Habana', mode: 'insensitive' },
              },
            },
          }),
        }),
      );
    });

    it('should apply date filters', async () => {
      mockPrisma.solicitud.findMany.mockResolvedValueOnce([mockSolicitud]);
      await service.findAll(
        {
          fechaDesde: new Date('2026-01-01'),
          fechaHasta: new Date('2026-12-31'),
        },
        { rol: RolUsuario.ADMINISTRADOR },
      );
      expect(mockPrisma.solicitud.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fechaSolicitud: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return solicitud if found and user has permission', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValueOnce(mockSolicitud);
      const result = await service.findOne('solicitud-id', {
        rol: RolUsuario.ADMINISTRADOR,
      });
      expect(result).toHaveProperty('id', 'solicitud-id');
    });

    it('should throw NotFoundException if solicitud not found', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.findOne('invalid', { rol: RolUsuario.ADMINISTRADOR }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for solicitante if not owner', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValueOnce(mockSolicitud);
      await expect(
        service.findOne('solicitud-id', {
          rol: RolUsuario.SOLICITANTE,
          perfilId: 'other',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for director if not same municipio', async () => {
      const solicitudWithMunicipio = {
        ...mockSolicitud,
        solicitante: {
          ...mockSolicitante,
          usuario: { ...mockSolicitante.usuario, municipio: 'Otro' },
        },
      };
      mockPrisma.solicitud.findUnique.mockResolvedValueOnce(
        solicitudWithMunicipio,
      );
      await expect(
        service.findOne('solicitud-id', {
          rol: RolUsuario.DIRECTOR_CIRCULO,
          perfil: { municipio: 'La Habana' },
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for unknown role', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValueOnce(mockSolicitud);
      await expect(
        service.findOne('solicitud-id', { rol: 'UNKNOWN' as any }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findBySolicitanteId', () => {
    it('should return list of solicitudes for solicitante', async () => {
      mockPrisma.solicitud.findMany.mockResolvedValueOnce([mockSolicitud]);
      const result = await service.findBySolicitanteId('solicitante-id');
      expect(result).toHaveLength(1);
      expect(mockPrisma.solicitud.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { solicitanteId: 'solicitante-id' },
        }),
      );
    });
  });

  describe('findByNinoId', () => {
    it('should return list of solicitudes for nino', async () => {
      mockNinosService.findOne.mockResolvedValueOnce(mockNino);
      mockPrisma.solicitud.findMany.mockResolvedValueOnce([mockSolicitud]);
      const result = await service.findByNinoId('nino-id', {
        rol: RolUsuario.ADMINISTRADOR,
      });
      expect(result).toHaveLength(1);
    });

    it('should throw ForbiddenException if solicitante tries to access other nino', async () => {
      mockNinosService.findOne.mockResolvedValueOnce({
        ...mockNino,
        solicitanteId: 'other',
      });
      await expect(
        service.findByNinoId('nino-id', {
          rol: RolUsuario.SOLICITANTE,
          perfilId: 'solicitante-id',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findPendientesRevision', () => {
    it('should return solicitudes with estado EN_REVISION and documentos validados', async () => {
      mockPrisma.solicitud.findMany.mockResolvedValueOnce([mockSolicitud]);
      const result = await service.findPendientesRevision();
      expect(result).toHaveLength(1);
      expect(mockPrisma.solicitud.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estado: 'EN_REVISION',
            documentos: { every: { validado: true } },
          }),
        }),
      );
    });

    it('should filter by municipio', async () => {
      mockPrisma.solicitud.findMany.mockResolvedValueOnce([mockSolicitud]);
      await service.findPendientesRevision('La Habana');
      expect(mockPrisma.solicitud.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            solicitante: {
              usuario: {
                municipio: { contains: 'La Habana', mode: 'insensitive' },
              },
            },
          }),
        }),
      );
    });
  });

  describe('update', () => {
    const updateDto: UpdateSolicitudDto = {
      sector: SectorPrioridad.EDUCACION,
      tipoSolicitud: TipoSolicitud.ESTUDIANTE,
      observaciones: 'Actualizado',
      estado: EstadoSolicitud.APROBADA_COMISION,
    };

    it('should throw NotFoundException if solicitud not found', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.update('invalid', updateDto, { rol: RolUsuario.ADMINISTRADOR }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should allow solicitante to update only sector, tipo, observaciones', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValueOnce(mockSolicitud);
      mockPrisma.solicitud.update.mockResolvedValueOnce({
        ...mockSolicitud,
        ...updateDto,
      });
      const result = await service.update('solicitud-id', updateDto, {
        rol: RolUsuario.SOLICITANTE,
        perfilId: 'solicitante-id',
      });
      expect(result).toHaveProperty('estado', mockSolicitud.estado); // estado no debe cambiar
    });

    it('should allow funcionario to update estado and recalculate priority', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValueOnce({
        ...mockSolicitud,
        nino: mockNino,
        solicitante: mockSolicitante,
      });
      mockPrisma.solicitud.update.mockResolvedValueOnce({
        ...mockSolicitud,
        ...updateDto,
      });
      const result = await service.update('solicitud-id', updateDto, {
        rol: RolUsuario.FUNCIONARIO_MUNICIPAL,
      });
      expect(priorityCalculator.calculatePriority).toHaveBeenCalled();
      expect(result).toHaveProperty(
        'estado',
        EstadoSolicitud.APROBADA_COMISION,
      );
    });

    it('should not allow solicitante to change estado', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValueOnce(mockSolicitud);
      mockPrisma.solicitud.update.mockResolvedValueOnce({
        ...mockSolicitud,
        estado: EstadoSolicitud.RECHAZADA_COMISION,
      });
      const result = await service.update(
        'solicitud-id',
        { estado: EstadoSolicitud.RECHAZADA_COMISION },
        {
          rol: RolUsuario.SOLICITANTE,
          perfilId: 'solicitante-id',
        },
      );
      expect(result.estado).toBe(mockSolicitud.estado); // no cambió
    });

    it('should return without updating if no changes', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValueOnce(mockSolicitud);
      const result = await service.update(
        'solicitud-id',
        {},
        { rol: RolUsuario.ADMINISTRADOR },
      );
      expect(result).toHaveProperty('id', 'solicitud-id');
      expect(mockPrisma.solicitud.update).not.toHaveBeenCalled();
    });

    it('should dispatch event if estado changes by non-solicitante', async () => {
      const updatedSolicitud = {
        ...mockSolicitud,
        estado: EstadoSolicitud.APROBADA_COMISION,
      };
      mockPrisma.solicitud.findUnique.mockResolvedValueOnce({
        ...mockSolicitud,
        nino: mockNino,
        solicitante: mockSolicitante,
      });
      mockPrisma.solicitud.update.mockResolvedValueOnce(updatedSolicitud);
      await service.update(
        'solicitud-id',
        { estado: EstadoSolicitud.APROBADA_COMISION },
        {
          rol: RolUsuario.FUNCIONARIO_MUNICIPAL,
        },
      );
      expect(eventDispatcher.dispatch).toHaveBeenCalled();
    });
  });

  describe('updateNino', () => {
    it('should update nino and recalculate priority', async () => {
      const updateNinoDto = { casoEspecial: true };
      mockPrisma.solicitud.findUnique.mockResolvedValueOnce({
        ...mockSolicitud,
        nino: mockNino,
        solicitante: mockSolicitante,
      });
      mockNinosService.update.mockResolvedValueOnce({
        ...mockNino,
        casoEspecial: true,
      });
      mockPrisma.solicitud.update.mockResolvedValueOnce(mockSolicitud);
      const result = await service.updateNino('solicitud-id', updateNinoDto, {
        rol: RolUsuario.ADMINISTRADOR,
      });
      expect(mockNinosService.update).toHaveBeenCalledWith(
        'nino-id',
        updateNinoDto,
      );
      expect(priorityCalculator.calculatePriority).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if solicitud not found', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.updateNino('invalid', {}, { rol: RolUsuario.ADMINISTRADOR }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cambiarEstado', () => {
    it('should change estado and dispatch event', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValueOnce({
        ...mockSolicitud,
        nino: mockNino,
        solicitante: mockSolicitante,
      });
      mockPrisma.solicitud.update.mockResolvedValueOnce({
        ...mockSolicitud,
        estado: EstadoSolicitud.APROBADA_COMISION,
      });
      const result = await service.cambiarEstado(
        'solicitud-id',
        EstadoSolicitud.APROBADA_COMISION,
        { id: 'user-id', rol: RolUsuario.FUNCIONARIO_MUNICIPAL },
        'Comentario',
      );
      expect(
        mockTrazabilidadService.crearTrazabilidadAutomatica,
      ).toHaveBeenCalled();
      expect(eventDispatcher.dispatch).toHaveBeenCalled();
      expect(result).toHaveProperty(
        'estado',
        EstadoSolicitud.APROBADA_COMISION,
      );
    });

    it('should throw ForbiddenException if solicitante tries to change estado', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValueOnce(mockSolicitud);
      await expect(
        service.cambiarEstado(
          'solicitud-id',
          EstadoSolicitud.APROBADA_COMISION,
          { id: 'user-id', rol: RolUsuario.SOLICITANTE },
          'Comentario',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete solicitud if no dependencies', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValueOnce(mockSolicitud);
      mockPrisma.documentoSolicitud.count.mockResolvedValueOnce(0);
      mockPrisma.decisionSolicitud.count.mockResolvedValueOnce(0);
      mockPrisma.matricula.count.mockResolvedValueOnce(0);
      mockPrisma.solicitud.delete.mockResolvedValueOnce({});
      const result = await service.remove('solicitud-id', {
        rol: RolUsuario.ADMINISTRADOR,
      });
      expect(result.message).toContain('eliminada exitosamente');
    });

    it('should throw ConflictException if tiene documentos', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValueOnce(mockSolicitud);
      mockPrisma.documentoSolicitud.count.mockResolvedValueOnce(1);
      await expect(
        service.remove('solicitud-id', { rol: RolUsuario.ADMINISTRADOR }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if tiene decisiones', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValueOnce(mockSolicitud);
      mockPrisma.documentoSolicitud.count.mockResolvedValueOnce(0);
      mockPrisma.decisionSolicitud.count.mockResolvedValueOnce(1);
      await expect(
        service.remove('solicitud-id', { rol: RolUsuario.ADMINISTRADOR }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if tiene matricula', async () => {
      mockPrisma.solicitud.findUnique.mockResolvedValueOnce(mockSolicitud);
      mockPrisma.documentoSolicitud.count.mockResolvedValueOnce(0);
      mockPrisma.decisionSolicitud.count.mockResolvedValueOnce(0);
      mockPrisma.matricula.count.mockResolvedValueOnce(1);
      await expect(
        service.remove('solicitud-id', { rol: RolUsuario.ADMINISTRADOR }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getEstadisticas', () => {
    it('should return statistics', async () => {
      mockPrisma.solicitud.findMany.mockResolvedValueOnce([mockSolicitud]);
      const result = await service.getEstadisticas({ periodoId: 'periodo-id' });
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('porEstado');
      expect(result).toHaveProperty('porSector');
      expect(result).toHaveProperty('porTipo');
    });

    it('should filter by municipio', async () => {
      mockPrisma.solicitud.findMany.mockResolvedValueOnce([mockSolicitud]);
      await service.getEstadisticas({ municipio: 'La Habana' });
      expect(mockPrisma.solicitud.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            solicitante: {
              usuario: {
                municipio: { contains: 'La Habana', mode: 'insensitive' },
              },
            },
          }),
        }),
      );
    });
  });

  describe('Private methods coverage', () => {
    it('should calculate priority correctly', () => {
      const prioridad = service['calcularPrioridad'](
        { sector: 'SALUD', tipoSolicitud: 'TRABAJADOR' },
        { casoEspecial: true, tipoNecesidad: 'DISCAPACIDAD' },
        { cantHijos: 2 },
      );
      expect(prioridad).toBe(30 + 20 + 15 + 10 + 5); // 80
    });

    it('should verify permisos for ADMINISTRADOR', () => {
      const solicitud = {
        solicitante: { usuario: { municipio: 'La Habana' } },
      };
      expect(() =>
        service['verificarPermisosSolicitud'](solicitud, {
          rol: RolUsuario.ADMINISTRADOR,
        }),
      ).not.toThrow();
    });

    it('should verify permisos for FUNCIONARIO_MUNICIPAL', () => {
      const solicitud = {
        solicitante: { usuario: { municipio: 'La Habana' } },
      };
      expect(() =>
        service['verificarPermisosSolicitud'](solicitud, {
          rol: RolUsuario.FUNCIONARIO_MUNICIPAL,
        }),
      ).not.toThrow();
    });

    it('should verify permisos for COMISION_OTORGAMIENTO', () => {
      const solicitud = {
        solicitante: { usuario: { municipio: 'La Habana' } },
      };
      expect(() =>
        service['verificarPermisosSolicitud'](solicitud, {
          rol: RolUsuario.COMISION_OTORGAMIENTO,
        }),
      ).not.toThrow();
    });

    it('should verify permisos for DIRECTOR_CIRCULO with same municipio', () => {
      const solicitud = {
        solicitante: { usuario: { municipio: 'La Habana' } },
      };
      expect(() =>
        service['verificarPermisosSolicitud'](solicitud, {
          rol: RolUsuario.DIRECTOR_CIRCULO,
          perfil: { municipio: 'La Habana' },
        }),
      ).not.toThrow();
    });

    it('should throw ForbiddenException for DIRECTOR_CIRCULO with different municipio', () => {
      const solicitud = {
        solicitante: { usuario: { municipio: 'La Habana' } },
      };
      expect(() =>
        service['verificarPermisosSolicitud'](solicitud, {
          rol: RolUsuario.DIRECTOR_CIRCULO,
          perfil: { municipio: 'Otro' },
        }),
      ).toThrow(ForbiddenException);
    });

    it('should verify permisos for SOLICITANTE owner', () => {
      const solicitud = { solicitanteId: 'solicitante-id' };
      expect(() =>
        service['verificarPermisosSolicitud'](solicitud, {
          rol: RolUsuario.SOLICITANTE,
          perfilId: 'solicitante-id',
        }),
      ).not.toThrow();
    });

    it('should throw ForbiddenException for SOLICITANTE not owner', () => {
      const solicitud = { solicitanteId: 'solicitante-id' };
      expect(() =>
        service['verificarPermisosSolicitud'](solicitud, {
          rol: RolUsuario.SOLICITANTE,
          perfilId: 'other',
        }),
      ).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for unknown role', () => {
      const solicitud = {
        solicitante: { usuario: { municipio: 'La Habana' } },
      };
      expect(() =>
        service['verificarPermisosSolicitud'](solicitud, {
          rol: 'UNKNOWN' as any,
        }),
      ).toThrow(ForbiddenException);
    });

    it('should convert to ResponseDto', () => {
      const dto = service['toResponseDto'](mockSolicitud);
      expect(dto).toHaveProperty('id');
      expect(dto).toHaveProperty('nino');
      expect(dto).toHaveProperty('periodo');
      expect(dto).toHaveProperty('solicitante');
    });

    it('should throw error if solicitud missing required relations', () => {
      const invalidSolicitud = {
        id: '1',
        nino: null,
        solicitante: null,
        periodo: null,
      };
      expect(() => service['toResponseDto'](invalidSolicitud)).toThrow(Error);
    });
  });
});
