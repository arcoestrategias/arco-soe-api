export const generateSecurePassword = (): string => {
  const min = 12,
    max = 20;
  const length = Math.floor(Math.random() * (max - min + 1)) + min;
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const pool = upper + lower + digits;
  let pass = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
  ];
  for (let i = pass.length; i < length; i++)
    pass.push(pool[Math.floor(Math.random() * pool.length)]);
  for (let i = pass.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pass[i], pass[j]] = [pass[j], pass[i]];
  }
  return pass.join('');
};
