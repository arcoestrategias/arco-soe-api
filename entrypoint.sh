echo "▶ Aplicando migraciones de Prisma..."
npx prisma migrate deploy

echo "🚀 Iniciando aplicación NestJS..."
exec node dist/main
