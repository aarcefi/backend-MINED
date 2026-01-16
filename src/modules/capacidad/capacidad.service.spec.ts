import { Test, TestingModule } from '@nestjs/testing';
import { CapacidadService } from './capacidad.service';

describe('CapacidadService', () => {
  let service: CapacidadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CapacidadService],
    }).compile();

    service = module.get<CapacidadService>(CapacidadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
