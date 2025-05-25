import { Controller, Headers, Post, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModulesService } from '../modules/modules.service';
import { PermissionsService } from '../permissions/permissions.service';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';
import { WinstonLoggerService } from 'src/core/services/winston-logger.service';

import {
  moduleDefinitions,
  actions,
  rolePermissionRules,
  seedUsers,
} from './data/seed-data';

@Controller('dev/seed')
export class DevController {
  constructor(
    private readonly modulesService: ModulesService,
    private readonly permissionsService: PermissionsService,
    private readonly rolesService: RolesService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly logger: WinstonLoggerService,
  ) {}

  @Post('initial')
  async seedInitial(@Headers('x-seed-token') token: string) {
    const expected = this.configService.get<string>('SEED_TOKEN');
    if (!token || token !== expected) {
      this.logger.warn(
        `Token de semilla inválido recibido: ${token}`,
        DevController.name,
      );
      throw new ForbiddenException('Token inválido');
    }

    this.logger.log('Iniciando semilla del sistema base', DevController.name);

    const modulesCreated: string[] = [];
    const modulesSkipped: string[] = [];
    const permissionReport: Record<
      string,
      { created: string[]; skipped: string[] }
    > = {};
    const permissionsToInsert: { name: string; moduleId: string }[] = [];

    const allModules = await this.modulesService.findAll();

    for (const def of moduleDefinitions) {
      let module = allModules.find((m) => m.name === def.name);

      if (!module) {
        module = await this.modulesService.create({ name: def.name });
        modulesCreated.push(def.name);
        this.logger.log(`Módulo creado: ${def.name}`, DevController.name);
      } else {
        modulesSkipped.push(def.name);
      }

      const created: string[] = [];
      const skipped: string[] = [];

      for (const action of actions) {
        const permissionName = `${def.permissionPrefix}.${action}`;
        const exists = await this.permissionsService
          .findAll()
          .then((perms) =>
            perms.find(
              (p) => p.name === permissionName && p.moduleId === module.id,
            ),
          );

        if (exists) {
          skipped.push(permissionName);
        } else {
          permissionsToInsert.push({
            name: permissionName,
            moduleId: module.id,
          });
          created.push(permissionName);
        }
      }

      permissionReport[def.name] = { created, skipped };
    }

    if (permissionsToInsert.length > 0) {
      await this.permissionsService.bulkInsert(permissionsToInsert);
      this.logger.log(
        `Permisos insertados: ${permissionsToInsert.length}`,
        DevController.name,
      );
    }

    const allPermissions = await this.permissionsService.findAll();

    const roleNames = Object.keys(rolePermissionRules);
    const rolesCreated: string[] = [];
    const rolesSkipped: string[] = [];

    const allRoles = await this.rolesService.findAll();

    for (const name of roleNames) {
      const exists = allRoles.find((r) => r.name === name);
      if (exists) {
        rolesSkipped.push(name);
        continue;
      }
      await this.rolesService.create({ name });
      rolesCreated.push(name);
      this.logger.log(`Rol creado: ${name}`, DevController.name);
    }

    const allRolesMap = await this.rolesService.findAll();
    const roleAssignments: Record<string, string[]> = {};

    for (const roleName of roleNames) {
      const role = allRolesMap.find((r) => r.name === roleName);
      if (!role) continue;

      const allowedActions = rolePermissionRules[roleName];

      const filteredPerms = allPermissions.filter((p) => {
        const action = p.name.split('.')[1];
        return allowedActions.includes(action);
      });

      const permissionIds = filteredPerms.map((p) => p.id);
      await this.rolesService.assignPermissions({
        roleId: role.id,
        permissionIds,
      });
      roleAssignments[roleName] = filteredPerms.map((p) => p.name);
      this.logger.log(
        `Permisos asignados al rol ${roleName}: ${permissionIds.length}`,
        DevController.name,
      );
    }

    const usersCreated: string[] = [];
    const usersSkipped: string[] = [];

    const allUsers = await this.usersService.findAll();
    const definedRoles = Object.keys(rolePermissionRules);

    const invalidUsers = seedUsers.filter(
      (u) => !definedRoles.includes(u.role),
    );
    if (invalidUsers.length > 0) {
      const msg = `Seed fallido: roles no definidos para usuarios: ${invalidUsers.map((u) => u.role).join(', ')}`;
      this.logger.error(msg, DevController.name);
      throw new Error(msg);
    }

    for (const user of seedUsers) {
      const exists = allUsers.find((u) => u.email === user.email);
      if (exists) {
        usersSkipped.push(user.email);
        continue;
      }

      const role = allRolesMap.find((r) => r.name === user.role);
      if (!role) continue;

      await this.usersService.create({
        email: user.email,
        password: user.password,
        roleId: role.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        ide: user.ide,
      });

      usersCreated.push(user.email);
      this.logger.log(`Usuario creado: ${user.email}`, DevController.name);
    }

    this.logger.log('Seed completado correctamente', DevController.name);

    return {
      modules: { created: modulesCreated, skipped: modulesSkipped },
      permissions: permissionReport,
      roles: {
        created: rolesCreated,
        skipped: rolesSkipped,
        permissionsAssigned: roleAssignments,
      },
      users: { created: usersCreated, skipped: usersSkipped },
    };
  }
}
