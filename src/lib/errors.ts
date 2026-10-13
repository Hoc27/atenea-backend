export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  badRequest: (msg = "Solicitud inválida", details?: unknown) =>
    new AppError(400, "BAD_REQUEST", msg, details),
  unauthorized: (msg = "Credenciales inválidas") =>
    new AppError(401, "UNAUTHORIZED", msg),
  forbidden: (msg = "No tienes permiso para esta acción") =>
    new AppError(403, "FORBIDDEN", msg),
  notFound: (entity = "Recurso") =>
    new AppError(404, "NOT_FOUND", `${entity} no encontrado`),
  conflict: (msg = "El recurso ya existe") => new AppError(409, "CONFLICT", msg),
};
