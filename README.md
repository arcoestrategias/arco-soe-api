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

## 🌱 Inicialización de Datos del Sistema (Seed)

Si es la primera vez levantando el proyecto se deben inicializar los datos ejecutando la semilla.
Este proyecto incluye una semilla automática (`/prisma/seed.ts`) que crea todos los datos base del sistema: usuarios, roles, módulos, permisos y relaciones.

### 🔧 Ejecución del seed

```
npx ts-node prisma/seed.ts
```

> Asegúrate de tener corriendo la base de datos (`docker-compose up`) y configurado correctamente el archivo `.env`.

---

### 🧱 ¿Qué incluye este seed?

1. **Usuarios base:**

   - [admin@example.com](mailto:admin@example.com)
   - [manager@example.com](mailto:manager@example.com)
   - [specialist@example.com](mailto:specialist@example.com)
   - [client@example.com](mailto:client@example.com)

2. **Roles base:**

   - `Admin`, `Manager`, `Specialist`, `Client`, `Viewer`, `Operator`

3. **Módulos base**:

   - `users`, `roles`, `permissions`, `modules`, `companies`, `business-units`

4. **Permisos por módulo:**\
   Cada módulo incluye 8 acciones:

   ```
   access, read, create, update, delete, export, approve, assign
   ```

   Ejemplo: `user.access`, `role.create`, `businessUnit.delete`

5. **Asignación de permisos a roles según matriz jerárquica**

   | Rol        | access | read | create | update | delete | export | approve | assign |
   | ---------- | ------ | ---- | ------ | ------ | ------ | ------ | ------- | ------ |
   | Admin      | ✔️     | ✔️   | ✔️     | ✔️     | ✔️     | ✔️     | ✔️      | ✔️     |
   | Manager    | ✔️     | ✔️   | ✔️     | ✔️     | ✔️     | ✔️     | ✔️      |        |
   | Specialist | ✔️     | ✔️   | ✔️     | ✔️     |        |        |         |        |
   | Client     | ✔️     | ✔️   |        |        |        |        |         |        |
   | Viewer     | ✔️     | ✔️   |        |        |        |        |         |        |
   | Operator   | ✔️     | ✔️   | ✔️     | ✔️     | ✔️     |        |         |        |

6. **Asignación automática de permisos a los usuarios base, en función de su rol y unidad de negocio.**

---

### 🔄 ¿Se puede ejecutar múltiples veces el SEED?

Sí. El seed es **idempotente**:\
Detecta y evita duplicados en roles, permisos, módulos, usuarios y relaciones.

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
  - `UserPermission` (puede permitir o denegar explícitamente)

Los endpoints protegidos deben declarar el permiso requerido con el decorador correspondiente.

- Los roles actúan como **plantillas de permisos**: al asignar un rol a un usuario dentro de una unidad, se copian automáticamente todos sus permisos al usuario.

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
