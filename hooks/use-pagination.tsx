import { useMemo } from "react";

export function usePagination<T>(
  data: T[],
  pageSize: number,
  currentPage: number
) {
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, pageSize, currentPage]);

  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return {
    paginatedData,
    totalItems,
    totalPages,
    currentPage,
    hasNextPage,
    hasPrevPage,
  };
}
