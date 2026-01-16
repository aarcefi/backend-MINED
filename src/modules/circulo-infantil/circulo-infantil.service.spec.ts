import { Test, TestingModule } from '@nestjs/testing';
import { CirculoInfantilService } from './circulo-infantil.service';

describe('CirculoInfantilService', () => {
  let service: CirculoInfantilService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CirculoInfantilService],
    }).compile();

    service = module.get<CirculoInfantilService>(CirculoInfantilService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
