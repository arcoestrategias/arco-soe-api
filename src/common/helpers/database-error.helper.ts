import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export function handleDatabaseErrors(error: any): never {
  if (error instanceof NotFoundException) throw error;

  // Prisma - Unique constraint
  if (
    error instanceof PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    const field = error.meta?.target?.[0] ?? 'campo único';
    throw new ConflictException(`Ya existe un registro con ese ${field}`);
  }

  // Prisma - Registro no encontrado para update/delete
  if (
    error instanceof PrismaClientKnownRequestError &&
    error.code === 'P2025'
  ) {
    throw new NotFoundException('Registro no encontrado');
  }

  // Prisma - Otros errores con mensaje
  if (error instanceof PrismaClientKnownRequestError && error.message) {
    throw new BadRequestException(error.message);
  }

  // Fallback genérico
  throw new InternalServerErrorException('Error inesperado en base de datos');
}
