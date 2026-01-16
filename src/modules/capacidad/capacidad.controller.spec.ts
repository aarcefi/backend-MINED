import { Test, TestingModule } from '@nestjs/testing';
import { CapacidadController } from './capacidad.controller';
import { CapacidadService } from './capacidad.service';

describe('CapacidadController', () => {
  let controller: CapacidadController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CapacidadController],
      providers: [CapacidadService],
    }).compile();

    controller = module.get<CapacidadController>(CapacidadController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
