# Inventario de datos (registro de actividades — RGPD art. 30)

Generado desde las anotaciones de `prisma/schema.prisma`. Base del análisis de
riesgo y de las decisiones de retención. ⚠ = decisión pendiente del responsable.

| Entidad | Campo | Categoría | Base legal | Finalidad | Retención | Cifrado | Accede |
|---|---|---|---|---|---|---|---|
| AdmissionRequest | studentName | PII | interés legítimo ⚠ | gestión del proceso de admisión | 24 m (config) ⚠ | no | ADMIN (panel) |
| AdmissionRequest | level | PII | interés legítimo ⚠ | clasificar la solicitud | 24 m ⚠ | no | ADMIN |
| AdmissionRequest | contactEmail | PII | contrato ⚠ | contacto con la familia | 24 m ⚠ | no | ADMIN |
| AdmissionRequest | data | **sensible** (salud, religión, menores, origen) | consentimiento / interés legítimo ⚠ | admisión y cuidado del alumno | 24 m ⚠ | **sí (AES-256-GCM)** | ADMIN |
| AdmissionRequest | deletedAt / restrictedAt | metadato | obligación legal | trazabilidad de supresión/limitación | — | no | ADMIN |
| Admin | email | PII | contrato | cuenta de administración | alta + baja | no | ADMIN |
| Admin | name | PII | contrato | identificación | alta + baja | no | ADMIN |
| Admin | passwordHash | **@secret** | — | autenticación | alta + baja | (hash scrypt) | nadie |
| AuditLog | principalId | identificador | interés legítimo | auditoría de seguridad | 12 m (config) | no | ADMIN |
| AuditLog | ipTrunc | identificador pseudonimizado | interés legítimo | detección de abuso | 12 m | no | ADMIN |
| DataSubjectRequest | subjectRef | PII | obligación legal | gestionar derechos (ARCO) | 24 m ⚠ | no | ADMIN |
| ContentBlock / Post / Media / Download / DownloadCategory | — | sin datos personales | — | contenido público | — | — | público |

## Notas
- **Titular de los datos:** el alumno y su familia (menores incluidos), no el
  usuario que inicia sesión (Admin).
- **Categorías especiales (art. 9):** `AdmissionRequest.data` incluye salud,
  religión y origen (menores) → **DPIA casi obligatoria**.
- **Cifrado a nivel de campo:** `data` se cipher con AES-256-GCM (`FIELD_ENCRYPTION_KEY`).
  `studentName`/`contactEmail` siguen en claro (buscables); valorar hash ciego.
- **Retención:** `ADMISSION_RETENTION_DAYS` (por defecto 730) y
  `AUDIT_RETENTION_DAYS` (365), aplicadas por `src/jobs/retention.ts` (anonimiza
  admisiones vencidas y purga auditoría antigua).
- **Reajustar los ⚠** con el responsable del tratamiento y su asesor legal.
