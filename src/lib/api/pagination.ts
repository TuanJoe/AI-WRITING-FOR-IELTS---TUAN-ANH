export interface PageParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function getPageParams(
  searchParams: URLSearchParams,
  defaultSize = 25,
): PageParams {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    200,
    Math.max(1, parseInt(searchParams.get("pageSize") || `${defaultSize}`, 10) || defaultSize),
  );
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function pageMeta(total: number, params: PageParams) {
  return {
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  };
}
