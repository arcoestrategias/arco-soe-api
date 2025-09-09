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
import { GroupedUsersByUnitEntity } from 'src/users/entities/grouped-users-by-unit.entity';
import { hashPassword } from 'src/common/helpers/hash.helper';
import { PositionsRepository } from 'src/position/repositories/positions.repository';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly companiesRepository: CompaniesRepository,
    private readonly usersRepository: UsersRepository,
    private readonly positionsRepository: PositionsRepository,
  ) {}

  async create(dto: CreateCompanyDto, userId: string): Promise<CompanyEntity> {
    return this.companiesRepository.create(dto, userId);
  }

  async findAll(): Promise<CompanyEntity[]> {
    return this.companiesRepository.findAll();
  }

  async findById(id: string): Promise<CompanyEntity> {
    const company = await this.companiesRepository.findById(id);
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async update(
    id: string,
    dto: UpdateCompanyDto,
    userId: string,
  ): Promise<CompanyEntity> {
    const exists = await this.companiesRepository.findById(id);
    if (!exists) throw new NotFoundException('Company not found');
    return this.companiesRepository.update(id, dto, userId);
  }

  async remove(id: string, userId: string): Promise<void> {
    const exists = await this.companiesRepository.findById(id);
    if (!exists) throw new NotFoundException('Company not found');
    await this.companiesRepository.remove(id, userId);
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

  async createWithStructure(
    dto: CreateCompanyDto,
    userAdminId: string,
  ): Promise<CompanyEntity> {
    const { name, ide, legalRepresentativeName, description, address, phone } =
      dto;
    const email = `${ide}@empresa.com`;
    const password = await hashPassword('Temporal123');

    const prisma = this.usersRepository['prisma']; // acceso al prisma desde el repositorio

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Crear empresa
        const company = await tx.company.create({
          data: {
            name,
            ide,
            legalRepresentativeName,
            description,
            address,
            phone,
            createdBy: userAdminId,
            updatedBy: userAdminId,
          },
        });

        // 2. Crear usuario base
        const user = await tx.user.create({
          data: {
            email,
            ide: ide,
            password,
            firstName: `CEO - ${company.name}`,
            lastName: company.name,
            isActive: true,
          },
        });

        // 3. Registrar en UserCompany como Manager
        await tx.userCompany.create({
          data: {
            userId: user.id,
            companyId: company.id,
            isManager: true,
          },
        });

        // 4. Crear unidad principal
        const businessUnit = await tx.businessUnit.create({
          data: {
            name: company.name,
            isMain: true,
            companyId: company.id,
            createdBy: userAdminId,
            updatedBy: userAdminId,
          },
        });

        // 5. Crear posición CEO usando el repositorio directamente con tx
        const position = await this.positionsRepository.createWithTransaction(
          {
            name: 'CEO',
            isCeo: true,
            businessUnitId: businessUnit.id,
          },
          userAdminId,
          tx,
        );

        // 6. Obtener rol Manager
        const managerRole = await tx.role.findFirstOrThrow({
          where: { name: 'Manager' },
        });

        // 7. Registrar en UserBusinessUnit
        await tx.userBusinessUnit.create({
          data: {
            userId: user.id,
            businessUnitId: businessUnit.id,
            roleId: managerRole.id,
            positionId: position.id,
            isResponsible: true,
          },
        });

        // 8. Copiar permisos del rol Manager al usuario
        const rolePermissions = await tx.rolePermission.findMany({
          where: { roleId: managerRole.id },
        });

        if (rolePermissions.length) {
          await tx.userPermission.createMany({
            data: rolePermissions.map((perm) => ({
              userId: user.id,
              businessUnitId: businessUnit.id,
              permissionId: perm.permissionId,
              createdBy: userAdminId,
              updatedBy: userAdminId,
            })),
          });
        }

        return new CompanyEntity(company);
      });
    } catch (error) {
      console.error('[CREATE_WITH_STRUCTURE ERROR]', error);
      throw new InternalServerErrorException(
        'Error al crear la estructura de la empresa',
      );
    }
  }
}
