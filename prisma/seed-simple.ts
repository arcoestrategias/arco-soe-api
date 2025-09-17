import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../src/common/helpers/hash.helper';

const prisma = new PrismaClient();

async function main() {
  // Acciones estándar que se combinan con cada módulo
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

  // Módulos de la plataforma (necesarios para generar permisos)
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
    { name: 'levers', shortCode: 'lever' },
    { name: 'task-participants', shortCode: 'taskParticipant' },
    { name: 'resumes', shortCode: 'resume' },
    { name: 'companies-management', shortCode: 'compnayManagement' },
    { name: 'business-units-management', shortCode: 'businessUnitManagement' },
    { name: 'users-management', shortCode: 'userManagement' },
    { name: 'positions-management', shortCode: 'positionManagement' },
    {
      name: 'strategic-plans-management',
      shortCode: 'strategicPlanManagement',
    },
  ];

  // Matriz de permisos por rol (en el orden de actions[])
  const roleMatrix: Record<string, number[]> = {
    Admin: [1, 1, 1, 1, 1, 1, 1, 1],
    Manager: [1, 1, 1, 1, 1, 1, 1, 1],
    Specialist: [1, 1, 1, 1, 1, 1, 1, 1],
    Client: [1, 1, 1, 1, 0, 0, 0, 0],
  };

  // 1) Admin (upsert por email)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@arcoestrategias.com' },
    update: {},
    create: {
      id: uuidv4(),
      email: 'admin@arcoestrategias.com',
      password: await hashPassword('Admin123'),
      firstName: 'Admin',
      lastName: 'Seed',
      username: 'admin',
      ide: '0951828455',
      isPlatformAdmin: true,
    },
  });
  const adminId = admin.id;

  // 2) Roles (upsert por name)
  const rolesMap: Record<string, string> = {};
  for (const roleName of Object.keys(roleMatrix)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { updatedBy: adminId },
      create: {
        id: uuidv4(),
        name: roleName,
        createdBy: adminId,
        updatedBy: adminId,
      },
    });
    rolesMap[roleName] = role.id;
  }

  // 3) Módulos, permisos y asignaciones rol→permiso
  for (const mod of modules) {
    // módulo (upsert por name; si tu esquema tiene unique en shortCode, cambia el where)
    const moduleRecord = await prisma.module.upsert({
      where: { name: mod.name },
      update: { updatedBy: adminId },
      create: {
        name: mod.name,
        shortCode: mod.shortCode,
        createdBy: adminId,
        updatedBy: adminId,
      },
    });

    // permisos del módulo (p.ej. user.read, user.create, etc.)
    for (const [i, action] of actions.entries()) {
      const permName = `${mod.shortCode}.${action}`;

      const permission = await prisma.permission.upsert({
        where: { name: permName },
        update: { updatedBy: adminId },
        create: {
          name: permName,
          moduleId: moduleRecord.id,
          createdBy: adminId,
          updatedBy: adminId,
        },
      });

      // asignar permiso a cada rol según roleMatrix
      for (const [roleName, flags] of Object.entries(roleMatrix)) {
        if (flags[i] !== 1) continue;

        // evita duplicados si ya existe la relación
        const exists = await prisma.rolePermission.findFirst({
          where: { roleId: rolesMap[roleName], permissionId: permission.id },
          select: { id: true },
        });
        if (!exists) {
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

  console.log('✅ Seed: admin, roles y permisos de roles creados.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
