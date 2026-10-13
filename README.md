# atenea-backend

API y panel de administración del **Instituto Atenea** — Fastify + Prisma + TypeScript.

Gestiona el contenido del sitio: textos editables, archivos descargables (por sección/categoría), noticias/blog y galería de imágenes.

## Stack

- **Fastify 5** (HTTP + validación por JSON Schema)
- **Prisma 6** (ORM, SQLite local; cambia a Postgres en producción)
- **TypeScript**, `tsx` para desarrollo
- `pnpm`

## Seguridad implementada

- **Helmet** (headers de seguridad), CORS restringido a un origen, `poweredBy` desactivado.
- **Rate limiting** global + límite estricto en `/api/auth/login`.
- **Autenticación JWT** en cookie `httpOnly` + `Secure` + `SameSite=None`(prod)/`lax`(dev); token con `exp`, `jti`, `iss`, `aud`.
- **Deny-by-default**: hook global que exige autenticación salvo en rutas marcadas `config: { public: true }`.
- **CSRF** con `@fastify/csrf-protection` (token en header `x-csrf-token`).
- **Hash de contraseñas** con `crypto.scrypt` (sal aleatoria + comparación en tiempo constante).
- **Validación y serialización** con Zod (`fastify-type-provider-zod`) en entrada **y salida** (lo no declarado no se expone).
- **Cifrado en reposo** de los datos de admisión (PII y categorías especiales) con AES-256-GCM.
- **Auditoría** append-only de acciones de administración y de login (`AuditLog`).
- **Subida de archivos** con allowlist de MIME, nombre aleatorio (UUID), límite de tamaño y sin path traversal.
- **Manejo de errores** que no expone stack traces ni internals en producción.
- Secretos por variables de entorno; `.env` ignorado por git.

## Puesta en marcha

```bash
pnpm install
cp .env.example .env        # edita JWT_SECRET y las credenciales del admin
pnpm db:migrate             # crea la BD y aplica migraciones (ejecuta seed)
pnpm db:seed                # crea el usuario administrador
pnpm dev                    # arranca en http://localhost:4000
```

Scripts útiles: `pnpm build` (tsc), `pnpm lint`, `pnpm start` (producción).

## Endpoints

Públicos (lectura):

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/health` | Estado del servicio |
| GET | `/api/content` | Textos editables |
| GET | `/api/content/:key` | Un texto |
| GET | `/api/downloads` | Descargables publicados + categorías |
| GET | `/api/downloads/categories` | Categorías |
| GET | `/api/posts` | Noticias publicadas (filtros: `featured`, `category`, `q`, `limit`) |
| GET | `/api/posts/:slug` | Una noticia |
| GET | `/api/media` | Galería |

Admin (requieren JWT + CSRF):

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/api/auth/csrf` | Devuelve el token CSRF |
| POST | `/api/auth/login` | Inicia sesión |
| POST | `/api/auth/logout` | Cierra sesión |
| GET | `/api/auth/me` | Usuario actual |
| PUT / DELETE | `/api/admin/content/:key` | Crear/editar/borrar texto |
| GET / POST / PUT / DELETE | `/api/admin/posts[...]` | CRUD noticias |
| GET / POST / PUT / DELETE | `/api/admin/downloads[...]` | CRUD descargables (POST es multipart) |
| POST | `/api/admin/downloads/categories` | Crear categoría |
| GET / POST / PUT / DELETE | `/api/admin/media[...]` | CRUD galería |

## Notas

- **Producción**: usa Postgres (`DATABASE_URL`), `JWT_SECRET` (≥32) y `FIELD_ENCRYPTION_KEY` (64 hex) aleatorios, `NODE_ENV=production` (cookies `Secure`) y `TRUST_PROXY` con el nº de proxies real.
- **Migraciones**: `pnpm exec prisma migrate deploy` como paso explícito del despliegue (no al arrancar).
- Los archivos subidos se guardan en `./uploads` (ignorado por git) y se sirven en `/uploads/*`.
- `package.json#prisma.seed` está deprecado en Prisma 7; si migras a Prisma 7, usa `prisma.config.ts`.
