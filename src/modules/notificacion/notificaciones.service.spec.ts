/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { createPrismaMock, PrismaMock } from '../../../test/prisma-mock';

describe('NotificacionesService', () => {
  let service: NotificacionesService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module = await Test.createTestingModule({
      providers: [
        NotificacionesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(NotificacionesService);
  });

  describe('create', () => {
    it('delega a prisma.notificacion.create', async () => {
      const dto = { usuarioId: 'u1', titulo: 't', mensaje: 'm', tipo: 'x' };
      prisma.notificacion.create.mockResolvedValue({ id: 'n1' } as any);
      const r = await service.create(dto as any);
      expect(r).toEqual({ id: 'n1' });
      expect(prisma.notificacion.create).toHaveBeenCalledWith({
        data: dto,
        include: { usuario: true },
      });
    });
  });

  describe('createForUsuario', () => {
    it('crea con leida=false', async () => {
      prisma.notificacion.create.mockResolvedValue({ id: 'n1' } as any);
      await service.createForUsuario('u1', 'T', 'M', 'SISTEMA');
      expect(prisma.notificacion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ usuarioId: 'u1', leida: false }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('sin filtros no construye where', async () => {
      prisma.notificacion.findMany.mockResolvedValue([]);
      await service.findAll();
      expect(prisma.notificacion.findMany).toHaveBeenCalled();
      const arg = prisma.notificacion.findMany.mock.calls[0][0]!;
      expect(arg.where).toEqual({});
    });

    it('con todos los filtros', async () => {
      prisma.notificacion.findMany.mockResolvedValue([]);
      const fIni = new Date('2026-01-01');
      const fFin = new Date('2026-12-31');
      await service.findAll({
        usuarioId: 'u1',
        tipo: 'SISTEMA',
        leida: false,
        fechaInicio: fIni,
        fechaFin: fFin,
      });
      const arg = prisma.notificacion.findMany.mock.calls[0][0]!;
      expect(arg.where).toEqual({
        usuarioId: 'u1',
        tipo: 'SISTEMA',
        leida: false,
        fecha: { gte: fIni, lte: fFin },
      });
    });

    it('con solo fechaInicio', async () => {
      prisma.notificacion.findMany.mockResolvedValue([]);
      await service.findAll({ fechaInicio: new Date('2026-01-01') });
      const arg = prisma.notificacion.findMany.mock.calls[0][0]!;
      expect(arg.where.fecha).toHaveProperty('gte');
      expect(arg.where.fecha).not.toHaveProperty('lte');
    });

    it('con solo fechaFin', async () => {
      prisma.notificacion.findMany.mockResolvedValue([]);
      await service.findAll({ fechaFin: new Date('2026-12-31') });
      const arg = prisma.notificacion.findMany.mock.calls[0][0]!;
      expect(arg.where.fecha).toHaveProperty('lte');
      expect(arg.where.fecha).not.toHaveProperty('gte');
    });
  });

  it('findAllByUsuario consulta por usuarioId', async () => {
    prisma.notificacion.findMany.mockResolvedValue([]);
    await service.findAllByUsuario('u1');
    const arg = prisma.notificacion.findMany.mock.calls[0][0]!;
    expect(arg.where).toEqual({ usuarioId: 'u1' });
  });

  it('findUnreadByUsuario filtra leida=false', async () => {
    prisma.notificacion.findMany.mockResolvedValue([]);
    await service.findUnreadByUsuario('u1');
    const arg = prisma.notificacion.findMany.mock.calls[0][0]!;
    expect(arg.where).toEqual({ usuarioId: 'u1', leida: false });
  });

  describe('findOne', () => {
    it('devuelve si existe', async () => {
      prisma.notificacion.findUnique.mockResolvedValue({ id: 'n1' } as any);
      await expect(service.findOne('n1')).resolves.toEqual({ id: 'n1' });
    });

    it('lanza NotFound si no existe', async () => {
      prisma.notificacion.findUnique.mockResolvedValue(null);
      await expect(service.findOne('n1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAsRead', () => {
    it('ok', async () => {
      prisma.notificacion.update.mockResolvedValue({ id: 'n1' } as any);
      await expect(service.markAsRead('n1', 'u1')).resolves.toEqual({
        id: 'n1',
      });
    });

    it('lanza NotFound si falla la actualización', async () => {
      prisma.notificacion.update.mockRejectedValue(new Error('boom'));
      await expect(service.markAsRead('n1', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  it('markAllAsRead usa updateMany con where usuarioId + leida:false', async () => {
    prisma.notificacion.updateMany.mockResolvedValue({ count: 3 } as any);
    const r = await service.markAllAsRead('u1');
    expect(r).toEqual({ count: 3 });
    const arg = prisma.notificacion.updateMany.mock.calls[0][0];
    expect(arg.where).toEqual({ usuarioId: 'u1', leida: false });
  });

  describe('remove', () => {
    it('ok', async () => {
      prisma.notificacion.delete.mockResolvedValue({} as any);
      await expect(service.remove('n1')).resolves.toEqual({
        message: 'Notificación con ID n1 eliminada exitosamente',
      });
    });

    it('lanza NotFound si falla el delete', async () => {
      prisma.notificacion.delete.mockRejectedValue(new Error('boom'));
      await expect(service.remove('n1')).rejects.toThrow(NotFoundException);
    });
  });

  it('removeAllByUsuario usa deleteMany', async () => {
    prisma.notificacion.deleteMany.mockResolvedValue({ count: 2 } as any);
    await service.removeAllByUsuario('u1');
    expect(prisma.notificacion.deleteMany).toHaveBeenCalledWith({
      where: { usuarioId: 'u1' },
    });
  });

  describe('getNotificationStats', () => {
    it('cuando no hay notificaciones no divide por cero', async () => {
      prisma.notificacion.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);
      const r = await service.getNotificationStats('u1');
      expect(r).toEqual({ total: 0, unread: 0, read: 0 });
    });

    it('con total > 0', async () => {
      prisma.notificacion.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(4);
      const r = await service.getNotificationStats('u1');
      expect(r).toEqual({ total: 10, unread: 4, read: 6 });
    });
  });

  describe('getEstadisticasGenerales', () => {
    it('agrega por tipo y calcula %', async () => {
      prisma.notificacion.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(7) // leidas
        .mockResolvedValueOnce(3) // noLeidas
        .mockResolvedValueOnce(5); // ultimaSemana
      prisma.notificacion.groupBy.mockResolvedValue([
        { tipo: 'SISTEMA', _count: { _all: 4 } },
        { tipo: 'MATRICULA', _count: { _all: 6 } },
      ] as any);

      const r = await service.getEstadisticasGenerales();
      expect(r.total).toBe(10);
      expect(r.leidas).toBe(7);
      expect(r.noLeidas).toBe(3);
      expect(r.porcentajeLeidas).toBe(70);
      expect(r.porTipo).toEqual([
        { tipo: 'SISTEMA', cantidad: 4 },
        { tipo: 'MATRICULA', cantidad: 6 },
      ]);
      expect(r.ultimaSemana).toBe(5);
    });

    it('con total 0 no rompe', async () => {
      prisma.notificacion.count.mockResolvedValue(0);
      prisma.notificacion.groupBy.mockResolvedValue([] as any);
      const r = await service.getEstadisticasGenerales();
      expect(r.porcentajeLeidas).toBe(0);
    });
  });

  it('createNotificacionSolicitudCambioEstado construye mensaje con estados', async () => {
    prisma.notificacion.create.mockResolvedValue({} as any);
    await service.createNotificacionSolicitudCambioEstado(
      'u1',
      's1',
      'EN_REVISION',
      'APROBADA_COMISION',
    );
    expect(prisma.notificacion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          usuarioId: 'u1',
          tipo: 'estado_solicitud',
        }),
      }),
    );
  });

  [
    { validado: true, esperado: 'validado' },
    { validado: false, esperado: 'rechazado' },
  ].forEach(({ validado, esperado }) => {
    it(`createNotificacionDocumentoValidado(${validado}) usa "${esperado}"`, async () => {
      prisma.notificacion.create.mockResolvedValue({} as any);
      await service.createNotificacionDocumentoValidado('u1', 'd1', validado);
      const arg = prisma.notificacion.create.mock.calls[0][0] as any;
      expect(arg.data.mensaje).toContain(esperado);
      expect(arg.data.tipo).toBe('documento');
    });
  });

  it('createNotificacionRecordatorioControl formatea fecha', async () => {
    prisma.notificacion.create.mockResolvedValue({} as any);
    await service.createNotificacionRecordatorioControl(
      'u1',
      'm1',
      new Date('2026-06-15'),
    );
    const arg = prisma.notificacion.create.mock.calls[0][0] as any;
    expect(arg.data.tipo).toBe('recordatorio');
    expect(arg.data.mensaje).toMatch(/matrícula #m1/i);
  });
});
