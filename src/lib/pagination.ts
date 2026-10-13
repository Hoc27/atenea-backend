// Paginación por cursor con tope de página. `rows` debe traer limit + 1 filas.
export function toPage<T extends { id: string }>(rows: T[], limit: number) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items.length > 0 ? items[items.length - 1] : undefined;
  return { items, nextCursor: hasMore ? last?.id ?? null : null };
}

export const MAX_PAGE_LIMIT = 100;
