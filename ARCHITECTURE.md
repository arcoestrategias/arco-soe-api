# 📐 ARQUITECTURA DE CAPAS — SOE Backend

Este documento establece las convenciones y principios que seguimos en este backend construido con **NestJS + Prisma**, con el fin de mantener una estructura coherente, escalable y limpia.

---

## 🧱 Capas principales

| Capa       | Responsabilidad                                             |
| ---------- | ----------------------------------------------------------- |
| Controller | Orquestar flujos HTTP, recibir DTOs, delegar al Service     |
| Service    | Aplicar lógica de negocio, validaciones, hashing, flujos    |
| Repository | Encapsular acceso directo a Prisma (create, findMany, etc.) |

---

## 🧠 Principio clave

> Los **controllers nunca deben hablar con repositories directamente**.  
> Solo interactúan con `Service`.

```ts
// ✅ correcto
await this.usersService.create(dto);

// ❌ incorrecto
await this.usersRepository.create(dto); // ← solo dentro del Service
```

---

## 🔁 Uso de Services dentro de Services

| Situación                                      | Recomendación                                  |
| ---------------------------------------------- | ---------------------------------------------- |
| Reutilizar lógica existente (`create()`, etc.) | ✅ Inyectar otro `Service`                     |
| Necesidad de bajo nivel (custom query, perf)   | ✅ Inyectar directamente el `Repository`       |
| Acciones cross-domain (notificaciones, etc.)   | ✅ Inyectar otro `Service` claramente separado |

---

## 🔐 Ejemplo aplicado

| Caso                          | Implementación                                                      |
| ----------------------------- | ------------------------------------------------------------------- |
| `AuthService` busca usuarios  | Usa `UsersRepository` directamente (porque aplica su propia lógica) |
| `DevController` crea usuarios | Usa `UsersService.create()` (como lo hace producción)               |

---

## 📦 Semilla (`DevController`)

El `DevController` es responsable de inicializar:

- Módulos
- Permisos
- Roles
- Usuarios semilla

Y debe usar los mismos `Service` que producción para mantener coherencia.

---

## 🔄 Prisma: Reglas para relaciones

- Si se requiere crear relaciones (como `roleId` en `User`), debe usarse:

```ts
role: {
  connect: {
    id: roleId;
  }
}
```

- Nunca enviar `undefined` como valor de relación, omitir si no está presente.

---

## 🛑 No permitido

- `Controller → Repository` directo ❌
- `Repository` aplicando lógica de negocio ❌
- Hashear contraseñas fuera del `UsersService` ❌ (excepto seeds si están bien controladas)

---

## 📎 Archivos de referencia

| Archivo               | Rol                                                     |
| --------------------- | ------------------------------------------------------- |
| `users.service.ts`    | Orquesta lógica como hashing                            |
| `users.repository.ts` | Acceso plano a Prisma                                   |
| `auth.service.ts`     | Accede directo a `UsersRepository` por control de flujo |
| `dev.controller.ts`   | Usa `UsersService` como lo haría producción             |

---

## 🔐 Sistema de Permisos Basado en Base de Datos

La autorización no es estática. El sistema valida permisos declarados con `@Permissions()` en tiempo de ejecución:

1. Se obtiene el `userId` y `roleId` desde el JWT.
2. `PermissionsGuard` llama al `PermissionValidatorService`, que:
   - Busca en `UserPermission` → Si existe, evalúa `isAllowed`.
   - Si no hay regla personalizada, busca en `RolePermission`.

Este diseño permite granularidad y personalización sin modificar el código.

---

## 🧼 Interceptores Globales

### `ResponseTransformInterceptor`

- Uniformiza todas las respuestas HTTP (estructura + mensaje).
- Funciona con `@SuccessMessage()` para personalizar mensaje exitoso.

### `SuccessLoggerInterceptor`

- Registra método, ruta, usuario y tiempo de ejecución.
- Preparado para extenderse con IP, device, tenantId (ver `express.d.ts`).

---

## 🧭 Multitenancy (conceptual)

Actualmente no implementado, pero considerado para futuro:

- Aislamiento de datos por empresa (`tenantId`)
- Propagación del `tenantId` desde el token o headers
- Validaciones para evitar acceso cruzado entre tenants

---
