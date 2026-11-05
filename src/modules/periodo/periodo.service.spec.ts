import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { PeriodoService } from './periodo.service';
import { PeriodoSchedulerService } from './periodo-scheduler.service';
import { aFecha } from './fechas';

const periodo = (extra: Record<string, unknown> = {}) => ({
  id: 'p1',
  nombre: 'Período 2026',
  fechaInicio: aFecha('2026-11-01'),
  fechaCierre: aFecha('2026-11-30'),
  fechaAsignacion: aFecha('2026-12-15'),
  activo: false,
  ...extra,
});

describe('PeriodoService', () => {
  let service: PeriodoService;
  const modelo = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn((a: { data: unknown }) => a.data),
    update: jest.fn((a: { data: unknown }) => a.data),
    updateMany: jest.fn(() => ({ count: 0 })),
    delete: jest.fn(),
  };
  const mockPrisma = {
    periodoOtorgamiento: modelo,
    $transaction: jest.fn((fn: unknown) =>
      typeof fn === 'function'
        ? (fn as (tx: unknown) => unknown)(mockPrisma)
        : Promise.all(fn as unknown[]),
    ),
  };

  beforeAll(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    // 5 de noviembre de 2026, hora local
    jest.setSystemTime(new Date(2026, 10, 5, 15, 0, 0));
  });
  afterAll(() => jest.useRealTimers());

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PeriodoService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(PeriodoService);
  });

  afterEach(() => jest.clearAllMocks());

  const dto = {
    nombre: '  Período 2027  ',
    fechaInicio: '2027-01-10',
    fechaCierre: '2027-02-10',
    fechaAsignacion: '2027-03-01',
  };

  describe('create', () => {
    it('rechaza un cierre que no sea posterior al inicio', async () => {
      await expect(
        service.create({ ...dto, fechaCierre: '2027-01-10' }),
      ).rejects.toThrow('La fecha de cierre debe ser posterior');
      expect(modelo.create).not.toHaveBeenCalled();
    });

    it('rechaza una asignación anterior o igual al cierre', async () => {
      await expect(
        service.create({ ...dto, fechaAsignacion: '2027-02-10' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rechaza fechas que se solapan con cualquier otro período', async () => {
      modelo.findFirst.mockResolvedValueOnce(periodo());
      await expect(service.create(dto)).rejects.toThrow(
        'Las fechas se solapan con el período "Período 2026" (01/11/2026 – 30/11/2026)',
      );
      // El solapamiento se busca entre todos los períodos, no solo los activos
      expect(modelo.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            fechaInicio: { lte: aFecha('2027-02-10') },
            fechaCierre: { gte: aFecha('2027-01-10') },
          },
        }),
      );
    });

    it('crea un período futuro inactivo y guarda las fechas como días UTC', async () => {
      modelo.findFirst.mockResolvedValueOnce(null);
      const creado = await service.create({
        ...dto,
        fechaInicio: '2027-01-10T00:00:00.000Z',
      });
      expect(creado).toEqual({
        nombre: 'Período 2027',
        fechaInicio: aFecha('2027-01-10'),
        fechaCierre: aFecha('2027-02-10'),
        fechaAsignacion: aFecha('2027-03-01'),
        activo: false,
      });
      expect(modelo.updateMany).not.toHaveBeenCalled();
    });

    it('ignora un "activo" enviado por el cliente', async () => {
      modelo.findFirst.mockResolvedValueOnce(null);
      const creado = await service.create({ ...dto, activo: true } as never);
      expect(creado).toMatchObject({ activo: false });
    });

    it('activa el período vigente hoy y desactiva los demás', async () => {
      modelo.findFirst.mockResolvedValueOnce(null);
      const creado = await service.create({
        ...dto,
        fechaInicio: '2026-11-01',
        fechaCierre: '2026-11-30',
        fechaAsignacion: '2026-12-15',
      });
      expect(creado).toMatchObject({ activo: true });
      expect(modelo.updateMany).toHaveBeenCalledWith({
        where: { activo: true },
        data: { activo: false },
      });
    });
  });

  describe('update', () => {
    it('lanza NotFound si el período no existe', async () => {
      modelo.findUnique.mockResolvedValueOnce(null);
      await expect(service.update('x', { nombre: 'Otro' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('valida el orden combinando las fechas nuevas con las guardadas', async () => {
      modelo.findUnique.mockResolvedValueOnce(periodo());
      await expect(
        service.update('p1', { fechaCierre: '2026-12-20' }),
      ).rejects.toThrow('La fecha de asignación debe ser posterior');
    });

    it('excluye al propio período al buscar solapamientos', async () => {
      modelo.findUnique.mockResolvedValueOnce(periodo());
      modelo.findFirst.mockResolvedValueOnce(null);
      await service.update('p1', { nombre: 'Renombrado' });
      expect(modelo.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { not: 'p1' } }),
        }),
      );
    });

    it('desactiva un período activo si las fechas nuevas ya no cubren hoy', async () => {
      modelo.findUnique.mockResolvedValueOnce(periodo({ activo: true }));
      modelo.findFirst.mockResolvedValueOnce(null);
      const actualizado = await service.update('p1', {
        fechaInicio: '2026-11-10',
      });
      expect(actualizado).toMatchObject({
        fechaInicio: aFecha('2026-11-10'),
        activo: false,
      });
    });
  });

  describe('toggleActivo', () => {
    it('exige un booleano', async () => {
      await expect(
        service.toggleActivo('p1', 'true' as unknown as boolean),
      ).rejects.toThrow(BadRequestException);
    });

    it('no activa un período que no está vigente hoy', async () => {
      modelo.findUnique.mockResolvedValueOnce(
        periodo({
          fechaInicio: aFecha('2027-01-10'),
          fechaCierre: aFecha('2027-02-10'),
        }),
      );
      await expect(service.toggleActivo('p1', true)).rejects.toThrow(
        'Solo se puede activar un período vigente',
      );
      expect(modelo.update).not.toHaveBeenCalled();
    });

    it('al activar desactiva los demás en una transacción', async () => {
      modelo.findUnique.mockResolvedValueOnce(periodo());
      await service.toggleActivo('p1', true);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(modelo.updateMany).toHaveBeenCalledWith({
        where: { id: { not: 'p1' }, activo: true },
        data: { activo: false },
      });
      expect(modelo.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { activo: true },
      });
    });

    it('permite desactivar sin tocar los demás', async () => {
      modelo.findUnique.mockResolvedValueOnce(periodo({ activo: true }));
      await service.toggleActivo('p1', false);
      expect(modelo.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const conConteo = (solicitudes: number, sesiones: number, activo = false) =>
      periodo({ activo, _count: { solicitudes, sesiones } });

    it('no elimina el período activo', async () => {
      modelo.findUnique.mockResolvedValueOnce(conConteo(0, 0, true));
      await expect(service.remove('p1')).rejects.toThrow(ConflictException);
    });

    it('no elimina un período con solicitudes o sesiones', async () => {
      modelo.findUnique.mockResolvedValueOnce(conConteo(3, 1));
      await expect(service.remove('p1')).rejects.toThrow(
        'tiene 3 solicitud(es) y 1 sesión(es) de la comisión asociadas',
      );
      expect(modelo.delete).not.toHaveBeenCalled();
    });

    it('elimina un período vacío y devuelve un mensaje', async () => {
      modelo.findUnique.mockResolvedValueOnce(conConteo(0, 0));
      await expect(service.remove('p1')).resolves.toEqual({
        message: 'Período "Período 2026" eliminado',
      });
      expect(modelo.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });

    it('lanza NotFound si no existe', async () => {
      modelo.findUnique.mockResolvedValueOnce(null);
      await expect(service.remove('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('PeriodoSchedulerService', () => {
    it('cierra los vencidos y activa el que empieza hoy', async () => {
      const scheduler = new PeriodoSchedulerService(mockPrisma as never);
      modelo.findFirst.mockResolvedValueOnce(
        periodo({ id: 'nuevo', fechaInicio: aFecha('2026-11-05') }),
      );
      await scheduler.actualizarPeriodosActivos();
      expect(modelo.updateMany).toHaveBeenNthCalledWith(1, {
        where: { activo: true, fechaCierre: { lt: aFecha('2026-11-05') } },
        data: { activo: false },
      });
      expect(modelo.findFirst).toHaveBeenCalledWith({
        where: { fechaInicio: aFecha('2026-11-05') },
      });
      expect(modelo.update).toHaveBeenCalledWith({
        where: { id: 'nuevo' },
        data: { activo: true },
      });
    });

    it('no reactiva un período desactivado a mano a mitad de su vigencia', async () => {
      const scheduler = new PeriodoSchedulerService(mockPrisma as never);
      modelo.findFirst.mockResolvedValueOnce(null);
      await scheduler.actualizarPeriodosActivos();
      expect(modelo.update).not.toHaveBeenCalled();
    });
  });
});
