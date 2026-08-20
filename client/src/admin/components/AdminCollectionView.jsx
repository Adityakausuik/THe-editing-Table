import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export function useAdminCollectionView(
  collection,
  search,
  getSearchValue,
  getPublished,
  pageSize = 6
) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return collection.filter((item) => {
      const matchesSearch = String(getSearchValue(item) || "").toLowerCase().includes(term);
      const published = Boolean(getPublished(item));
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && published) ||
        (statusFilter === "unpublished" && !published);
      return matchesSearch && matchesStatus;
    });
  }, [collection, getPublished, getSearchValue, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filteredItems.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return {
    pageItems,
    totalItems: filteredItems.length,
    statusFilter,
    setStatusFilter,
    page: safePage,
    setPage,
    totalPages
  };
}

export function CollectionStatusFilter({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="field-luxury text-xs max-w-44"
      aria-label="Filter by publication status"
    >
      <option value="all">All statuses</option>
      <option value="published">Published</option>
      <option value="unpublished">Draft / inactive</option>
    </select>
  );
}

export function CollectionPagination({ page, totalPages, totalItems, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 text-xs text-sage-muted">
      <span>{totalItems} records</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-xl border border-sage-border bg-sage-card disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span>Page {page} of {totalPages}</span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 rounded-xl border border-sage-border bg-sage-card disabled:opacity-30"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
