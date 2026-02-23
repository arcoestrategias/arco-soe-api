import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../src/common/helpers/hash.helper';

const prisma = new PrismaClient();

async function main() {
  // Módulos de la plataforma con su shortCode para asociar permisos
  const modules = [
    {
      name: 'Performance',
      shortCode: 'performance',
      description:
        'Módulo para la visualización de dashboards y KPIs de desempeño.',
    },
    {
      name: 'Plan estratégico',
      shortCode: 'strategicPlans',
      description:
        'Módulo para la gestión de planes estratégicos, misión, visión y su estructura.',
    },
    {
      name: 'Factores clave de éxito',
      shortCode: 'strategicSuccessFactor',
      description:
        'Módulo para la gestión de factores clave de éxito de los planes.',
    },
    {
      name: 'Valores estratégicos',
      shortCode: 'strategicValues',
      description:
        'Módulo para la gestión de valores estratégicos de los planes.',
    },
    {
      name: 'Objetivos',
      shortCode: 'objectives',
      description: 'Módulo para la gestión de objetivos e indicadores.',
    },
    {
      name: 'Proyectos estratégicos',
      shortCode: 'strategicProjects',
      description: 'Módulo para la gestión de proyectos estratégicos.',
    },
    {
      name: 'Posiciones',
      shortCode: 'positions',
      description: 'Módulo para la gestión de posiciones y organigrama.',
    },
    {
      name: 'Palancas',
      shortCode: 'levers',
      description: 'Módulo para la gestión de palancas asociadas a posiciones.',
    },
    {
      name: 'Factores de proyectos estratégicos',
      shortCode: 'projectFactors',
      description:
        'Módulo para la gestión de factores de proyectos estratégicos.',
    },
    {
      name: 'Tareas de proyectos estratégicos',
      shortCode: 'projectTasks',
      description:
        'Módulo para la gestión de tareas de proyectos estratégicos.',
    },
    {
      name: 'Cumplimiento de objetivos',
      shortCode: 'objectiveGoals',
      description: 'Módulo para la gestión de metas de objetivos.',
    },
    {
      name: 'Prioridades',
      shortCode: 'priorities',
      description: 'Módulo para la gestión de prioridades.',
    },
    {
      name: 'Compañías',
      shortCode: 'companies',
      description: 'Módulo para la administración de compañías (tenants).',
    },
    {
      name: 'Unidades de negocio',
      shortCode: 'businessUnits',
      description: 'Módulo para la administración de unidades de negocio.',
    },
    {
      name: 'Usuarios',
      shortCode: 'users',
      description: 'Módulo para la administración de usuarios del sistema.',
    },
    {
      name: 'Módulos',
      shortCode: 'modules',
      description: 'Módulo para la administración de los módulos del sistema.',
    },
    {
      name: 'Roles',
      shortCode: 'roles',
      description:
        'Módulo para la administración de roles y plantillas de permisos.',
    },
    {
      name: 'Notificaciones',
      shortCode: 'notifications',
      description: 'Módulo para la gestión de notificaciones del sistema.',
    },
    {
      name: 'Permisos',
      shortCode: 'permissions',
      description: 'Módulo para la administración de permisos granulares.',
    },
    {
      name: 'Configuraciones del sistema',
      shortCode: 'systemSettings',
      description:
        'Módulo para la administración de configuraciones del sistema.',
    },
  ];

  // Catálogo oficial de permisos (fuente única de verdad)
  const permissions = [
    // Performance
    {
      name: 'performance.menu',
      description: 'Acceder al menú funcional de Performance.',
    },
    {
      name: 'performance.showFilterStrategicPlan',
      description: 'Ver filtro de Plan Estratégico.',
    },
    {
      name: 'performance.showFilterPosition',
      description: 'Ver filtro de Posición.',
    },
    { name: 'performance.showFilterMonth', description: 'Ver filtro de Mes.' },
    { name: 'performance.showFilterYear', description: 'Ver filtro de Año.' },
    { name: 'performance.showIcoChart', description: 'Ver gráfico de ICO.' },
    { name: 'performance.showIcpChart', description: 'Ver gráfico de ICP.' },
    {
      name: 'performance.showPerformanceChart',
      description: 'Ver gráfico de Performance.',
    },
    {
      name: 'performance.showAssignmentsChart',
      description: 'Ver gráfico de total de asignaciones por posición.',
    },
    {
      name: 'performance.showAnnualPerformanceTrendChart',
      description: 'Ver gráfico de tendencia anual de performance.',
    },
    {
      name: 'performance.showPerformanceMapChart',
      description: 'Ver gráfico de mapa de performance.',
    },
    {
      name: 'performance.showPositionSummaryTable',
      description: 'Ver tabla de resumen de performance por posición.',
    },

    // Planes Estratégicos
    {
      name: 'strategicPlans.menu',
      description: 'Acceder al menú funcional de Planes Estratégicos.',
    },
    {
      name: 'strategicPlans.menuConfig',
      description: 'Acceso al menú de configuración de Planes Estratégicos.',
    },
    {
      name: 'strategicPlans.showFilterStrategicPlan',
      description: 'Ver filtro de Plan Estratégico.',
    },
    {
      name: 'strategicPlans.showDefinitionTab',
      description: 'Ver pestaña Definición del Plan Estratégico.',
    },
    {
      name: 'strategicPlans.showStrategicMapTab',
      description: 'Ver pestaña Mapa Estratégico.',
    },
    {
      name: 'strategicPlans.read',
      description: 'Ver lista de planes estratégicos.',
    },
    {
      name: 'strategicPlans.create',
      description: 'Crear planes estratégicos.',
    },
    {
      name: 'strategicPlans.update',
      description: 'Actualizar planes estratégicos.',
    },
    {
      name: 'strategicPlans.delete',
      description: 'Inactivar planes estratégicos.',
    },
    {
      name: 'strategicPlans.reorder',
      description: 'Reordenar planes estratégicos.',
    },
    { name: 'strategicPlans.addNote', description: 'Agregar Nota.' },
    { name: 'strategicPlans.uploadDocument', description: 'Cargar Documento.' },
    {
      name: 'strategicPlans.downloadReportPdf',
      description: 'Descargar reporte PDF del plan estratégico.',
    },
    {
      name: 'strategicPlans.audit',
      description: 'Ver auditoría de plan estratégico.',
    },

    // Factores Clave de Éxito
    {
      name: 'strategicSuccessFactor.read',
      description: 'Ver lista de factores clave de éxito.',
    },
    {
      name: 'strategicSuccessFactor.create',
      description: 'Crear factores clave de éxito.',
    },
    {
      name: 'strategicSuccessFactor.update',
      description: 'Editar factores clave de éxito.',
    },
    {
      name: 'strategicSuccessFactor.delete',
      description: 'Inactivar factores clave de éxito.',
    },
    {
      name: 'strategicSuccessFactor.reorder',
      description: 'Reordenar factores clave de éxito.',
    },
    {
      name: 'strategicSuccessFactor.audit',
      description: 'Ver auditoría de factores clave de éxito.',
    },

    // Valores Estratégicos
    {
      name: 'strategicValues.read',
      description: 'Ver lista de valores estratégicos.',
    },
    {
      name: 'strategicValues.create',
      description: 'Crear valores estratégicos.',
    },
    {
      name: 'strategicValues.update',
      description: 'Editar valores estratégicos.',
    },
    {
      name: 'strategicValues.delete',
      description: 'Inactivar valores estratégicos.',
    },
    {
      name: 'strategicValues.reorder',
      description: 'Reordenar valores estratégicos.',
    },
    {
      name: 'strategicValues.audit',
      description: 'Ver auditoría de valores estratégicos.',
    },

    // Objetivos
    {
      name: 'objectives.menu',
      description: 'Acceder al menú funcional de Objetivos.',
    },
    {
      name: 'objectives.showFilterStrategicPlan',
      description: 'Ver filtro de Plan Estratégico.',
    },
    {
      name: 'objectives.showFilterPosition',
      description: 'Ver filtro de Posición.',
    },
    { name: 'objectives.showFilterYear', description: 'Ver filtro de Año.' },
    {
      name: 'objectives.showIcoBoardTab',
      description: 'Ver pestaña Tablero ICO.',
    },
    {
      name: 'objectives.showComplianceTab',
      description: 'Ver pestaña Cumplimiento.',
    },
    {
      name: 'objectives.showDeploymentMatrixTab',
      description: 'Ver pestaña Matriz de Despliegue.',
    },
    {
      name: 'objectives.showAnnualIcoTrendChart',
      description: 'Ver grafico de Tendencia Anual de ICO',
    },
    { name: 'objectives.read', description: 'Ver lista de objetivos.' },
    { name: 'objectives.create', description: 'Crear objetivos.' },
    { name: 'objectives.update', description: 'Editar objetivos.' },
    { name: 'objectives.delete', description: 'Inactivar objetivos.' },
    { name: 'objectives.reorder', description: 'Reordenar objetivos.' },
    { name: 'objectives.addNote', description: 'Agregar notas.' },
    { name: 'objectives.uploadDocument', description: 'Adjuntar documentos.' },
    { name: 'objectives.audit', description: 'Ver auditoría de objetivos.' },

    // Metas de Objetivos
    {
      name: 'objectiveGoals.update',
      description: 'Editar cumplimiento del objetivo.',
    },
    {
      name: 'objectiveGoals.updateCompliance',
      description: 'Registrar y actualizar el cumplimiento del objetivo.',
    },
    {
      name: 'objectiveGoals.updateTargetValue',
      description: 'Editar el valor meta esperado del objetivo.',
    },
    {
      name: 'objectiveGoals.updateBaseValue',
      description: 'Editar el valor línea base del objetivo.',
    },
    {
      name: 'objectiveGoals.audit',
      description: 'Ver auditoría de metas del objetivo.',
    },

    // Palancas
    { name: 'levers.read', description: 'Ver lista de palancas.' },
    { name: 'levers.create', description: 'Crear palancas.' },
    { name: 'levers.update', description: 'Editar palancas.' },
    { name: 'levers.delete', description: 'Inactivar palancas.' },
    { name: 'levers.reorder', description: 'Reordenar palancas.' },
    { name: 'levers.audit', description: 'Ver auditoría de palancas.' },

    // Proyectos Estratégicos
    {
      name: 'strategicProjects.menu',
      description: 'Acceder al menú funcional de Proyectos Estratégicos.',
    },
    {
      name: 'strategicProjects.showFilterStrategicPlan',
      description: 'Ver filtro de Plan Estratégico.',
    },
    {
      name: 'strategicProjects.showFilterPosition',
      description: 'Ver filtro de Posición.',
    },
    {
      name: 'strategicProjects.read',
      description: 'Ver lista de proyectos estratégicos.',
    },
    {
      name: 'strategicProjects.create',
      description: 'Crear proyectos estratégicos.',
    },
    {
      name: 'strategicProjects.update',
      description: 'Editar proyectos estratégicos.',
    },
    {
      name: 'strategicProjects.delete',
      description: 'Inactivar proyectos estratégicos.',
    },
    {
      name: 'strategicProjects.reorder',
      description: 'Reordenar proyectos estratégicos.',
    },
    {
      name: 'strategicProjects.downloadReportPdf',
      description: 'Descargar reporte PDF del Proyecto Estratégico.',
    },
    {
      name: 'strategicProjects.audit',
      description: 'Ver auditoría de proyectos estratégicos.',
    },

    // Factores de Proyecto
    {
      name: 'projectFactors.read',
      description: 'Ver lista de factores del proyecto.',
    },
    {
      name: 'projectFactors.create',
      description: 'Crear factores del proyecto.',
    },
    {
      name: 'projectFactors.update',
      description: 'Editar factores del proyecto.',
    },
    {
      name: 'projectFactors.delete',
      description: 'Inactivar factores del proyecto.',
    },
    {
      name: 'projectFactors.reorder',
      description: 'Reordenar factores del proyecto.',
    },
    {
      name: 'projectFactors.audit',
      description: 'Ver auditoría de factores del proyecto.',
    },

    // Tareas de Proyecto
    {
      name: 'projectTasks.read',
      description: 'Ver lista de tareas del proyecto.',
    },
    { name: 'projectTasks.create', description: 'Crear tareas del proyecto.' },
    { name: 'projectTasks.update', description: 'Editar tareas del proyecto.' },
    {
      name: 'projectTasks.delete',
      description: 'Inactivar tareas del proyecto.',
    },
    {
      name: 'projectTasks.reorder',
      description: 'Reordenar tareas del proyecto.',
    },
    {
      name: 'projectTasks.audit',
      description: 'Ver auditoría de tareas del proyecto.',
    },

    // Posiciones
    {
      name: 'positions.menu',
      description: 'Acceder al menú funcional de Posiciones.',
    },
    {
      name: 'positions.menuConfig',
      description: 'Acceso al menú de configuración de Posiciones.',
    },
    {
      name: 'positions.showFilterStrategicPlan',
      description: 'Ver filtro de Plan Estratégico.',
    },
    {
      name: 'positions.showFilterPosition',
      description: 'Ver filtro de Posición.',
    },
    { name: 'positions.showFilterMonth', description: 'Ver filtro de Mes.' },
    { name: 'positions.showFilterYear', description: 'Ver filtro de Año.' },
    {
      name: 'positions.showDefinitionTab',
      description: 'Ver pestaña Definición.',
    },
    {
      name: 'positions.showOrgChartTab',
      description: 'Ver pestaña Organigrama.',
    },
    {
      name: 'positions.downloadReportPdf',
      description: 'Descargar el reporte en PDF de Posiciones.',
    },
    { name: 'positions.read', description: 'Ver lista de posiciones.' },
    { name: 'positions.create', description: 'Crear posiciones.' },
    { name: 'positions.update', description: 'Actualizar posiciones.' },
    { name: 'positions.delete', description: 'Inactivar posiciones.' },
    { name: 'positions.reorder', description: 'Reordenar posiciones.' },
    { name: 'positions.addNote', description: 'Agregar Nota.' },
    { name: 'positions.uploadDocument', description: 'Cargar Documento.' },
    {
      name: 'positions.setBusinessUnits',
      description: 'Asignar Posición a Unidad de Negocio.',
    },
    { name: 'positions.setUsers', description: 'Asignar Posición a Usuario.' },
    {
      name: 'positions.setParentPosition',
      description: 'Asignar Posición Superior.',
    },
    {
      name: 'positions.audit',
      description: 'Ver auditoría de tareas del proyecto.',
    },

    // Prioridades
    {
      name: 'priorities.menu',
      description: 'Acceder al menú funcional de Prioridades.',
    },
    {
      name: 'priorities.showFilterStrategicPlan',
      description: 'Ver filtro de Plan Estratégico.',
    },
    {
      name: 'priorities.showFilterPosition',
      description: 'Ver filtro de Posición.',
    },
    { name: 'priorities.showFilterMonth', description: 'Ver filtro de Mes.' },
    { name: 'priorities.showFilterYear', description: 'Ver filtro de Año.' },
    {
      name: 'priorities.showStatusChart',
      description: 'Ver gráfico de estado de prioridades.',
    },
    {
      name: 'priorities.showAnnualIcpTrendChart',
      description: 'Ver gráfico de tendencia anual de ICP.',
    },
    {
      name: 'priorities.downloadReportPdf',
      description: 'Descargar reporte PDF de Prioridades.',
    },
    { name: 'priorities.read', description: 'Ver lista de prioridades.' },
    { name: 'priorities.create', description: 'Crear prioridades.' },
    { name: 'priorities.update', description: 'Editar prioridades.' },
    { name: 'priorities.delete', description: 'Inactivar prioridades.' },
    { name: 'priorities.reorder', description: 'Reordenar prioridades.' },
    { name: 'priorities.addNote', description: 'Agregar notas.' },
    { name: 'priorities.uploadDocument', description: 'Adjuntar documentos.' },
    {
      name: 'priorities.updateFinishedAt',
      description: 'Actualizar fecha de finalización de prioridad.',
    },
    {
      name: 'priorities.updateDateRange',
      description: 'Editar fecha de inicio y fin de prioridad.',
    },
    { name: 'priorities.audit', description: 'Ver auditoría de prioridades.' },

    // Compañías
    {
      name: 'companies.menuConfig',
      description: 'Acceder al menú de configuración de compañías.',
    },
    { name: 'companies.read', description: 'Ver lista de compañías.' },
    { name: 'companies.create', description: 'Crear compañías.' },
    { name: 'companies.update', description: 'Editar compañías.' },
    { name: 'companies.delete', description: 'Inactivar compañías.' },
    { name: 'companies.reorder', description: 'Reordenar compañías.' },
    { name: 'companies.addNote', description: 'Agregar notas.' },
    { name: 'companies.uploadDocument', description: 'Adjuntar documentos.' },
    { name: 'companies.audit', description: 'Ver auditoría de compañías.' },

    // Unidades de Negocio
    {
      name: 'businessUnits.menuConfig',
      description: 'Acceder al menú de configuración de unidades de negocio.',
    },
    {
      name: 'businessUnits.read',
      description: 'Ver lista de unidades de negocio.',
    },
    { name: 'businessUnits.create', description: 'Crear unidades de negocio.' },
    {
      name: 'businessUnits.update',
      description: 'Editar unidades de negocio.',
    },
    {
      name: 'businessUnits.delete',
      description: 'Inactivar unidades de negocio.',
    },
    {
      name: 'businessUnits.reorder',
      description: 'Reordenar unidades de negocio.',
    },
    { name: 'businessUnits.addNote', description: 'Agregar notas.' },
    {
      name: 'businessUnits.uploadDocument',
      description: 'Adjuntar documentos.',
    },
    {
      name: 'businessUnits.audit',
      description: 'Ver auditoría de unidades de negocio.',
    },

    // Usuarios
    {
      name: 'users.menuConfig',
      description: 'Acceder al menú de configuración de usuarios.',
    },
    { name: 'users.read', description: 'Ver lista de usuarios.' },
    { name: 'users.create', description: 'Crear usuarios.' },
    { name: 'users.update', description: 'Editar usuarios.' },
    { name: 'users.delete', description: 'Inactivar usuarios.' },
    { name: 'users.reorder', description: 'Reordenar usuarios.' },
    { name: 'users.addNote', description: 'Agregar notas.' },
    { name: 'users.uploadDocument', description: 'Adjuntar documentos.' },
    {
      name: 'users.setPermissions',
      description: 'Asignar Permisos a Usuarios.',
    },
    { name: 'users.setRoles', description: 'Asignar Roles a Usuarios.' },
    {
      name: 'users.setBusinessUnits',
      description: 'Asignar Usuarios a Unidades de Negocios.',
    },
    { name: 'users.audit', description: 'Ver auditoría de usuarios.' },

    // Módulos
    {
      name: 'modules.menuConfig',
      description: 'Acceder al menú de configuración de módulos.',
    },
    { name: 'modules.read', description: 'Ver lista de módulos.' },
    { name: 'modules.create', description: 'Crear módulos.' },
    { name: 'modules.update', description: 'Editar módulos.' },
    { name: 'modules.delete', description: 'Inactivar módulos.' },
    { name: 'modules.reorder', description: 'Reordenar módulos.' },
    {
      name: 'modules.setPermissions',
      description: 'Asignar permisos a módulos.',
    },
    { name: 'modules.audit', description: 'Ver auditoría de modulos.' },

    // Roles
    {
      name: 'roles.menuConfig',
      description: 'Acceder al menú de configuración de roles.',
    },
    { name: 'roles.read', description: 'Ver lista de roles.' },
    { name: 'roles.create', description: 'Crear roles.' },
    { name: 'roles.update', description: 'Editar roles.' },
    { name: 'roles.delete', description: 'Inactivar roles.' },
    { name: 'roles.reorder', description: 'Reordenar roles.' },
    {
      name: 'roles.setPermissions',
      description: 'Asignar permisos a los roles.',
    },
    { name: 'roles.audit', description: 'Ver auditoría de roles.' },

    // Notificaciones
    {
      name: 'notifications.menu',
      description: 'Acceder al menú funcional de notificaciones.',
    },
    {
      name: 'notifications.menuConfig',
      description: 'Acceder al menú de configuración de notificaciones.',
    },
    { name: 'notifications.read', description: 'Ver lista de notificaciones.' },
    { name: 'notifications.create', description: 'Crear notificaciones.' },
    { name: 'notifications.update', description: 'Editar notificaciones.' },
    { name: 'notifications.delete', description: 'Inactivar notificaciones.' },
    {
      name: 'notifications.audit',
      description: 'Ver auditoría de notificaciones.',
    },

    // Permisos
    {
      name: 'permissions.menu',
      description: 'Acceder al menú funcional de permisos.',
    },
    {
      name: 'permissions.menuConfig',
      description: 'Acceder al menú de configuración de permisos.',
    },
    { name: 'permissions.read', description: 'Ver lista de permisos.' },
    { name: 'permissions.create', description: 'Crear permisos.' },
    { name: 'permissions.update', description: 'Editar permisos.' },
    { name: 'permissions.delete', description: 'Inactivar permisos.' },
    { name: 'permissions.audit', description: 'Ver auditoría de permisos.' },

    // Configuraciones del Sistema
    {
      name: 'systemSettings.menuConfig',
      description: 'Acceder al menú de configuración de permisos.',
    },
    {
      name: 'systemSettings.read',
      description: 'Ver lista de configuraciones del sistema.',
    },
    {
      name: 'systemSettings.create',
      description: 'Crear configuraciones del sistema.',
    },
    {
      name: 'systemSettings.update',
      description: 'Editar configuraciones del sistema.',
    },
    {
      name: 'systemSettings.delete',
      description: 'Inactivar configuraciones del sistema.',
    },
    {
      name: 'systemSettings.audit',
      description: 'Ver auditoría de configuraciones del sistema.',
    },
  ];

  const roleNames = ['Especialista', 'Colaborador'];

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

  // 2) Roles base (sin asignar permisos todavía)
  for (const roleName of roleNames) {
    await prisma.role.upsert({
      where: { name: roleName },
      update: { updatedBy: adminId },
      create: {
        id: uuidv4(),
        name: roleName,
        createdBy: adminId,
        updatedBy: adminId,
      },
    });
  }

  // 3) Módulos y Permisos (solo catálogo)
  for (const mod of modules) {
    const moduleRecord = await prisma.module.upsert({
      where: { shortCode: mod.shortCode },
      update: { description: mod.description, updatedBy: adminId },
      create: {
        name: mod.name,
        shortCode: mod.shortCode,
        description: mod.description,
        createdBy: adminId,
        updatedBy: adminId,
      },
    });

    const modulePermissions = permissions.filter((p) =>
      p.name.startsWith(mod.shortCode + '.'),
    );

    for (const perm of modulePermissions) {
      await prisma.permission.upsert({
        where: { name: perm.name },
        update: {
          description: perm.description,
          moduleId: moduleRecord.id,
          updatedBy: adminId,
        },
        create: {
          name: perm.name,
          description: perm.description,
          moduleId: moduleRecord.id,
          createdBy: adminId,
          updatedBy: adminId,
        },
      });
    }
  }

  console.log('✅ Seed: admin, roles, módulos y catálogo de permisos creado.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());