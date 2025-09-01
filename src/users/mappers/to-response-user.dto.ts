import { ResponseUserDto } from '../dto/response-user.dto';

export function toResponseUserDto(u: any, opts?: { businessUnitId?: string }) {
  // Si la ruta es por BU, conserva solo ese vínculo
  const sourceLinks: any[] = Array.isArray(u.userBusinessUnits)
    ? u.userBusinessUnits
    : [];
  const filtered = opts?.businessUnitId
    ? sourceLinks.filter((l) => l.businessUnitId === opts.businessUnitId)
    : sourceLinks;

  const mappedLinks = filtered.map((l) => ({
    businessUnitId: l.businessUnitId,
    businessUnitName: l.businessUnit?.name ?? '', // ⬅️ nombre BU
    positionId: l.positionId ?? null,
    positionName: l.position?.name ?? null, // ⬅️ nombre posición
    roleId: l.roleId ?? null,
    roleName: l.role?.name ?? null, // ⬅️ nombre rol
    isResponsible: !!l.isResponsible,
  }));

  return new ResponseUserDto({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    isActive: u.isActive,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    userBusinessUnits: mappedLinks.length ? mappedLinks : null,
  });
}
