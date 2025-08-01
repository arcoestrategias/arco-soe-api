import { Injectable, NotFoundException } from '@nestjs/common';
import { CompaniesRepository } from './repositories/companies.repository';
import { CreateCompanyDto, UpdateCompanyDto } from './dto';
import { CompanyEntity } from './entities/company.entity';

@Injectable()
export class CompaniesService {
  constructor(private readonly companiesRepo: CompaniesRepository) {}

  async create(dto: CreateCompanyDto, userId: string): Promise<CompanyEntity> {
    return this.companiesRepo.create(dto, userId);
  }

  async findAll(): Promise<CompanyEntity[]> {
    return this.companiesRepo.findAll();
  }

  async findById(id: string): Promise<CompanyEntity> {
    const company = await this.companiesRepo.findById(id);
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async update(
    id: string,
    dto: UpdateCompanyDto,
    userId: string,
  ): Promise<CompanyEntity> {
    const exists = await this.companiesRepo.findById(id);
    if (!exists) throw new NotFoundException('Company not found');
    return this.companiesRepo.update(id, dto, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const exists = await this.companiesRepo.findById(id);
    if (!exists) throw new NotFoundException('Company not found');
    await this.companiesRepo.remove(id, userId);
  }
}
