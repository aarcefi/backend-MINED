import { Test, TestingModule } from '@nestjs/testing';
import { PeriodoOtorgamientoController } from './periodo.controller';
import { PeriodoService } from './periodo.service';

describe('PeriodoOtorgamientoController', () => {
  let controller: PeriodoOtorgamientoController;
  const service = { findAll: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PeriodoOtorgamientoController],
      providers: [{ provide: PeriodoService, useValue: service }],
    }).compile();

    controller = module.get(PeriodoOtorgamientoController);
  });

  it.each([
    ['true', true],
    ['false', false],
    [undefined, undefined],
  ])('convierte el query activo=%s en %s', (texto, valor) => {
    void controller.findAll(texto);
    expect(service.findAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ activo: valor }),
    );
  });
});
