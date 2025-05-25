export const moduleDefinitions = [
  { name: 'users', permissionPrefix: 'user' },
  { name: 'roles', permissionPrefix: 'role' },
  { name: 'permissions', permissionPrefix: 'permission' },
  { name: 'companies', permissionPrefix: 'company' },
];

export const actions = ['read', 'create', 'update', 'delete'];

//Si necesita agregar un nuevo rol semilla, solo se lo agrega y se indican los permisos que tendrá
export const rolePermissionRules: Record<string, string[]> = {
  client: ['read'],
  specialist: ['read', 'update'],
  manager: ['read', 'create', 'update'],
  admin: ['read', 'create', 'update', 'delete'],
};

export const seedUsers = [
  {
    email: 'client@example.com',
    password: 'Client123',
    role: 'client',
    firstName: 'Cliente',
    lastName: 'Semilla',
    username: 'client',
    ide: '0951828458',
  },
  {
    email: 'specialist@example.com',
    password: 'Special123',
    role: 'specialist',
    firstName: 'Especialista',
    lastName: 'Semilla',
    username: 'specialist',
    ide: '0951828457',
  },
  {
    email: 'manager@example.com',
    password: 'Manager123',
    role: 'manager',
    firstName: 'Manager',
    lastName: 'Semilla',
    username: 'manager',
    ide: '0951828456',
  },
  {
    email: 'admin@example.com',
    password: 'Admin123',
    role: 'admin',
    firstName: 'Admin',
    lastName: 'Semilla',
    username: 'admin',
    ide: '0951828455',
  },
];
