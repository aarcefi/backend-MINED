import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SolicitudService } from './solicitud.service';

describe('SolicitudService: decisiones', () => {
  const comision = {
    id: 'u-1',
    rol: 'COMISION_OTORGAMIENTO',
    municipio: 'Plaza de la Revolución',
  };
  const preferido = { id: 'circulo-1', nombre: 'Preferido', activo: true };
  const elegido = { id: 'circulo-2', nombre: 'Elegido', activo: true };

  const solicitudBase = {
    id: 'solicitud-1',
    estado: 'APROBADA_DIRECCION',
    solicitanteId: 'perfil-1',
    circuloId: preferido.id,
    circulo: preferido,
    nino: { id: 'nino-1', nombre: 'Ana', apellidos: 'Pérez' },
    periodo: { id: 'periodo-1' },
    solicitante: {
      id: 'perfil-1',
      usuario: {
        id: 'u-2',
        nombre: 'Luisa',
        apellidos: 'Pérez',
        municipio: 'Plaza',
      },
    },
  };

  let prisma: any;
  let service: SolicitudService;

  beforeEach(() => {
    prisma = {
      solicitud: {
        findUnique: jest.fn().mockResolvedValue(solicitudBase),
        update: jest.fn().mockResolvedValue(solicitudBase),
        delete: jest.fn().mockResolvedValue(solicitudBase),
      },
      circuloInfantil: { findUnique: jest.fn().mockResolvedValue(elegido) },
      matricula: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'matricula-1' }),
        count: jest.fn().mockResolvedValue(0),
      },
      decisionSolicitud: { count: jest.fn().mockResolvedValue(0) },
      perfilDirector: { findUnique: jest.fn().mockResolvedValue(null) },
    };

    service = new SolicitudService(
      prisma,
      {} as any,
      {} as any,
      { crearTrazabilidadAutomatica: jest.fn() } as any,
      {} as any,
      {} as any,
      { dispatch: jest.fn() } as any,
      {} as any,
    );
  });

  it('otorga la plaza en el círculo elegido por la comisión', async () => {
    await service.cambiarEstado(
      'solicitud-1',
      'APROBADA_COMISION',
      comision,
      undefined,
      elegido.id,
    );

    expect(prisma.matricula.create.mock.calls[0][0].data.circuloId).toBe(
      elegido.id,
    );
    expect(prisma.solicitud.update).toHaveBeenCalledWith({
      where: { id: 'solicitud-1' },
      data: { circuloId: elegido.id },
    });
  });

  it('usa el círculo preferido si la comisión no elige otro', async () => {
    await service.cambiarEstado('solicitud-1', 'APROBADA_COMISION', comision);

    expect(prisma.matricula.create.mock.calls[0][0].data.circuloId).toBe(
      preferido.id,
    );
  });

  it('rechaza un círculo inactivo', async () => {
    prisma.circuloInfantil.findUnique.mockResolvedValue({
      ...elegido,
      activo: false,
    });

    await expect(
      service.cambiarEstado(
        'solicitud-1',
        'APROBADA_COMISION',
        comision,
        undefined,
        elegido.id,
      ),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.matricula.create).not.toHaveBeenCalled();
  });

  it.each(['COMISION_OTORGAMIENTO', 'FUNCIONARIO_MUNICIPAL'])(
    'impide a %s decidir sobre otro municipio',
    async (rol) => {
      await expect(
        service.cambiarEstado('solicitud-1', 'RECHAZADA_COMISION', {
          id: 'u-9',
          rol,
          municipio: 'Cárdenas',
        }),
      ).rejects.toThrow(ForbiddenException);
    },
  );

  it('solo la comisión puede fijar la prioridad', async () => {
    await service.update('solicitud-1', { prioridad: 80 }, comision);
    expect(prisma.solicitud.update.mock.calls[0][0].data.prioridad).toBe(80);

    prisma.solicitud.update.mockClear();
    await service.update(
      'solicitud-1',
      { prioridad: 5 },
      { id: 'u-3', rol: 'FUNCIONARIO_MUNICIPAL', municipio: 'Plaza' },
    );
    expect(prisma.solicitud.update).not.toHaveBeenCalled();
  });

  it('avisa a la comisión del municipio cuando Dirección aprueba', async () => {
    prisma.usuario = {
      findMany: jest.fn().mockResolvedValue([
        { id: 'c-1', municipio: 'Plaza de la Revolución' },
        { id: 'c-2', municipio: 'Cárdenas' },
      ]),
    };
    prisma.notificacion = { createMany: jest.fn() };

    await service.cambiarEstado('solicitud-1', 'APROBADA_DIRECCION', {
      id: 'u-3',
      rol: 'FUNCIONARIO_MUNICIPAL',
      municipio: 'Plaza',
    });

    const { data } = prisma.notificacion.createMany.mock.calls[0][0];
    expect(data.map((n: any) => n.usuarioId)).toEqual(['c-1']);
  });

  describe('retirar', () => {
    const solicitante = { rol: 'SOLICITANTE', perfilId: 'perfil-1' };
    let directorio: string;

    beforeEach(async () => {
      directorio = await mkdtemp(join(tmpdir(), 'documentos-'));
      process.env.UPLOADS_DIR = directorio;
    });

    afterEach(async () => {
      delete process.env.UPLOADS_DIR;
      await rm(directorio, { recursive: true, force: true });
    });

    it('borra la solicitud en revisión y sus archivos', async () => {
      await writeFile(join(directorio, 'a.pdf'), 'x');
      prisma.solicitud.findUnique.mockResolvedValue({
        ...solicitudBase,
        estado: 'EN_REVISION',
        documentos: [{ archivoUrl: 'a.pdf' }],
      });

      await service.remove('solicitud-1', solicitante);

      expect(prisma.solicitud.delete).toHaveBeenCalled();
      expect(await readdir(directorio)).toEqual([]);
    });

    it('no deja retirar una solicitud ya revisada', async () => {
      prisma.solicitud.findUnique.mockResolvedValue({
        ...solicitudBase,
        documentos: [],
      });

      await expect(service.remove('solicitud-1', solicitante)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.solicitud.delete).not.toHaveBeenCalled();
    });
  });
});
