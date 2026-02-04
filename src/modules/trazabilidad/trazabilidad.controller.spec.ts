import { Test, TestingModule } from '@nestjs/testing';
import { TrazabilidadController } from './trazabilidad.controller';
import { TrazabilidadService } from './trazabilidad.service';

describe('TrazabilidadController', () => {
  let controller: TrazabilidadController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrazabilidadController],
      providers: [TrazabilidadService],
    }).compile();

    controller = module.get<TrazabilidadController>(TrazabilidadController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
