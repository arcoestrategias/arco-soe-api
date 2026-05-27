echo "Aplicando migraciones de Prisma..."
npx prisma migrate deploy

if [ "$RUN_SEED" = "true" ]; then
  echo "Sembrando base de datos..."
  npx ts-node prisma/seed-simple.ts
  echo "Seed completado"
fi

echo "Iniciando aplicación NestJS..."
exec node dist/main
