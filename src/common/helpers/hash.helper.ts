import * as bcrypt from 'bcryptjs';

/**
 * Genera un hash seguro para una contraseña.
 * @param password Contraseña en texto plano
 * @returns Contraseña hasheada
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 10);
};

/**
 * Compara una contraseña en texto plano contra un hash.
 * @param plainPassword Contraseña en texto plano
 * @param hashedPassword Contraseña hasheada
 * @returns Booleano: true si coinciden, false si no
 */
export const comparePassword = async (plainPassword: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};
