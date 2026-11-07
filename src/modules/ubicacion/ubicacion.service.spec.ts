import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { UbicacionService } from './ubicacion.service';

describe('UbicacionService', () => {
  let service: UbicacionService;
  const mockPrisma = {
    provincia: { findMany: jest.fn(), findUnique: jest.fn() },
    municipio: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UbicacionService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(UbicacionService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should list provincias by name', async () => {
    mockPrisma.provincia.findMany.mockResolvedValueOnce([
      { id: 'p1', nombre: 'Artemisa' },
    ]);
    await expect(service.findProvincias()).resolves.toHaveLength(1);
    expect(mockPrisma.provincia.findMany).toHaveBeenCalledWith({
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
  });

  it('should list the municipios of a provincia', async () => {
    mockPrisma.provincia.findUnique.mockResolvedValueOnce({ id: 'p1' });
    mockPrisma.municipio.findMany.mockResolvedValueOnce([
      { id: 'm1', nombre: 'Bauta' },
    ]);
    await expect(service.findMunicipios('p1')).resolves.toEqual([
      { id: 'm1', nombre: 'Bauta' },
    ]);
    expect(mockPrisma.municipio.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { provinciaId: 'p1' } }),
    );
  });

  it('should throw NotFoundException for an unknown provincia', async () => {
    mockPrisma.provincia.findUnique.mockResolvedValueOnce(null);
    await expect(service.findMunicipios('x')).rejects.toThrow(
      NotFoundException,
    );
  });
});
