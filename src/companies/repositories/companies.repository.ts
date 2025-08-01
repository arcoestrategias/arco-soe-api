import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';
import { CreateCompanyDto, UpdateCompanyDto } from '../dto';
import { CompanyEntity } from '../entities/company.entity';

@Injectable()
export class CompaniesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCompanyDto, userId: string): Promise<CompanyEntity> {
    try {
      const company = await this.prisma.company.create({
        data: {
          ...data,
          createdBy: userId,
          updatedBy: userId,
        },
      });
      return new CompanyEntity(company);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findAll(): Promise<CompanyEntity[]> {
    const companies = await this.prisma.company.findMany({
      where: { isActive: true },
    });
    return companies.map((c) => new CompanyEntity(c));
  }

  async findById(id: string): Promise<CompanyEntity | null> {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });
    return company ? new CompanyEntity(company) : null;
  }

  async update(
    id: string,
    data: UpdateCompanyDto,
    userId: string,
  ): Promise<CompanyEntity> {
    try {
      const company = await this.prisma.company.update({
        where: { id },
        data: {
          ...data,
          updatedBy: userId,
        },
      });
      return new CompanyEntity(company);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async remove(id: string, userId: string): Promise<void> {
    try {
      await this.prisma.company.update({
        where: { id },
        data: {
          isActive: false,
          updatedBy: userId,
        },
      });
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }
}
