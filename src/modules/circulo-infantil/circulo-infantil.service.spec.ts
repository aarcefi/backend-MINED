import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AnioVida } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CirculoInfantilService } from './circulo-infantil.service';

const circulo = (extra: Record<string, unknown> = {}) => ({
  id: 'c1',
  nombre: 'Los Girasoles',
  capacidadTotal: 100,
  tieneSextoAnio: false,
  activo: true,
  ...extra,
});

const capacidad = (
  anioVida: AnioVida,
  capacidadTotal: number,
  cuposOcupados = 0,
) => ({
  id: `cap-${anioVida}`,
  circuloId: 'c1',
  anioVida,
  capacidadTotal,
  sobrecapacidad: Math.ceil(capacidadTotal * 1.2),
  cuposDisponibles: capacidadTotal - cuposOcupados,
  cuposOcupados,
});

describe('CirculoInfantilService', () => {
  let service: CirculoInfantilService;
  const mockPrisma = {
    circuloInfantil: {
      findUnique: jest.fn(),
      create: jest.fn((a: { data: object }) => ({ id: 'c1', ...a.data })),
      update: jest.fn((a: { data: unknown }) => a.data),
      delete: jest.fn(),
    },
    capacidadCirculo: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    municipio: {
      findFirst: jest.fn().mockResolvedValue({ id: 'm1', provinciaId: 'p1' }),
    },
    $transaction: jest.fn((arg: unknown) =>
      typeof arg === 'function'
        ? (arg as (tx: unknown) => unknown)(mockPrisma)
        : Promise.all(arg as unknown[]),
    ),
  };
  const cap = mockPrisma.capacidadCirculo;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CirculoInfantilService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(CirculoInfantilService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('remove', () => {
    const conConteo = (
      conteo: Partial<Record<string, number>>,
      director: object | null = null,
    ) =>
      circulo({
        director,
        _count: {
          matriculas: 0,
          solicitudes: 0,
          trasladosOrigen: 0,
          trasladosDestino: 0,
          ...conteo,
        },
      });

    it('lanza NotFound si el círculo no existe', async () => {
      mockPrisma.circuloInfantil.findUnique.mockResolvedValueOnce(null);
      await expect(service.remove('x')).rejects.toThrow(NotFoundException);
    });

    it('bloquea el borrado si tiene matrículas, aunque no estén activas', async () => {
      mockPrisma.circuloInfantil.findUnique.mockResolvedValueOnce(
        conConteo({ matriculas: 2 }),
      );
      await expect(service.remove('c1')).rejects.toThrow(ConflictException);
      expect(mockPrisma.circuloInfantil.delete).not.toHaveBeenCalled();
    });

    it('explica todos los motivos y propone desactivarlo', async () => {
      mockPrisma.circuloInfantil.findUnique.mockResolvedValueOnce(
        conConteo(
          { matriculas: 2, solicitudes: 1, trasladosDestino: 1 },
          { id: 'd1' },
        ),
      );
      await expect(service.remove('c1')).rejects.toThrow(
        'No se puede eliminar "Los Girasoles" porque tiene 2 matrícula(s), ' +
          '1 solicitud(es), 1 traslado(s) y un director asignado. Desactívelo',
      );
    });

    it('borra un círculo sin historia junto con sus capacidades', async () => {
      mockPrisma.circuloInfantil.findUnique.mockResolvedValueOnce(
        conConteo({}),
      );
      await expect(service.remove('c1')).resolves.toEqual({
        message: 'Círculo "Los Girasoles" eliminado',
      });
      expect(cap.deleteMany).toHaveBeenCalledWith({
        where: { circuloId: 'c1' },
      });
      expect(mockPrisma.circuloInfantil.delete).toHaveBeenCalledWith({
        where: { id: 'c1' },
      });
    });
  });

  describe('update', () => {
    it('lanza NotFound si el círculo no existe', async () => {
      mockPrisma.circuloInfantil.findUnique.mockResolvedValueOnce(null);
      await expect(service.update('x', { nombre: 'A' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('guarda solo los campos del círculo y normaliza el teléfono vacío', async () => {
      mockPrisma.circuloInfantil.findUnique.mockResolvedValueOnce(circulo());
      cap.findMany.mockResolvedValueOnce([]);
      await service.update('c1', {
        nombre: ' Nuevo ',
        telefono: '  ',
        intruso: 'x',
      } as never);
      expect(mockPrisma.circuloInfantil.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { nombre: 'Nuevo', telefono: null },
        }),
      );
    });

    it('crea, actualiza y quita capacidades por año', async () => {
      mockPrisma.circuloInfantil.findUnique.mockResolvedValueOnce(circulo());
      cap.findMany.mockResolvedValueOnce([
        capacidad(AnioVida.ANIO_2, 20, 5),
        capacidad(AnioVida.ANIO_3, 20),
      ]);
      await service.update('c1', {
        capacidades: [
          { anioVida: AnioVida.ANIO_2, capacidadTotal: 25 },
          { anioVida: AnioVida.ANIO_3, capacidadTotal: 0 },
          { anioVida: AnioVida.ANIO_4, capacidadTotal: 30 },
        ],
      });
      expect(cap.update).toHaveBeenCalledWith({
        where: { id: 'cap-ANIO_2' },
        data: { capacidadTotal: 25, sobrecapacidad: 30, cuposDisponibles: 20 },
      });
      expect(cap.delete).toHaveBeenCalledWith({ where: { id: 'cap-ANIO_3' } });
      expect(cap.create).toHaveBeenCalledWith({
        data: {
          circuloId: 'c1',
          anioVida: AnioVida.ANIO_4,
          capacidadTotal: 30,
          sobrecapacidad: 36,
          cuposDisponibles: 30,
          cuposOcupados: 0,
        },
      });
    });

    it('no deja bajar la capacidad de un año por debajo de los matriculados', async () => {
      mockPrisma.circuloInfantil.findUnique.mockResolvedValueOnce(circulo());
      cap.findMany.mockResolvedValueOnce([capacidad(AnioVida.ANIO_3, 20, 12)]);
      await expect(
        service.update('c1', {
          capacidades: [{ anioVida: AnioVida.ANIO_3, capacidadTotal: 10 }],
        }),
      ).rejects.toThrow(
        'El 3er año de vida tiene 12 niño(s) matriculado(s); su capacidad no puede ser menor que 12',
      );
      expect(mockPrisma.circuloInfantil.update).not.toHaveBeenCalled();
    });

    it('no deja que la suma por año supere la capacidad total', async () => {
      mockPrisma.circuloInfantil.findUnique.mockResolvedValueOnce(circulo());
      cap.findMany.mockResolvedValueOnce([]);
      await expect(
        service.update('c1', {
          capacidadTotal: 40,
          capacidades: [
            { anioVida: AnioVida.ANIO_2, capacidadTotal: 25 },
            { anioVida: AnioVida.ANIO_3, capacidadTotal: 25 },
          ],
        }),
      ).rejects.toThrow(
        'La suma de las capacidades por año (50) supera la capacidad total del círculo (40)',
      );
    });

    it('rechaza 6to año si el círculo no lo ofrece', async () => {
      mockPrisma.circuloInfantil.findUnique.mockResolvedValueOnce(circulo());
      cap.findMany.mockResolvedValueOnce([]);
      await expect(
        service.update('c1', {
          capacidades: [{ anioVida: AnioVida.ANIO_6, capacidadTotal: 10 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('quitar el sexto año borra su capacidad vacía', async () => {
      mockPrisma.circuloInfantil.findUnique.mockResolvedValueOnce(
        circulo({ tieneSextoAnio: true }),
      );
      cap.findMany.mockResolvedValueOnce([capacidad(AnioVida.ANIO_6, 10)]);
      await service.update('c1', { tieneSextoAnio: false });
      expect(cap.delete).toHaveBeenCalledWith({ where: { id: 'cap-ANIO_6' } });
    });

    it('no quita el sexto año si tiene niños matriculados', async () => {
      mockPrisma.circuloInfantil.findUnique.mockResolvedValueOnce(
        circulo({ tieneSextoAnio: true }),
      );
      cap.findMany.mockResolvedValueOnce([capacidad(AnioVida.ANIO_6, 10, 3)]);
      await expect(
        service.update('c1', { tieneSextoAnio: false }),
      ).rejects.toThrow('El 6to año de vida tiene 3 niño(s) matriculado(s)');
    });

    it('editar sin tocar capacidades no exige que cuadren datos antiguos', async () => {
      mockPrisma.circuloInfantil.findUnique.mockResolvedValueOnce(
        circulo({ capacidadTotal: 10 }),
      );
      cap.findMany.mockResolvedValueOnce([capacidad(AnioVida.ANIO_2, 30)]);
      await expect(
        service.update('c1', { telefono: '7-832-1234' }),
      ).resolves.toBeDefined();
    });
  });

  describe('toggleActivo', () => {
    it('exige un booleano', async () => {
      await expect(
        service.toggleActivo('c1', undefined as unknown as boolean),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findActivos', () => {
    it('devuelve provincia y municipio como texto', async () => {
      Object.assign(mockPrisma.circuloInfantil, {
        findMany: jest.fn().mockResolvedValueOnce([
          {
            id: 'c1',
            nombre: 'Círculo',
            municipioRel: { nombre: 'Plaza de la Revolución' },
            provinciaRel: { nombre: 'La Habana' },
          },
        ]),
      });
      const [circulo] = await service.findActivos();
      expect(circulo).toMatchObject({
        municipio: 'Plaza de la Revolución',
        provincia: 'La Habana',
      });
      expect(circulo).not.toHaveProperty('municipioRel');
    });
  });

  describe('create', () => {
    it('crea el círculo y sus capacidades en una transacción', async () => {
      await service.create({
        nombre: 'Nuevo',
        direccion: 'Calle 1',
        municipio: 'Plaza',
        provincia: 'La Habana',
        capacidadTotal: 50,
        tipo: 'NORMAL' as never,
        activo: true,
        tieneSextoAnio: false,
        capacidades: [{ anioVida: AnioVida.ANIO_2, capacidadTotal: 20 }],
      });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      // La ubicación se guarda con los ids de las tablas, no como texto
      expect(mockPrisma.circuloInfantil.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            municipioId: 'm1',
            provinciaId: 'p1',
          }),
        }),
      );
      expect(
        mockPrisma.circuloInfantil.create.mock.calls[0][0].data,
      ).not.toHaveProperty('municipio');
      expect(cap.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          circuloId: 'c1',
          anioVida: AnioVida.ANIO_2,
          capacidadTotal: 20,
        }),
      });
    });
  });
});
