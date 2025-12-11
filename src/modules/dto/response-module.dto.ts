import { ModuleEntity } from '../entities/module.entity';

export class ResponseModuleDto {
  id: string;
  name: string;
  shortCode: string;
  description: string | null;

  constructor(module: ModuleEntity) {
    this.id = module.id;
    this.name = module.name;
    this.shortCode = module.shortCode;
    this.description = module.description;
  }
}
