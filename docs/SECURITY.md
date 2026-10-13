# Seguridad y protección de datos — atenea-backend

Complementa `CHECKLIST.md` y `DATA_INVENTORY.md`. Los apartados marcados ⚠ son
decisiones del responsable del tratamiento (no técnicas).

## 1. Detección

Alertas recomendadas (a partir de `AuditLog` y logs):

- Picos de `401`/`403` en `/api/admin/*` (posible fuerza bruta o escaneo).
- Repetición repetida de `auth.login_failed` para el mismo origen.
- Exportaciones o borrados DSAR (`privacy.export` / `privacy.erase`).
- Accesos a los datos de admisión (`GET /api/admin/admissions`) fuera de horario.

## 2. Runbook de brechas (RGPD art. 33-34)

1. **Contener**: revocar `JWT_SECRET`/`FIELD_ENCRYPTION_KEY` si aplica, cortar el
   acceso comprometido, aislar la instancia.
2. **Evaluar** alcance y riesgo para los derechos de las personas (menores y
   datos de salud elevan el riesgo).
3. **Preservar** evidencias (`AuditLog` es append-only; no borrar).
4. **Notificar** a la autoridad de control **sin dilación indebida y, a ser
   posible, en 72 h** si hay riesgo (art. 33); avisar a los afectados si el
   riesgo es alto (art. 34).
5. **Registrar** el incidente aunque no se notifique (art. 33.5).

> Panamá (Ley 81 de 2019): notificación de incidentes al titular y a la
> autoridad; confirmar plazos con asesoría local.

## 3. Encargados y transferencias ⚠

| Proveedor | Función | Datos que recibe | Ubicación | Base de transferencia | DPA |
|---|---|---|---|---|---|
| Hosting (Postgres `138.68.241.29`) | BD y aplicación | todos | ⚠ confirmar región | ⚠ cláusulas contractuales tipo | ⚠ |
| Resend | envío de email de admisión | datos del formulario | probablemente EE. UU. | ⚠ cláusulas contractuales tipo | ⚠ |

Si hay titulares en la UE y el servidor está fuera del EEE, se necesita base de
transferencia (art. 44-49). Elegir región UE simplifica el análisis.

## 4. Controles técnicos implementados

- Autenticación JWT (exp/jti/iss/aud), deny-by-default, CSRF, rate limiting.
- Validación Zod de entrada y **serialización de salida** (evita exposición excesiva).
- Cifrado AES-256-GCM de los datos de admisión; secretos fuera del repo.
- Auditoría append-only de login y acciones de administración.
- Derechos del titular gestionados vía `/api/admin/privacy/*` (export, borrado,
  restricción) — art. 15/17/18/20.
- Retención automatizable (`pnpm db:retention`, con `--dry-run`).

## 5. Contactos ⚠

- Responsable del tratamiento: ______________________
- DPO (si aplica): ______________________
- Hosting / soporte: ______________________
- Autoridad de control: ______________________
