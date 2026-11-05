import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { CapacidadCirculoService } from './capacidad.service';

describe('CapacidadCirculoService', () => {
  let service: CapacidadCirculoService;
  const mockPrisma = {
    capacidadCirculo: {
      findUnique: jest.fn(),
      update: jest.fn((a: { data: unknown }) => a.data),
      delete: jest.fn(),
    },
  };
  const cap = mockPrisma.capacidadCirculo;
  const existente = {
    id: 'k1',
    circuloId: 'c1',
    anioVida: 'ANIO_3',
    capacidadTotal: 20,
    sobrecapacidad: 24,
    cuposDisponibles: 12,
    cuposOcupados: 8,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CapacidadCirculoService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(CapacidadCirculoService);
  });

  afterEach(() => jest.clearAllMocks());

  it('al cambiar la capacidad recalcula sobrecapacidad y cupos libres', async () => {
    cap.findUnique.mockResolvedValueOnce(existente);
    await expect(service.update('k1', { capacidadTotal: 30 })).resolves.toEqual(
      { capacidadTotal: 30, sobrecapacidad: 36, cuposDisponibles: 22 },
    );
  });

  it('no deja la capacidad por debajo de los matriculados', async () => {
    cap.findUnique.mockResolvedValueOnce(existente);
    await expect(service.update('k1', { capacidadTotal: 5 })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('no elimina una capacidad con niños matriculados', async () => {
    cap.findUnique.mockResolvedValueOnce(existente);
    await expect(service.remove('k1')).rejects.toThrow(ConflictException);
    expect(cap.delete).not.toHaveBeenCalled();
  });

  it('elimina una capacidad vacía', async () => {
    cap.findUnique.mockResolvedValueOnce({ ...existente, cuposOcupados: 0 });
    await service.remove('k1');
    expect(cap.delete).toHaveBeenCalledWith({ where: { id: 'k1' } });
  });
});
