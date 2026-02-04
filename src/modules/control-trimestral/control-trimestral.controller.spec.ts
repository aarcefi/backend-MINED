import { Test, TestingModule } from '@nestjs/testing';
import { ControlTrimestralController } from './control-trimestral.controller';
import { ControlTrimestralService } from './control-trimestral.service';

describe('ControlTrimestralController', () => {
  let controller: ControlTrimestralController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ControlTrimestralController],
      providers: [ControlTrimestralService],
    }).compile();

    controller = module.get<ControlTrimestralController>(ControlTrimestralController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
