import { Test, TestingModule } from '@nestjs/testing';
import { SesionService } from './sesion.service';

describe('SesionService', () => {
  let service: SesionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SesionService],
    }).compile();

    service = module.get<SesionService>(SesionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
