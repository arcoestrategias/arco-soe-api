# ----------------------
# Etapa 1: Build
# ----------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Instala dependencias de desarrollo
COPY package.json package-lock.json ./
RUN npm install

# Copia el resto del proyecto
COPY . .

# Genera Prisma Client
RUN npx prisma generate

# Compila el proyecto
RUN npm run build

# ----------------------------
# Etapa 2: Producción
# ----------------------------
FROM node:22-alpine AS production

WORKDIR /app

# Copia solo lo necesario
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copia el resultado de la etapa del Build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Copia la carpeta para archivos de la etapa Build
COPY --from=builder /app/uploads ./uploads

# Variables por defecto (es sobrescrito por compose/env del docker-compose)
ENV NODE_ENV=production
ENV PORT=3010

EXPOSE 3010 3011 3012

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
CMD ["sh", "/app/entrypoint.sh"]
