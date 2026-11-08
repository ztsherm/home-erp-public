export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePagination(searchParams: Record<string, string | string[] | undefined> = {}) {
  const page = Math.max(1, Number.parseInt(first(searchParams.page) ?? "1", 10) || 1);
  const requestedSize = Number.parseInt(first(searchParams.pageSize) ?? String(DEFAULT_PAGE_SIZE), 10);
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedSize as (typeof PAGE_SIZE_OPTIONS)[number]) ? requestedSize : DEFAULT_PAGE_SIZE;
  return { page, pageSize, skip: (page - 1) * pageSize };
}

export function paginationResult(total: number, page: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { total, page: Math.min(page, totalPages), pageSize, totalPages };
}

export type PaginationData = ReturnType<typeof paginationResult>;
