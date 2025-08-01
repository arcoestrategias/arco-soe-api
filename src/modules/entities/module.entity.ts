export class ModuleEntity {
  readonly id: string;
  readonly name: string;
  readonly shortCode: string;
  readonly description?: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(module: any) {
    this.id = module.id;
    this.name = module.name;
    this.shortCode = module.name;
    this.description = module.description ?? null;
    this.createdAt = module.createdAt;
    this.updatedAt = module.updatedAt;
  }
}
