# 🛡️ SOE Backend - Autenticación y Gestión de Usuarios

Este proyecto implementa el backend de **SOE**, un sistema SaaS empresarial que incluye autenticación robusta con JWT, refresh tokens, recuperación de contraseña segura, y gestión de usuarios.

---

## 📚 Tecnologías principales

- [NestJS](https://nestjs.com/) (Framework de Node.js)
- [Prisma ORM](https://www.prisma.io/) (Conexión a base de datos)
- [JWT](https://jwt.io/) (Autenticación segura)
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js) (Encriptación de contraseñas)
- [PostgreSQL](https://www.postgresql.org/) (Base de datos recomendada)

## 📦 Configuración del entorno en Local

### Pasos a seguir:

1. Clonar el repositorio y acceder al proyecto

```
git clone https://github.com/tuusuario/tu-repo-soe-api.git
cd tu-repo-soe-api
```

2. Instalar dependencias

```
npm install
```

3. Levantar el contenedor de la base

```
docker-compose -f docker-compose.local.yml up --build -d
```

4. Crear y aplicar la primera migración (solo si no existe la carpeta migrations)

```
npx prisma migrate dev --name init
```

5. Compilar el proyecto en modo desarrollo

```
npm run start:dev
```

---

## 🌱 Inicialización de Datos del Sistema

Si es la primera vez levantando el proyecto se deben inicializar los datos ejecutando la semilla.
Este proyecto incluye un endpoint especial de inicialización que permite sembrar toda la estructura base del sistema:

### 🔐 Endpoint de inicialización

- **URL:** `POST /api/v1/dev/seed/initial`
- **Header requerido:** `x-seed-token: so3-init-2024`

> El token debe coincidir con la variable `SEED_TOKEN` definida en el archivo `.env`.

### 🧱 ¿Qué incluye este seed?

1. **Módulos base**:
   - `users`, `roles`, `permissions`
2. **Permisos por módulo** (4 acciones por cada uno):
   - `read`, `create`, `update`, `delete`
   - Ej: `user.read`, `company.update`, etc.
3. **Roles jerárquicos predefinidos**:
   - `client`, `specialist`, `manager`, `admin`
4. **Asignación de permisos a cada rol**, según la siguiente regla:

| Rol          | Permisos asignados                   |
| ------------ | ------------------------------------ |
| `client`     | `read`                               |
| `specialist` | `read`, `update`                     |
| `manager`    | `read`, `create`, `update`           |
| `admin`      | `read`, `create`, `update`, `delete` |

> Las relaciones entre roles y permisos se insertan en la tabla `RolePermission` de forma segura.

### 🔁 ¿Puedo ejecutarlo varias veces?

Sí. El seed es **idempotente**:

- No duplica módulos, permisos ni roles si ya existen.
- Asigna permisos dinámicamente según los disponibles.

---

## 📦 Configuración del entorno en QA/Producción

### Pre-requisitos:

- `.env.prod` configurado
- `entrypoint.sh` habilitado para ejecutar migraciones y levantar el dist
- `Dockerfile` configurado para levantar los contenedores usando multistage

### Pasos a seguir:

1. Clonar el repositorio en el servidor y acceder al proyecto

###### Nota: Si está utilizando CI/CD con GitHub Actions, es necesario ejecutar la siguiente línea en el servidor, dentro de la carpeta del proyecto clonado: `git config --global --add safe.directory /opt/projects/arco-soe-api` Esto permite que Git confíe en ese directorio, y evita errores de tipo "detected dubious ownership" que ocurren cuando el usuario que ejecuta los comandos no coincide con el propietario del repositorio. Esta configuración es esencial para que git pull funcione correctamente durante el despliegue automático.

```
git clone https://github.com/tuusuario/tu-repo-soe-api.git

cd tu-repo-soe-api
```

2. Levantar el contenedor de la base

```
docker-compose -f docker-compose.local.yml --env-file .env.local up --build -d
```

# Seguridad aplicada

- Contraseñas hasheadas
- Tokens JWT seguros
- Refresh Token implementado
- Reset de contraseña seguro
- Protección de rutas con JwtAuthGuard

# Próximos pasos

- Verificación de email
- Auditoría de sesiones

# License:

Este proyecto es privado y propiedad de ARCO Estrategias. Uso estrictamente interno.

---

## 🔐 Control de Acceso y Permisos

El backend utiliza un sistema de autorización dinámico basado en:

- Decorador `@Permissions('modulo.accion')`
- Guard `PermissionsGuard`, que consulta la base de datos:
  - Primero `UserPermission` (puede permitir o denegar explícitamente)
  - Luego `RolePermission` (si no hay configuración personalizada)

Los endpoints protegidos deben declarar el permiso requerido con el decorador correspondiente.

---

## ✅ Respuestas estandarizadas

Todas las respuestas siguen la estructura uniforme aplicada por `ResponseTransformInterceptor`:

```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "statusCode": 201,
  "data": { ... }
}
```

Puedes personalizar el mensaje por endpoint con el decorador `@SuccessMessage()`.

---

## 📌 Decoradores disponibles

| Decorador           | Propósito                                      |
| ------------------- | ---------------------------------------------- |
| `@Permissions()`    | Define permisos requeridos por handler         |
| `@SuccessMessage()` | Define mensaje de éxito para la respuesta      |
| `@CurrentUser()`    | Accede al usuario autenticado desde el request |

---
