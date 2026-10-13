import { Resend } from "resend";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";

type Field = { key: string; label: string };

const SECTIONS: { title: string; fields: Field[] }[] = [
  {
    title: "Solicitud",
    fields: [
      { key: "fechaSolicitud", label: "Fecha de solicitud" },
      { key: "fechaIngreso", label: "Fecha de ingreso" },
      { key: "nivel", label: "Nivel al que aspira ingresar" },
    ],
  },
  {
    title: "Datos del alumno",
    fields: [
      { key: "alumnoNombre", label: "Nombre completo" },
      { key: "alumnoCedula", label: "Número de cédula" },
      { key: "alumnoPasaporte", label: "Número de pasaporte" },
      { key: "alumnoFechaNacimiento", label: "Fecha de nacimiento" },
      { key: "alumnoLugarNacimiento", label: "Lugar de nacimiento" },
      { key: "alumnoIdiomaMaterno", label: "Idioma materno" },
      { key: "alumnoReligion", label: "Religión" },
      { key: "alumnoDireccion", label: "Dirección" },
      { key: "alumnoEdad", label: "Edad al 1° de abril del año de ingreso" },
      { key: "alumnoEscuelaProcedencia", label: "Escuela de procedencia" },
    ],
  },
  {
    title: "Datos del padre",
    fields: [
      { key: "padreNombre", label: "Nombre completo" },
      { key: "padreCedula", label: "Número de cédula" },
      { key: "padreTelResidencia", label: "Tel. residencia" },
      { key: "padreDireccion", label: "Dirección" },
      { key: "padreOcupacion", label: "Ocupación" },
      { key: "padreLugarTrabajo", label: "Lugar de trabajo" },
      { key: "padreTelTrabajo", label: "Tel. trabajo" },
      { key: "padreCelular", label: "Celular" },
      { key: "padreEmail", label: "E-mail" },
    ],
  },
  {
    title: "Datos de la madre",
    fields: [
      { key: "madreNombre", label: "Nombre completo" },
      { key: "madreCedula", label: "Número de cédula" },
      { key: "madreTelResidencia", label: "Tel. residencia" },
      { key: "madreDireccion", label: "Dirección" },
      { key: "madreOcupacion", label: "Ocupación" },
      { key: "madreLugarTrabajo", label: "Lugar de trabajo" },
      { key: "madreTelTrabajo", label: "Tel. trabajo" },
      { key: "madreCelular", label: "Celular" },
      { key: "madreEmail", label: "E-mail" },
    ],
  },
  {
    title: "Ascendencia e idiomas",
    fields: [
      { key: "ascendenciaGriega", label: "Ascendencia griega" },
      { key: "idiomasPadres", label: "Idiomas que hablan los padres además de español" },
    ],
  },
  {
    title: "Datos del acudiente",
    fields: [
      { key: "acudienteNombre", label: "Nombre" },
      { key: "acudienteCedula", label: "Número de cédula" },
      { key: "acudienteTelResidencia", label: "Tel. residencia" },
      { key: "acudienteDireccion", label: "Dirección" },
      { key: "acudienteOcupacion", label: "Ocupación" },
      { key: "acudienteLugarTrabajo", label: "Lugar de trabajo" },
      { key: "acudienteTelTrabajo", label: "Tel. trabajo" },
      { key: "acudienteCelular", label: "Celular" },
      { key: "acudienteEmail", label: "E-mail" },
    ],
  },
  {
    title: "Información adicional",
    fields: [
      { key: "tieneHermanos", label: "Tiene hermanos en el Instituto" },
      { key: "hermanosNombres", label: "Nombres de hermanos" },
      { key: "hermanosGrado", label: "Grado" },
      { key: "usoTransporte", label: "Uso de transporte" },
      { key: "turno", label: "Turno" },
      { key: "personaRecoge", label: "Persona que recogerá al estudiante" },
      { key: "situacionesEspeciales", label: "Situaciones especiales" },
    ],
  },
  {
    title: "Contacto de emergencia",
    fields: [
      { key: "emergenciaNombre", label: "Nombre" },
      { key: "emergenciaTelefono", label: "Teléfono" },
      { key: "emergenciaCelular", label: "Celular" },
    ],
  },
  {
    title: "Información médica",
    fields: [
      { key: "pediatraNombre", label: "Nombre del pediatra" },
      { key: "pediatraTelefono", label: "Teléfono" },
      { key: "pediatraCelular", label: "Celular" },
      { key: "tipoSangre", label: "Tipo de sangre" },
      { key: "alergias", label: "Alergias" },
      { key: "condicionesMedicas", label: "Condiciones médicas" },
      { key: "puedeTomarPeptobismol", label: "Puede tomar Peptobismol" },
      { key: "puedeTomarMesopin", label: "Puede tomar Mesopin" },
      { key: "puedeTomarTylenol", label: "Puede tomar Tylenol" },
      { key: "aplicarMercuriocromo", label: "Se le puede aplicar Mercuriocromo" },
      { key: "aplicarMentholatum", label: "Se le puede aplicar Mentholatum" },
    ],
  },
  {
    title: "Firma",
    fields: [
      { key: "fechaInscripcion", label: "Fecha de inscripción" },
      { key: "firmaNombre", label: "Firma (nombre)" },
    ],
  },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailHtml(data: Record<string, string>): string {
  const rows = SECTIONS.map((section) => {
    const fields = section.fields
      .filter((f) => data[f.key]?.trim())
      .map(
        (f) =>
          `<tr><td style="padding:6px 12px 6px 0;color:#5a6b7b;vertical-align:top;white-space:nowrap;font-size:13px">${escapeHtml(
            f.label
          )}</td><td style="padding:6px 0;color:#12212f;font-size:13px">${escapeHtml(data[f.key])}</td></tr>`
      )
      .join("");
    if (!fields) return "";
    return `<h2 style="font-size:15px;color:#0b2545;margin:22px 0 6px;border-bottom:2px solid #16c4f2;padding-bottom:4px">${escapeHtml(
      section.title
    )}</h2><table style="border-collapse:collapse;width:100%">${fields}</table>`;
  }).join("");

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:640px">` +
    `<p style="color:#0b2545;font-size:16px;font-weight:bold;margin:0 0 16px">Nueva solicitud de inscripción — Instituto Atenea</p>` +
    rows +
    `<p style="color:#5a6b7b;font-size:12px;margin-top:24px">Enviado desde el formulario de admisión del sitio web.</p></div>`;
}

async function getAdmissionEmails(): Promise<string[]> {
  const block = await prisma.contentBlock.findUnique({
    where: { key: "admission.emails" },
  });
  const raw = block?.value?.trim();
  if (raw) {
    const list = raw
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));
    if (list.length > 0) return list;
  }
  return [env.ADMISSION_EMAIL];
}

export async function sendAdmissionEmail(
  data: Record<string, string>
): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    return false;
  }
  const to = await getAdmissionEmails();
  const resend = new Resend(env.RESEND_API_KEY);
  const studentName = data.alumnoNombre?.trim() || "Sin nombre";
  const html = buildEmailHtml(data);
  await resend.emails.send({
    from: `Instituto Atenea <${env.FROM_EMAIL}>`,
    to,
    subject: `Nueva solicitud de inscripción — ${studentName}`,
    html,
  });
  return true;
}
