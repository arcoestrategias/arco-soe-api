// Tipos y límites
export const MAX_LOGO_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_DOC_SIZE = 20 * 1024 * 1024; // 20MB

// Imágenes comunes para logo (evitar SVG por seguridad)
export const IMAGE_MIME_REGEX = /^image\/(png|x-png|jpeg|jpg|webp)$/i;

// Documentos comunes
export const DOC_MIME_REGEX =
  /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)$/i;
