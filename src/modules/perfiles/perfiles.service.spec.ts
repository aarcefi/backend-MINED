/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PerfilesService } from './perfiles.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CirculoInfantilService } from '../circulo-infantil/circulo-infantil.service';
import { UsuariosService } from '../usuario/usuarios.service';
import { PriorityCalculator } from '../../common/prioridades/prioridad-calc.service.';
import {
  createPrismaMock,
  PrismaMock,
  setupTransaction,
} from '../../../test/prisma-mock';
import { EstadoSolicitud, RolUsuario } from '@prisma/client';

describe('PerfilesService', () => {
  let service: PerfilesService;
  let prisma: PrismaMock;
  let circuloService: any;
  let usuariosService: any;
  let priorityCalculator: any;

  beforeEach(async () => {
    prisma = createPrismaMock();
    setupTransaction(prisma);
    circuloService = { findOne: jest.fn() };
    usuariosService = { getProfile: jest.fn() };
    priorityCalculator = { calculatePriority: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        PerfilesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CirculoInfantilService, useValue: circuloService },
        { provide: UsuariosService, useValue: usuariosService },
        { provide: PriorityCalculator, useValue: priorityCalculator },
      ],
    }).compile();
    service = module.get(PerfilesService);
  });

  // ── createPerfilSolicitante ────────────────────────────────
  describe('createPerfilSolicitante', () => {
    it('lanza NotFound si el usuario no existe', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      await expect(
        service.createPerfilSolicitante('u1', {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFound si el rol no es SOLICITANTE', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        rol: RolUsuario.ADMINISTRADOR,
      } as any);
      await expect(
        service.createPerfilSolicitante('u1', {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('crea el perfil', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        rol: RolUsuario.SOLICITANTE,
      } as any);
      prisma.perfilSolicitante.create.mockResolvedValue({ id: 'ps1' } as any);
      const r = await service.createPerfilSolicitante('u1', {
        direccion: 'X',
      } as any);
      expect(r).toEqual({ id: 'ps1' });
    });
  });

  // ── createPerfilFuncionario ────────────────────────────────
  describe('createPerfilFuncionario', () => {
    it('lanza NotFound si no es FUNCIONARIO', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        rol: RolUsuario.SOLICITANTE,
      } as any);
      await expect(
        service.createPerfilFuncionario('u1', {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('crea el perfil', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        rol: RolUsuario.FUNCIONARIO_MUNICIPAL,
      } as any);
      prisma.perfilFuncionario.create.mockResolvedValue({ id: 'pf1' } as any);
      await expect(
        service.createPerfilFuncionario('u1', { cargo: 'X' } as any),
      ).resolves.toEqual({ id: 'pf1' });
    });
  });

  // ── createPerfilComision ───────────────────────────────────
  describe('createPerfilComision', () => {
    it('lanza NotFound si no es COMISION', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        rol: RolUsuario.SOLICITANTE,
      } as any);
      await expect(
        service.createPerfilComision('u1', {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('crea el perfil', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        rol: RolUsuario.COMISION_OTORGAMIENTO,
      } as any);
      prisma.perfilComision.create.mockResolvedValue({ id: 'pc1' } as any);
      await expect(
        service.createPerfilComision('u1', { cargo: 'X' } as any),
      ).resolves.toEqual({ id: 'pc1' });
    });
  });

  // ── createPerfilDirector ───────────────────────────────────
  describe('createPerfilDirector', () => {
    it('lanza NotFound si no es DIRECTOR', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        rol: RolUsuario.SOLICITANTE,
      } as any);
      await expect(
        service.createPerfilDirector('u1', { circuloId: 'c1' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza NotFound si el círculo no existe', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        rol: RolUsuario.DIRECTOR_CIRCULO,
      } as any);
      circuloService.findOne.mockResolvedValue(null);
      await expect(
        service.createPerfilDirector('u1', { circuloId: 'c1' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza Conflict si ya hay director', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        rol: RolUsuario.DIRECTOR_CIRCULO,
      } as any);
      circuloService.findOne.mockResolvedValue({ id: 'c1' });
      prisma.perfilDirector.findUnique.mockResolvedValue({ id: 'pd1' } as any);
      await expect(
        service.createPerfilDirector('u1', { circuloId: 'c1' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('crea en éxito', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        rol: RolUsuario.DIRECTOR_CIRCULO,
      } as any);
      circuloService.findOne.mockResolvedValue({ id: 'c1' });
      prisma.perfilDirector.findUnique.mockResolvedValue(null);
      prisma.perfilDirector.create.mockResolvedValue({ id: 'pd1' } as any);
      await expect(
        service.createPerfilDirector('u1', { circuloId: 'c1' } as any),
      ).resolves.toEqual({ id: 'pd1' });
    });
  });

  // ── finders ────────────────────────────────────────────────
  describe('finders', () => {
    it('findFuncionariosByMunicipio mapea municipioRel/provinciaRel', async () => {
      prisma.usuario.findMany.mockResolvedValue([
        {
          id: 'u1',
          email: 'a@b.c',
          nombre: 'N',
          apellidos: 'A',
          carnetIdentidad: '123',
          telefono: '5',
          municipioRel: { nombre: 'Plaza' },
          provinciaRel: { nombre: 'La Habana' },
          perfilFuncionario: { id: 'pf1', documentosVal: [], controles: [] },
        },
      ] as any);
      const r = await service.findFuncionariosByMunicipio('Plaza');
      expect(r[0]).toMatchObject({
        usuario: { municipio: 'Plaza', provincia: 'La Habana' },
      });
    });

    it('findComisionByMunicipio mapea correctamente', async () => {
      prisma.usuario.findMany.mockResolvedValue([
        {
          id: 'u1',
          email: 'a@b.c',
          nombre: 'N',
          apellidos: 'A',
          carnetIdentidad: '123',
          telefono: '5',
          municipioRel: { nombre: 'Plaza' },
          provinciaRel: { nombre: 'La Habana' },
          perfilComision: { id: 'pc1', decisiones: [] },
        },
      ] as any);
      const r = await service.findComisionByMunicipio('Plaza');
      expect(r[0].usuario.municipio).toBe('Plaza');
    });

    it('findDirectoresByMunicipio mapea correctamente', async () => {
      prisma.usuario.findMany.mockResolvedValue([
        {
          id: 'u1',
          email: 'a@b.c',
          nombre: 'N',
          apellidos: 'A',
          carnetIdentidad: '123',
          telefono: '5',
          municipioRel: { nombre: 'Plaza' },
          provinciaRel: { nombre: 'La Habana' },
          perfilDirector: { id: 'pd1', circulo: { id: 'c1' } },
        },
      ] as any);
      const r = await service.findDirectoresByMunicipio('Plaza');
      expect(r[0].usuario.municipio).toBe('Plaza');
    });
  });

  // ── getEstadisticasComision ────────────────────────────────
  describe('getEstadisticasComision', () => {
    it('lanza NotFound si no existe usuario', async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      await expect(service.getEstadisticasComision('u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('calcula por sector y porcentajes', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: 'u1',
        nombre: 'N',
        apellidos: 'A',
        rol: RolUsuario.COMISION_OTORGAMIENTO,
        municipioRel: { nombre: 'Plaza' },
        perfilComision: { id: 'pc1' },
      } as any);
      prisma.solicitud.count.mockResolvedValue(10);
      prisma.solicitud.groupBy.mockResolvedValue([
        { sector: 'SALUD', _count: { _all: 6 } },
        { sector: 'EDUCACION', _count: { _all: 4 } },
      ] as any);

      const r = await service.getEstadisticasComision('u1');
      expect(r.totalSolicitudesAprobadas).toBe(10);
      expect(r.porSector).toEqual({ SALUD: 6, EDUCACION: 4 });
      expect(r.porcentajes).toEqual({ SALUD: 60, EDUCACION: 40 });
    });
  });

  // ── configurarPrioridadComision ────────────────────────────
  describe('configurarPrioridadComision', () => {
    const baseDto = {
      sectorPrioritario1: 'SALUD' as any,
      sectorPrioritario2: 'EDUCACION' as any,
      sectorPrioritario3: 'DEFENSA' as any,
    };
    const userOk = {
      id: 'u1',
      rol: RolUsuario.COMISION_OTORGAMIENTO,
      municipioId: 'm1',
      perfilComision: { id: 'c1' },
    };

    it('lanza Forbidden si el usuario no es COMISION', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        ...userOk,
        rol: RolUsuario.SOLICITANTE,
      } as any);
      await expect(
        service.configurarPrioridadComision('u1', baseDto as any),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFound si falta perfilComision', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        ...userOk,
        perfilComision: null,
      } as any);
      await expect(
        service.configurarPrioridadComision('u1', baseDto as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequest si no hay municipioId', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        ...userOk,
        municipioId: null,
      } as any);
      await expect(
        service.configurarPrioridadComision('u1', baseDto as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequest si hay sectores duplicados', async () => {
      prisma.usuario.findUnique.mockResolvedValue(userOk as any);
      await expect(
        service.configurarPrioridadComision('u1', {
          sectorPrioritario1: 'SALUD',
          sectorPrioritario2: 'SALUD',
        } as any),
      ).rejects.toThrow('Los 3 sectores deben ser distintos');
    });

    it('lanza BadRequest si no hay período activo', async () => {
      prisma.usuario.findUnique.mockResolvedValue(userOk as any);
      prisma.periodoOtorgamiento.findFirst.mockResolvedValue(null);
      await expect(
        service.configurarPrioridadComision('u1', baseDto as any),
      ).rejects.toThrow('No hay período de otorgamiento activo');
    });

    it('lanza NotFound si el periodoId explícito no existe', async () => {
      prisma.usuario.findUnique.mockResolvedValue(userOk as any);
      prisma.periodoOtorgamiento.findUnique.mockResolvedValue(null);
      await expect(
        service.configurarPrioridadComision('u1', {
          ...baseDto,
          periodoId: 'p1',
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('upsert + recálculo: cuenta actualizadas y sin cambio', async () => {
      prisma.usuario.findUnique.mockResolvedValue(userOk as any);
      prisma.periodoOtorgamiento.findFirst.mockResolvedValue({
        id: 'per1',
      } as any);
      prisma.configuracionPrioridadComision.upsert.mockResolvedValue({
        id: 'cfg1',
        sectorPrioritario1: 'SALUD',
        sectorPrioritario2: 'EDUCACION',
        sectorPrioritario3: 'DEFENSA',
      } as any);
      prisma.solicitud.findMany.mockResolvedValue([
        {
          id: 's1',
          prioridad: 10,
          sector: 'SALUD',
          tipoSolicitud: 'TRABAJADOR',
          nino: { casoEspecial: false, tipoNecesidad: null },
          solicitante: { cantHijos: 1, usuario: { municipioId: 'm1' } },
        },
        {
          id: 's2',
          prioridad: 20,
          sector: 'EDUCACION',
          tipoSolicitud: 'TRABAJADOR',
          nino: { casoEspecial: false, tipoNecesidad: null },
          solicitante: { cantHijos: 1, usuario: { municipioId: 'm1' } },
        },
      ] as any);
      priorityCalculator.calculatePriority
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(20);
      prisma.solicitud.update.mockResolvedValue({} as any);

      const r = await service.configurarPrioridadComision('u1', baseDto as any);
      expect(r.recalculo.solicitudesActualizadas).toBe(1);
      expect(r.recalculo.solicitudesSinCambio).toBe(1);
      expect(r.recalculo.totalEvaluadas).toBe(2);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('sin solicitudes, no llama $transaction', async () => {
      prisma.usuario.findUnique.mockResolvedValue(userOk as any);
      prisma.periodoOtorgamiento.findFirst.mockResolvedValue({
        id: 'per1',
      } as any);
      prisma.configuracionPrioridadComision.upsert.mockResolvedValue({
        sectorPrioritario1: 'SALUD',
        sectorPrioritario2: null,
        sectorPrioritario3: null,
      } as any);
      prisma.solicitud.findMany.mockResolvedValue([]);

      const r = await service.configurarPrioridadComision('u1', baseDto as any);
      expect(r.recalculo.totalEvaluadas).toBe(0);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ── obtenerPrioridadComision ───────────────────────────────
  describe('obtenerPrioridadComision', () => {
    it('lanza NotFound si no hay perfilComision', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        perfilComision: null,
      } as any);
      await expect(service.obtenerPrioridadComision('u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('con periodoId usa findUnique', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        perfilComision: { id: 'c1' },
      } as any);
      prisma.configuracionPrioridadComision.findUnique.mockResolvedValue({
        id: 'cfg1',
      } as any);
      await service.obtenerPrioridadComision('u1', 'p1');
      expect(
        prisma.configuracionPrioridadComision.findUnique,
      ).toHaveBeenCalled();
    });

    it('sin periodoId usa findMany', async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        perfilComision: { id: 'c1' },
      } as any);
      prisma.configuracionPrioridadComision.findMany.mockResolvedValue([]);
      await service.obtenerPrioridadComision('u1');
      expect(prisma.configuracionPrioridadComision.findMany).toHaveBeenCalled();
    });
  });

  // ── findPerfilByUsuarioId ──────────────────────────────────
  describe('findPerfilByUsuarioId', () => {
    const userBase = {
      id: 'u1',
      email: 'a@b.c',
      rol: RolUsuario.SOLICITANTE,
      nombre: 'N',
      apellidos: 'A',
      carnetIdentidad: '123',
      telefono: '5',
      municipioRel: { nombre: 'Plaza' },
      provinciaRel: { nombre: 'La Habana' },
      notificaciones: [],
    };

    it('lanza NotFound si usuariosService.getProfile devuelve null', async () => {
      usuariosService.getProfile.mockResolvedValue(null);
      await expect(service.findPerfilByUsuarioId('u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    [
      ['perfilSolicitante', { perfilSolicitante: { id: 'ps1' } }],
      ['perfilFuncionario', { perfilFuncionario: { id: 'pf1' } }],
      ['perfilComision', { perfilComision: { id: 'pc1' } }],
      ['perfilDirector', { perfilDirector: { id: 'pd1' } }],
    ].forEach(([key, extra]) => {
      it(`mapea ${key}`, async () => {
        usuariosService.getProfile.mockResolvedValue({
          ...userBase,
          ...(extra as object),
        });
        const r = await service.findPerfilByUsuarioId('u1');
        expect(r).toBeTruthy();
        expect(r.usuario.municipio).toBe('Plaza');
      });
    });

    it('devuelve null si no hay perfil específico', async () => {
      usuariosService.getProfile.mockResolvedValue(userBase);
      await expect(service.findPerfilByUsuarioId('u1')).resolves.toBeNull();
    });
  });

  // ── findPerfilSolicitanteByUsuarioId ──────────────────────
  describe('findPerfilSolicitanteByUsuarioId', () => {
    it('devuelve el perfil con hijos y solicitudes', async () => {
      const perfil = {
        id: 'ps1',
        usuarioId: 'u1',
        hijos: [],
        solicitudes: [],
        usuario: { id: 'u1', notificaciones: [] },
      };
      prisma.perfilSolicitante.findUnique.mockResolvedValue(perfil as any);

      const r = await service.findPerfilSolicitanteByUsuarioId('u1');
      expect(r).toEqual(perfil);
    });

    it('lanza NotFound si no existe', async () => {
      prisma.perfilSolicitante.findUnique.mockResolvedValue(null);
      await expect(
        service.findPerfilSolicitanteByUsuarioId('u1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── findPerfilFuncionarioByUsuarioId ──────────────────────
  describe('findPerfilFuncionarioByUsuarioId', () => {
    it('devuelve el perfil con documentos y controles', async () => {
      const perfil = {
        id: 'pf1',
        usuarioId: 'u1',
        documentosVal: [],
        controles: [],
        usuario: { id: 'u1', notificaciones: [] },
      };
      prisma.perfilFuncionario.findUnique.mockResolvedValue(perfil as any);
      const r = await service.findPerfilFuncionarioByUsuarioId('u1');
      expect(r).toEqual(perfil);
    });

    it('lanza NotFound si no existe', async () => {
      prisma.perfilFuncionario.findUnique.mockResolvedValue(null);
      await expect(
        service.findPerfilFuncionarioByUsuarioId('u1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── findPerfilComisionByUsuarioId ─────────────────────────
  describe('findPerfilComisionByUsuarioId', () => {
    it('devuelve el perfil con decisiones', async () => {
      const perfil = {
        id: 'pc1',
        usuarioId: 'u1',
        decisiones: [],
        usuario: { id: 'u1', notificaciones: [] },
      };
      prisma.perfilComision.findUnique.mockResolvedValue(perfil as any);
      const r = await service.findPerfilComisionByUsuarioId('u1');
      expect(r).toEqual(perfil);
    });

    it('lanza NotFound si no existe', async () => {
      prisma.perfilComision.findUnique.mockResolvedValue(null);
      await expect(service.findPerfilComisionByUsuarioId('u1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── findPerfilDirectorByUsuarioId ─────────────────────────
  describe('findPerfilDirectorByUsuarioId', () => {
    it('devuelve el perfil con círculo', async () => {
      const perfil = {
        id: 'pd1',
        usuarioId: 'u1',
        circulo: { id: 'c1' },
        usuario: { id: 'u1', notificaciones: [] },
      };
      prisma.perfilDirector.findUnique.mockResolvedValue(perfil as any);
      const r = await service.findPerfilDirectorByUsuarioId('u1');
      expect(r).toEqual(perfil);
    });

    it('lanza NotFound si no existe', async () => {
      prisma.perfilDirector.findUnique.mockResolvedValue(null);
      await expect(service.findPerfilDirectorByUsuarioId('u1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── findPerfilDirectorByCirculoId ─────────────────────────
  describe('findPerfilDirectorByCirculoId', () => {
    it('devuelve el perfil del círculo', async () => {
      const perfil = {
        id: 'pd1',
        circuloId: 'c1',
        circulo: { id: 'c1' },
        usuario: { id: 'u1', notificaciones: [] },
      };
      prisma.perfilDirector.findUnique.mockResolvedValue(perfil as any);
      const r = await service.findPerfilDirectorByCirculoId('c1');
      expect(r).toEqual(perfil);
    });

    it('lanza NotFound si no hay director', async () => {
      prisma.perfilDirector.findUnique.mockResolvedValue(null);
      await expect(service.findPerfilDirectorByCirculoId('c1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── findPerfilDirectorByUsuarioId / ByCirculoId ──────────
  describe('findPerfilDirectorByUsuarioId / ByCirculoId', () => {
    it('byUsuarioId devuelve el perfil', async () => {
      const perfil = {
        id: 'pd1',
        usuarioId: 'u1',
        circulo: { id: 'c1' },
        usuario: { id: 'u1', notificaciones: [] },
      };
      prisma.perfilDirector.findUnique.mockResolvedValue(perfil as any);
      const r = await service.findPerfilDirectorByUsuarioId('u1');
      expect(r).toEqual(perfil);
    });

    it('byUsuarioId lanza NotFound', async () => {
      prisma.perfilDirector.findUnique.mockResolvedValue(null);
      await expect(service.findPerfilDirectorByUsuarioId('u1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('byCirculoId devuelve el perfil', async () => {
      const perfil = {
        id: 'pd1',
        circuloId: 'c1',
        circulo: { id: 'c1' },
        usuario: { id: 'u1', notificaciones: [] },
      };
      prisma.perfilDirector.findUnique.mockResolvedValue(perfil as any);
      const r = await service.findPerfilDirectorByCirculoId('c1');
      expect(r).toEqual(perfil);
    });

    it('byCirculoId lanza NotFound', async () => {
      prisma.perfilDirector.findUnique.mockResolvedValue(null);
      await expect(service.findPerfilDirectorByCirculoId('c1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── findPerfilSolicitanteByUsuarioId ─────────────────────
  it('findPerfilSolicitanteByUsuarioId lanza NotFound si no existe', async () => {
    prisma.perfilSolicitante.findUnique.mockResolvedValue(null);
    await expect(
      service.findPerfilSolicitanteByUsuarioId('u1'),
    ).rejects.toThrow(NotFoundException);
  });

  // ── findPerfilFuncionarioByUsuarioId ─────────────────────
  it('findPerfilFuncionarioByUsuarioId lanza NotFound si no existe', async () => {
    prisma.perfilFuncionario.findUnique.mockResolvedValue(null);
    await expect(
      service.findPerfilFuncionarioByUsuarioId('u1'),
    ).rejects.toThrow(NotFoundException);
  });

  // ── findPerfilComisionByUsuarioId ────────────────────────
  it('findPerfilComisionByUsuarioId lanza NotFound si no existe', async () => {
    prisma.perfilComision.findUnique.mockResolvedValue(null);
    await expect(service.findPerfilComisionByUsuarioId('u1')).rejects.toThrow(
      NotFoundException,
    );
  });
});
