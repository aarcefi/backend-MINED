import { Test, TestingModule } from '@nestjs/testing';
import { ControlTrimestralService } from './control-trimestral.service';

describe('ControlTrimestralService', () => {
  let service: ControlTrimestralService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ControlTrimestralService],
    }).compile();

    service = module.get<ControlTrimestralService>(ControlTrimestralService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
