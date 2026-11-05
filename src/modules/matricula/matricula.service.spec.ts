import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { EstadoMatricula, RolUsuario } from '@prisma/client';
import { MatriculasService } from './matricula.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { EventDispatcher } from 'src/common/events/event-dispatcher.service';

describe('MatriculasService', () => {
  let service: MatriculasService;

  const mockPrisma = {
    matricula: { findUnique: jest.fn(), update: jest.fn() },
    capacidadCirculo: { findUnique: jest.fn(), update: jest.fn() },
    perfilDirector: { findUnique: jest.fn() },
    notificacion: { create: jest.fn().mockResolvedValue({}) },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  };

  const director = { id: 'director-id', rol: RolUsuario.DIRECTOR_CIRCULO };

  const matricula = (estado: EstadoMatricula) => ({
    id: 'matricula-id',
    folio: 'MAT-1',
    estado,
    circuloId: 'circulo-id',
    fechaLimite: new Date('2099-01-01'),
    circulo: { nombre: 'Círculo', municipio: 'Plaza' },
    solicitud: {
      anioSolicitado: 'ANIO_3',
      solicitante: { usuario: { id: 'familia-id' } },
    },
  });

  const capacidad = (disponibles: number) => ({
    id: 'capacidad-id',
    cuposDisponibles: disponibles,
    cuposOcupados: 5,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MatriculasService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventDispatcher, useValue: { dispatch: jest.fn() } },
      ],
    }).compile();

    service = module.get(MatriculasService);
    mockPrisma.perfilDirector.findUnique.mockResolvedValue({
      circuloId: 'circulo-id',
    });
    mockPrisma.matricula.update.mockImplementation(({ data }) => data);
    mockPrisma.capacidadCirculo.update.mockResolvedValue({});
  });

  afterEach(() => jest.clearAllMocks());

  describe('cambiarEstado', () => {
    it('should cancel an active matricula and free its place', async () => {
      mockPrisma.matricula.findUnique.mockResolvedValueOnce(
        matricula(EstadoMatricula.ACTIVA),
      );
      mockPrisma.capacidadCirculo.findUnique.mockResolvedValueOnce(
        capacidad(0),
      );

      const result = await service.cambiarEstado(
        'matricula-id',
        EstadoMatricula.CANCELADA,
        director,
      );

      expect(result).toEqual({ estado: EstadoMatricula.CANCELADA });
      expect(mockPrisma.capacidadCirculo.update).toHaveBeenCalledWith({
        where: { id: 'capacidad-id' },
        data: {
          cuposOcupados: { decrement: 1 },
          cuposDisponibles: { increment: 1 },
        },
      });
      expect(mockPrisma.notificacion.create).toHaveBeenCalled();
    });

    it('should reactivate a cancelled matricula and take a place', async () => {
      mockPrisma.matricula.findUnique.mockResolvedValueOnce(
        matricula(EstadoMatricula.CANCELADA),
      );
      mockPrisma.capacidadCirculo.findUnique.mockResolvedValueOnce(
        capacidad(2),
      );

      await service.cambiarEstado(
        'matricula-id',
        EstadoMatricula.ACTIVA,
        director,
      );

      expect(mockPrisma.capacidadCirculo.update).toHaveBeenCalledWith({
        where: { id: 'capacidad-id' },
        data: {
          cuposOcupados: { increment: 1 },
          cuposDisponibles: { decrement: 1 },
        },
      });
    });

    it('should not reactivate without free places', async () => {
      mockPrisma.matricula.findUnique.mockResolvedValueOnce(
        matricula(EstadoMatricula.CANCELADA),
      );
      mockPrisma.capacidadCirculo.findUnique.mockResolvedValueOnce(
        capacidad(0),
      );

      await expect(
        service.cambiarEstado('matricula-id', EstadoMatricula.ACTIVA, director),
      ).rejects.toThrow(ConflictException);
      expect(mockPrisma.matricula.update).not.toHaveBeenCalled();
    });

    it('should reject a matricula waiting for activation', async () => {
      mockPrisma.matricula.findUnique.mockResolvedValueOnce(
        matricula(EstadoMatricula.ESPERANDO_ACTIVACION),
      );

      await expect(
        service.cambiarEstado(
          'matricula-id',
          EstadoMatricula.CANCELADA,
          director,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject states other than ACTIVA and CANCELADA', async () => {
      await expect(
        service.cambiarEstado(
          'matricula-id',
          EstadoMatricula.VENCIDA,
          director,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should forbid a director from another circulo', async () => {
      mockPrisma.matricula.findUnique.mockResolvedValueOnce(
        matricula(EstadoMatricula.ACTIVA),
      );
      mockPrisma.perfilDirector.findUnique.mockResolvedValueOnce({
        circuloId: 'otro-circulo',
      });

      await expect(
        service.cambiarEstado(
          'matricula-id',
          EstadoMatricula.CANCELADA,
          director,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
