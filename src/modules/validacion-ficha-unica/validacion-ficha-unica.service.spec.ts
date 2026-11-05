import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { ValidacionIdentidadService } from './validacion-ficha-unica.service';

describe('ValidacionIdentidadService', () => {
  let service: ValidacionIdentidadService;
  const mockPrisma = { ciudadano: { findUnique: jest.fn() } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidacionIdentidadService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(ValidacionIdentidadService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('obtenerNombre', () => {
    it('should return only nombre and apellidos', async () => {
      mockPrisma.ciudadano.findUnique.mockResolvedValueOnce({
        nombre: 'Ana',
        apellidos: 'Pérez',
      });
      await expect(service.obtenerNombre('21051012345')).resolves.toEqual({
        nombre: 'Ana',
        apellidos: 'Pérez',
      });
      expect(mockPrisma.ciudadano.findUnique).toHaveBeenCalledWith({
        where: { carnetIdentidad: '21051012345' },
        select: { nombre: true, apellidos: true },
      });
    });

    it('should throw NotFoundException if carnet is not registered', async () => {
      mockPrisma.ciudadano.findUnique.mockResolvedValueOnce(null);
      await expect(service.obtenerNombre('21051012345')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
