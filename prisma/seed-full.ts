import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../src/common/helpers/hash.helper';

const prisma = new PrismaClient();

async function main() {
  const companiesData = [
    { name: 'Empresa Uno', ide: '1234567890001' },
    { name: 'Empresa Dos', ide: '1234567890002' },
  ];

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
    { name: 'positions', shortCode: 'position' },
    { name: 'strategic-plans', shortCode: 'strategicPlan' },
    { name: 'strategic-values', shortCode: 'strategicValue' },
    { name: 'strategic-success-factors', shortCode: 'strategicSuccessFactor' },
    { name: 'objectives', shortCode: 'objective' },
    { name: 'indicators', shortCode: 'indicator' },
    { name: 'objectives-goals', shortCode: 'objectiveGoal' },
    { name: 'objectives-participants', shortCode: 'objectiveParticipant' },
    { name: 'strategic-projects', shortCode: 'strategicProject' },
    { name: 'project-participants', shortCode: 'projectParticipant' },
    { name: 'project-factors', shortCode: 'projectFactor' },
    { name: 'project-tasks', shortCode: 'projectTask' },
    { name: 'priorities', shortCode: 'priority' },
    { name: 'performance', shortCode: 'performance' },
  ];

  const roleMatrix = {
    Admin: [1, 1, 1, 1, 1, 1, 1, 1],
    Manager: [1, 1, 1, 1, 1, 1, 1, 0],
    Specialist: [1, 1, 1, 1, 0, 0, 0, 0],
    Client: [1, 1, 0, 0, 0, 0, 0, 0],
  };

  const adminId = uuidv4();
  await prisma.user.create({
    data: {
      id: adminId,
      email: 'admin@example.com',
      password: await hashPassword('Admin123'),
      firstName: 'Admin',
      lastName: 'Seed',
      username: 'admin',
      ide: '0951828455',
      isPlatformAdmin: true,
    },
  });

  const rolesMap: Record<string, string> = {};
  for (const role of Object.keys(roleMatrix)) {
    const r = await prisma.role.create({
      data: {
        id: uuidv4(),
        name: role,
        createdBy: adminId,
        updatedBy: adminId,
      },
    });
    rolesMap[role] = r.id;
  }

  let ideIndex = 0;

  for (const [index, companyData] of companiesData.entries()) {
    const companyId = uuidv4();
    const unit1Id = uuidv4();
    const unit2Id = uuidv4();

    const managerId = uuidv4();
    const specialist1Id = uuidv4();
    const client1Id = uuidv4();
    const specialist2Id = uuidv4();
    const client2Id = uuidv4();

    await prisma.user.createMany({
      data: [
        {
          id: managerId,
          email: `manager${index + 1}@example.com`,
          password: await hashPassword('Manager123'),
          firstName: `Manager${index + 1}`,
          lastName: 'Seed',
          username: `manager${index + 1}`,
          ide: `100000000${ideIndex++}`,
        },
        {
          id: specialist1Id,
          email: `specialist${index + 1}a@example.com`,
          password: await hashPassword('Special123'),
          firstName: `Specialist${index + 1}A`,
          lastName: 'Seed',
          username: `specialist${index + 1}a`,
          ide: `100000000${ideIndex++}`,
        },
        {
          id: client1Id,
          email: `client${index + 1}a@example.com`,
          password: await hashPassword('Client123'),
          firstName: `Client${index + 1}A`,
          lastName: 'Seed',
          username: `client${index + 1}a`,
          ide: `100000000${ideIndex++}`,
        },
        {
          id: specialist2Id,
          email: `specialist${index + 1}b@example.com`,
          password: await hashPassword('Special123'),
          firstName: `Specialist${index + 1}B`,
          lastName: 'Seed',
          username: `specialist${index + 1}b`,
          ide: `100000000${ideIndex++}`,
        },
        {
          id: client2Id,
          email: `client${index + 1}b@example.com`,
          password: await hashPassword('Client123'),
          firstName: `Client${index + 1}B`,
          lastName: 'Seed',
          username: `client${index + 1}b`,
          ide: `100000000${ideIndex++}`,
        },
      ],
    });

    await prisma.company.create({
      data: {
        id: companyId,
        name: companyData.name,
        ide: companyData.ide,
        createdBy: adminId,
        updatedBy: adminId,
        userCompanies: {
          create: {
            userId: managerId,
            isManager: true,
          },
        },
      },
    });

    await prisma.businessUnit.createMany({
      data: [
        {
          id: unit1Id,
          name: 'Unidad Norte',
          companyId,
          createdBy: adminId,
          updatedBy: adminId,
        },
        {
          id: unit2Id,
          name: 'Unidad Sur',
          companyId,
          createdBy: adminId,
          updatedBy: adminId,
        },
      ],
    });

    const userUnitAssignments = [
      {
        userId: specialist1Id,
        unitId: unit1Id,
        roleName: 'Specialist',
        isResponsible: true,
      },
      { userId: client1Id, unitId: unit1Id, roleName: 'Client' },
      {
        userId: specialist2Id,
        unitId: unit2Id,
        roleName: 'Specialist',
        isResponsible: true,
      },
      { userId: client2Id, unitId: unit2Id, roleName: 'Client' },
    ];

    for (const {
      userId,
      unitId,
      roleName,
      isResponsible,
    } of userUnitAssignments) {
      await prisma.userBusinessUnit.create({
        data: {
          userId,
          businessUnitId: unitId,
          roleId: rolesMap[roleName],
          isResponsible: isResponsible || false,
          createdBy: userId,
          updatedBy: userId,
        },
      });
    }
  }

  for (const mod of modules) {
    const module = await prisma.module.create({
      data: {
        name: mod.name,
        shortCode: mod.shortCode,
        createdBy: adminId,
        updatedBy: adminId,
      },
    });

    for (const [i, action] of actions.entries()) {
      const permission = await prisma.permission.create({
        data: {
          name: `${mod.shortCode}.${action}`,
          moduleId: module.id,
          createdBy: adminId,
          updatedBy: adminId,
        },
      });

      for (const [roleName, flags] of Object.entries(roleMatrix)) {
        if (flags[i] === 1) {
          await prisma.rolePermission.create({
            data: {
              roleId: rolesMap[roleName],
              permissionId: permission.id,
              createdBy: adminId,
              updatedBy: adminId,
            },
          });
        }
      }
    }
  }

  for (const user of await prisma.user.findMany()) {
    const userUnit = await prisma.userBusinessUnit.findFirst({
      where: { userId: user.id },
    });

    const roleId = userUnit?.roleId;
    if (!roleId || !userUnit) continue;

    const permissions = await prisma.rolePermission.findMany({
      where: { roleId },
      select: { permissionId: true },
    });

    for (const { permissionId } of permissions) {
      await prisma.userPermission.create({
        data: {
          userId: user.id,
          businessUnitId: userUnit.businessUnitId,
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
