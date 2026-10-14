# Checklist de seguridad y arquitectura — atenea-backend

Seguimiento del endurecimiento del backend contra la skill `fastify-secure-backend`
(`security-baseline.md` + `gdpr-compliance.md`). Se actualiza a medida que avanza.

- **Última actualización:** 2026-10-13
- **Estado global:** Fase 1 ✅ · Fase 2 ✅ · Fase 3 ⏳

---

## Fase 1 — Correcciones críticas ✅

- [x] **JWT con expiración**: `exp` + `jti` + `iss` + `aud`; verificación exige `iss`/`aud`.
- [x] **Credenciales admin**: defaults débiles eliminados de `config`/`seed`; `ADMIN_PASSWORD` ≥ 12 obligatorio en seed.
- [x] **Deny-by-default**: hook global `onRequest` (todo exige auth salvo `config: { public: true }` o `/uploads`).
- [x] **AuditLog**: modelo Prisma + migración `20261013120000_add_audit_log` **(aplicada a la BD remota)** + escritura de login y acciones `/api/admin`.
- [x] **Cifrado en reposo** de `AdmissionRequest.data` (PII + categorías especiales) con AES-256-GCM versionado.
- [x] **`FIELD_ENCRYPTION_KEY`** añadida a `.env` y `.env.example`.
- [x] **`trustProxy`** deja de ser `true`; `TRUST_PROXY` configurable (nº de saltos).
- [ ] **Aplicar la rotación del admin**: ejecutar `pnpm db:seed` (actualiza el `passwordHash` con el nuevo `ADMIN_PASSWORD`).

## Fase 2 — Arquitectura modular ✅

- [x] `src/config/env.ts` (variables validadas con Zod, falla al arrancar).
- [x] `src/lib/`: `prisma`, `errors` (AppError + catálogo), `context` (Ctx/PublicCtx + `truncateIp`), `crypto`, `password`, `http` (tipos estructurales), `upload`, `auth`, `pagination`.
- [x] `src/middlewares/auth.middleware.ts` (`authenticate`, `getCtx`, `getPublicCtx`).
- [x] `src/modules/<entidad>/{schema,service,controller,routes}.ts` para `content`, `posts`, `media`, `downloads`, `admission`, `auth`.
- [x] `src/modules/audit/audit.service.ts`.
- [x] **Services agnósticos** (factory con Prisma inyectado, datos planos) y **controllers delgados**.
- [x] **Zod `.strict()`** en entrada + **schema de respuesta** por ruta (`fastify-type-provider-zod`).
- [x] **Error handler uniforme** (`VALIDATION_ERROR`, `AppError`, P2002/P2025, serialización, 4xx de plugins).
- [x] Ficheros antiguos (`routes/`, `plugins/`, `config.ts`, `db.ts`, `security.ts`, `lib/audit.ts`, `lib/mailer.ts`) eliminados.
- [x] `tsc` / `eslint` / `pnpm build` en verde y 17/17 checks en runtime.

> **Deviaciones conscientes:** (1) cuerpo de error `{ error: string, code, requestId }` para no romper el frontend; (2) paginación offset/`take` acotado en vez de cursor; (3) `config/env.ts` y `lib/http.ts` adaptados al proyecto.

## Correcciones puntuales

- [x] **CORS / preflight**: `methods` explícitos `GET,HEAD,POST,PUT,PATCH,DELETE`, `allowedHeaders` (`Content-Type`, `x-csrf-token`) y `maxAge` 24 h. El hook deny-by-default ahora **ignora `OPTIONS`** (antes podía responder 401 al preflight si el origen no estaba en la allowlist).
- [ ] **Redeploy del backend**: la instancia desplegada responde `Access-Control-Allow-Methods: GET,HEAD,POST` (build antiguo o proxy que reescribe la cabecera). El código actual emite `GET,HEAD,POST,PUT,PATCH,DELETE` (verificado). Desplegar de nuevo y, si hay proxy inverso, permitir/reenviar CORS sin sobrescribirlo.

## Fase 3 — Pendiente ⏳

- [x] **Módulo `privacy/`** (derechos del titular, gestionados desde admin):
  - [x] `GET /api/admin/privacy/requests` (listado DSAR).
  - [x] `POST /api/admin/privacy/requests` (alta; `dueAt` = +1 mes).
  - [x] `POST .../:id/export` (Art. 15/20; no expone `@secret`).
  - [x] `POST .../:id/erase` (Art. 17; anonimización transaccional).
  - [x] `POST /api/admin/privacy/restriction` (Art. 18) y `PUT .../:id` (estado).
  - [x] Modelo `DataSubjectRequest` + `AdmissionRequest.deletedAt/restrictedAt` (migración aplicada).
  - [ ] `ConsentRecord` + consentimiento/oposición → *no aplica aún: el backend no captura consentimiento explícito*.
- [x] **Retención** `jobs/retention.ts` (idempotente, `--dry-run` disponible; `ADMISSION_RETENTION_DAYS`/`AUDIT_RETENTION_DAYS`).
- [x] **Tests** (Vitest, 13 en verde):
  - [x] deny-by-default (recorre `routeRegistry`; toda ruta `/api/admin` sin token → 401).
  - [x] validación/mass assignment (Zod `.strict()` rechaza campos desconocidos).
  - [x] cifrado AES-256-GCM y `secure-json` round-trip.
  - [x] password hash/verify.
  - [x] token con `exp`/`jti`/`iss`/`aud` y rechazo de emisor incorrecto.
  - [ ] IDOR / autorización a nivel de objeto → *no aplica: un único rol admin, sin propiedad de recursos*.
  - [ ] logs sin credenciales ni PII, y export DSAR sin secretos → *verificados manualmente; pendiente test persistente con BD de pruebas*.
  - [x] Scripts `test` y `audit` (`npm audit --omit=dev`) en `package.json`.
- [x] **`docs/DATA_INVENTORY.md`** (campo → categoría → base legal → retención → quién accede).
- [x] **`docs/SECURITY.md`** (runbook de brechas 72 h, encargados, transferencias).
- [x] **Endurecer uploads**: validación por *magic bytes* (`file-type`), temporal hasta validar, re-encode de imágenes a WebP, `Content-Disposition: attachment` + `nosniff` + CSP para no-imágenes.
- [ ] **Antivirus** (punto de extensión ClamAV) antes de marcar un archivo como disponible.
- [x] **`AdmissionRequest`**: `deletedAt` / `restrictedAt` (anonimización y limitación).
- [x] **`Admin.deletedAt`** (baja lógica; el login rechaza admins dados de baja).
- [ ] **CI**: `prisma migrate deploy` como paso explícito, `npm audit`, escaneo de imagen.
- [x] **`bodyLimit`**: 1 MB global y elevado solo en las rutas multipart (media/downloads).

---

## Hallazgos del audit (mapa de estado)

### Crítico — resueltos ✅
- [x] JWT sin expiración.
- [x] Datos sensibles en claro sin cifrado ni auditoría.
- [x] Ausencia de controles de privacidad (DSAR) → *pendiente en Fase 3*.
- [x] Credenciales admin por defecto sin rotar → *pendiente aplicar seed*.
- [x] Sin `AuditLog`.

### Alto — parcial
- [x] Deny-by-default.
- [x] Schemas de salida / minimización de datos.
- [x] `trustProxy` numérico.
- [ ] Sin tests.
- [x] `bodyLimit` 1 MB global (+ elevado en multipart).
- [x] Uploads con *magic bytes* + `nosniff`/`Content-Disposition`.
- [ ] Política de contraseñas (min 12) + dummy-hash anti-timing + bloqueo progresivo.

### Medio — pendiente
- [ ] Sin cifrado de `studentName`/`contactEmail` (columnas en claro).
- [ ] Sin índice ciego para búsquedas sobre campos cifrados.
- [ ] Sin job de retención.
- [ ] `/uploads` público/sin rate limit (revisar separación por finalidad y huérfanos).
- [ ] Helmet con CSP desactivada (en API pura: `default-src 'none'`, `frame-ancestors 'none'`).
- [ ] Sin `npm audit`/CI ni Dockerfile.

### Bajo — pendiente
- [ ] Logs/errores: revisar redacción de PII a fondo.
- [ ] HSTS explícito (lo añade helmet en prod).
- [ ] Documentar rotación de `JWT_SECRET` y `FIELD_ENCRYPTION_KEY`.

---

## Decisiones que NO son técnicas (responsable + asesor legal)

- [ ] Base jurídica por tratamiento (campos `@purpose`).
- [ ] Plazos de retención de `AdmissionRequest`.
- [ ] **DPIA** (menores + datos de salud) y **DPO**.
- [ ] Encargados de tratamiento y **transferencias internacionales** (Resend suele procesar en EE. UU.).
- [ ] Procedimiento de notificación de brechas (72 h).

---

## Verificación rápida

```bash
pnpm exec tsc -p tsconfig.json --noEmit   # tipos
pnpm lint                                 # eslint
pnpm build                                # prisma generate + tsc
pnpm exec prisma migrate status           # migraciones aplicadas
pnpm db:seed                              # aplica el nuevo ADMIN_PASSWORD
pnpm dev                                  # arranque local
```
