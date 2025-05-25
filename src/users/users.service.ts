import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto, UpdateUserDto } from './dto';
import { UsersRepository } from './repositories/users.repository';
import { UserEntity } from './entities/user.entity';
import { handleDatabaseErrors } from 'src/common/helpers/database-error.helper';
import { hashPassword } from 'src/common/helpers/hash.helper';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    try {
      const hashedPassword = await hashPassword(createUserDto.password);
      createUserDto.password = hashedPassword;

      return await this.usersRepository.create(createUserDto);
    } catch (error) {
      handleDatabaseErrors(error);
    }
  }

  async findAll(): Promise<UserEntity[]> {
    try {
      return await this.usersRepository.findAll();
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
}
