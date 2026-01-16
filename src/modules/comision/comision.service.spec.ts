import { Test, TestingModule } from '@nestjs/testing';
import { ComisionService } from './comision.service';

describe('ComisionService', () => {
  let service: ComisionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComisionService],
    }).compile();

    service = module.get<ComisionService>(ComisionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
