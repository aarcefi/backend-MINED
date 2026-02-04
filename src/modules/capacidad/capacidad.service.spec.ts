import { Test, TestingModule } from '@nestjs/testing';
import { CapacidadCirculoService } from './capacidad.service';

describe('CapacidadService', () => {
  let service: CapacidadCirculoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CapacidadCirculoService],
    }).compile();

    service = module.get<CapacidadCirculoService>(CapacidadCirculoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
