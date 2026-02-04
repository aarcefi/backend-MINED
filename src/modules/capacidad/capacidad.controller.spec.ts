import { Test, TestingModule } from '@nestjs/testing';
import { CapacidadCirculoController } from './capacidad.controller';
import { CapacidadCirculoService } from './capacidad.service';

describe('CapacidadCirculoController', () => {
  let controller: CapacidadCirculoController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CapacidadCirculoController],
      providers: [CapacidadCirculoService],
    }).compile();

    controller = module.get<CapacidadCirculoController>(
      CapacidadCirculoController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
