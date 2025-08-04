import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CompaniesRepository } from './repositories/companies.repository';
import { CreateCompanyDto, UpdateCompanyDto } from './dto';
import { CompanyEntity } from './entities/company.entity';
import { UsersRepository } from 'src/users/repositories/users.repository';
import { UserEntity } from 'src/users/entities/user.entity';
import { ResponseGroupedUsersByUnitDto } from 'src/users/dto';
import { GroupedUsersByUnitEntity } from 'src/users/entities/grouped-users-by-unit.entity';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly companiesRepo: CompaniesRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

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

  async findUsersByCompany(companyId: string): Promise<UserEntity[]> {
    return this.usersRepository.findByCompanyIds([companyId]);
  }

  async findUsersGroupedByBusinessUnit(
    companyId: string,
  ): Promise<GroupedUsersByUnitEntity[]> {
    const assignments =
      await this.usersRepository.findUsersGroupedByBusinessUnit(companyId);

    const grouped: Record<string, GroupedUsersByUnitEntity> = {};

    for (const assignment of assignments) {
      if (!assignment.role) {
        throw new InternalServerErrorException(
          `El usuario ${assignment.user.email} no tiene un rol asignado en la unidad ${assignment.businessUnit.name}`,
        );
      }

      const unitId = assignment.businessUnit.id;
      const roleId = assignment.role.id;

      if (!grouped[unitId]) {
        grouped[unitId] = {
          businessUnitId: unitId,
          businessUnitName: assignment.businessUnit.name,
          roles: [],
        };
      }

      const unit = grouped[unitId];

      let roleGroup = unit.roles.find((r) => r.roleId === roleId);
      if (!roleGroup) {
        roleGroup = {
          roleId,
          roleName: assignment.role.name,
          users: [],
        };
        unit.roles.push(roleGroup);
      }

      roleGroup.users.push({
        id: assignment.user.id,
        email: assignment.user.email,
        firstName: assignment.user.firstName,
        lastName: assignment.user.lastName,
        positionId: assignment.position?.id || null,
        positionName: assignment.position?.name || null,
      });
    }

    return Object.values(grouped);
  }
}
