echo "Aplicando migraciones de Prisma..."
npx prisma migrate deploy

if [ "$RUN_SEED" = "true" ]; then
  echo "🌱 Sembrando base de datos..."
  node prisma/seed-simple.js
  echo "✅ Seed completado"
fi

echo "Iniciando aplicación NestJS..."
exec node dist/main
