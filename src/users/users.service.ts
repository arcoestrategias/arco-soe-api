import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto';
import { UsersRepository } from './repositories/users.repository';
import { UserEntity } from './entities/user.entity';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';
import { hashPassword } from 'src/common/helpers/hash.helper';
import { CompaniesRepository } from 'src/companies/repositories/companies.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly companiesRepository: CompaniesRepository,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    try {
      const hashedPassword = await hashPassword(createUserDto.password);
      createUserDto.password = hashedPassword;

      return await this.usersRepository.create(createUserDto);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findAll(userId: string): Promise<UserEntity[]> {
    try {
      const currentUser = await this.usersRepository.findById(userId);

      if (!currentUser) {
        throw new ForbiddenException('Usuario no encontrado');
      }

      if (currentUser.isPlatformAdmin) {
        return this.usersRepository.findAll();
      }

      const companies =
        await this.companiesRepository.findCompaniesWhereUserIsManager(
          currentUser.id,
        );

      if (!companies.length) {
        throw new ForbiddenException(
          'No tienes permisos para acceder a esta información',
        );
      }

      const companyIds = companies.map((c) => c.id);

      return this.usersRepository.findByCompanyIds(companyIds);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findOne(id: string): Promise<UserEntity> {
    try {
      const user = await this.usersRepository.findById(id);

      if (!user) {
        throw new NotFoundException(`User with ID: ${id} not found`);
      }

      return user;
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    try {
      await this.findOne(id);

      return await this.usersRepository.update(id, updateUserDto);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async remove(id: string) {
    try {
      await this.findOne(id);

      return await this.usersRepository.remove(id);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findUnitsForUser(
    userId: string,
  ): Promise<{ id: string; name: string }[]> {
    try {
      const units = await this.usersRepository.findUnitsForUser(userId);
      return units;
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }
}
