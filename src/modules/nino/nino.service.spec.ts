import { Test, TestingModule } from '@nestjs/testing';
import { NinoService } from './nino.service';

describe('NinoService', () => {
  let service: NinoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NinoService],
    }).compile();

    service = module.get<NinoService>(NinoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
