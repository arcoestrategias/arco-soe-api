import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../src/common/helpers/hash.helper';

const prisma = new PrismaClient();

async function main() {
  // 1. Crear usuarios iniciales con roles asignados por nombre (no por ID directa)
  const users = [
    {
      id: '5174d6dc-1db8-41d5-9927-a22fc2ae4882',
      email: 'admin@example.com',
      password: await hashPassword('Admin123'),
      firstName: 'Admin',
      lastName: 'Seed',
      username: 'admin',
      ide: '0951828455',
      roleName: 'Admin',
    },
    {
      id: '38936606-cc74-4b29-9514-c9064513757a',
      email: 'manager@example.com',
      password: await hashPassword('Manager123'),
      firstName: 'Manager',
      lastName: 'Seed',
      username: 'manager',
      ide: '0951828456',
      roleName: 'Manager',
    },
    {
      id: 'dd94d864-7cd1-4150-9aa5-0295d9e17c8d',
      email: 'specialist@example.com',
      password: await hashPassword('Special123'),
      firstName: 'Specialist',
      lastName: 'Seed',
      username: 'specialist',
      ide: '0951828457',
      roleName: 'Specialist',
    },
    {
      id: '5ec71ea5-4c22-455b-ba0a-fffc02f889c0',
      email: 'client@example.com',
      password: await hashPassword('Client123'),
      firstName: 'Client',
      lastName: 'Seed',
      username: 'client',
      ide: '0951828458',
      roleName: 'Client',
    },
  ];

  // Se insertan los usuarios ignorando el campo `roleName` (que es auxiliar)

  await prisma.user.createMany({
    data: users.map(({ roleName, ...rest }) => rest),
  });

  // 2. Crear una empresa y su unidad de negocio principal
  const companyId = 'b0d89747-92a1-4a5a-a735-c3b4bbf96d2d';
  const businessUnitId = '36dee978-fde9-4c21-b58d-76577e803755';

  await prisma.company.create({
    data: {
      id: companyId,
      name: 'Empresa Demo',
      createdBy: users[0].id,
      updatedBy: users[0].id,
    },
  });

  await prisma.businessUnit.create({
    data: {
      id: businessUnitId,
      name: 'Unidad Central',
      description: 'Unidad de negocio principal',
      ide: '1234567890001',
      legalRepresentativeName: 'Representante Legal',
      address: 'Dirección demo',
      phone: '0999999999',
      order: 1,
      isPrivate: false,
      isGroup: false,
      isActive: true,
      companyId,
      createdBy: users[0].id,
      updatedBy: users[0].id,
    },
  });

  // 3. Definición de roles y su matriz de permisos (1 = tiene permiso, 0 = no)
  const roleMatrix = {
    Admin: [1, 1, 1, 1, 1, 1, 1, 1],
    Manager: [1, 1, 1, 1, 1, 1, 1, 0],
    Specialist: [1, 1, 1, 1, 0, 0, 0, 0],
    Client: [1, 1, 0, 0, 0, 0, 0, 0],
    Viewer: [1, 1, 0, 0, 0, 0, 0, 0],
    Operator: [1, 1, 1, 1, 1, 0, 0, 0],
  };

  // Guardamos los IDs de cada rol para referencia
  const rolesMap: Record<string, string> = {};
  for (const role of Object.keys(roleMatrix)) {
    const created = await prisma.role.create({
      data: {
        id: uuidv4(),
        name: role,
        createdBy: users[0].id,
        updatedBy: users[0].id,
      },
    });
    rolesMap[role] = created.id;
  }

  // 4. Asociar cada usuario a la unidad de negocio con su rol
  for (const user of users) {
    await prisma.userBusinessUnit.create({
      data: {
        userId: user.id,
        businessUnitId,
        roleId: rolesMap[user.roleName],
        createdBy: user.id,
        updatedBy: user.id,
      },
    });
  }

  // 5. Definimos las acciones y módulos del sistema
  const actions = [
    'access',
    'read',
    'create',
    'update',
    'delete',
    'export',
    'approve',
    'assign',
  ];
  const modules = [
    { name: 'users', shortCode: 'user' },
    { name: 'roles', shortCode: 'role' },
    { name: 'permissions', shortCode: 'permission' },
    { name: 'modules', shortCode: 'module' },
    { name: 'companies', shortCode: 'company' },
    { name: 'business-units', shortCode: 'businessUnit' },
  ];

  // 6. Crear módulos y sus permisos
  for (const mod of modules) {
    const createdModule = await prisma.module.create({
      data: {
        name: mod.name,
        shortCode: mod.shortCode,
        createdBy: users[0].id,
        updatedBy: users[0].id,
      },
    });

    for (const [i, action] of actions.entries()) {
      const permission = await prisma.permission.create({
        data: {
          name: `${mod.shortCode}.${action}`,
          moduleId: createdModule.id,
          createdBy: users[0].id,
          updatedBy: users[0].id,
        },
      });

      // Relacionar el permiso con los roles que tienen acceso según la matriz
      for (const [roleName, flags] of Object.entries(roleMatrix)) {
        if (flags[i] === 1) {
          await prisma.rolePermission.create({
            data: {
              roleId: rolesMap[roleName],
              permissionId: permission.id,
              createdBy: users[0].id,
              updatedBy: users[0].id,
            },
          });
        }
      }
    }
  }

  // 7. Asignar los permisos de cada rol directamente a los usuarios
  for (const user of users) {
    const roleId = rolesMap[user.roleName];
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { roleId },
      select: { permissionId: true },
    });

    for (const { permissionId } of rolePermissions) {
      await prisma.userPermission.create({
        data: {
          userId: user.id,
          businessUnitId,
          permissionId,
          isAllowed: true,
          createdBy: user.id,
          updatedBy: user.id,
        },
      });
    }
  }

  console.log('✅ Seed ejecutada correctamente');
}

main().finally(() => prisma.$disconnect());
