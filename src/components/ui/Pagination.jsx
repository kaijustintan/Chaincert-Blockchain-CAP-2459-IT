// Pagination.jsx
/*
  FILE: Pagination.jsx
  LAYMAN (Tropang Ex): Para hindi sobrang haba ng page kapag marami nang records — imbes na
    ilabas LAHAT, ipapakita lang ang ~10 kada page, tapos may "Prev / Next" sa baba. Client-side
    lang (hinahati lang ang array na naka-load na), kaya gumagana pa rin ang search/filter/sort sa
    BUONG listahan bago mag-page. Isang shared control + hook para pare-pareho sa lahat ng table/list.
  TECHNICAL: Pure client-side pagination. usePagination(items, pageSize) slices an already-loaded,
    already-filtered/sorted array and auto-clamps to page 1 when the source shrinks (e.g. a filter
    change). The Pagination component renders a Prev / "Page X of Y" / Next bar and returns null when
    there is only one page. Token-styled inline; lucide chevrons. No backend/data changes.
  OUTLINE:
    HOOK   - usePagination(items, pageSize)   → { page, setPage, pageCount, pageItems, total, pageSize }
    UI     - Pagination({ page, pageCount, setPage, total, pageSize })
*/

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/*
  Function Name: usePagination

  LAYMAN (Tropang Ex):
  Ibigay mo yung buong (na-filter/sort na) array; ibabalik nito ang kasalukuyang page lang na slice
  (pageItems) na i-ma-map mo sa table, plus ang controls.

  TECHNICAL:
  Holds a 1-based page. pageCount = ceil(total / pageSize). A guard effect resets to page 1 whenever
  pageCount drops below the current page (filter/search shrank the list) so you never sit on an empty
  page. Returns the current slice + metadata.

  PARAMS:
  - items    — the full array to paginate (filtered/sorted upstream). Non-arrays tolerated → [].
  - pageSize — rows per page (default 10).

  RETURNS: { page, setPage, pageCount, pageItems, total, pageSize }
*/
export function usePagination(items, pageSize = 10) {
  const [page, setPage] = useState(1);
  const list = Array.isArray(items) ? items : [];
  const total = list.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => { if (page > pageCount) setPage(1); }, [page, pageCount]);
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const pageItems = list.slice(start, start + pageSize);
  return { page: safePage, setPage, pageCount, pageItems, total, pageSize };
}

/*
  Function Name: Pagination

  LAYMAN (Tropang Ex):
  Ilagay sa BABA ng table. Nagpapakita ng "Showing X–Y of N" + Prev/Next. Kung isang page lang,
  wala itong ipapakita.

  TECHNICAL:
  Presentational. Spread the usePagination() return into it. Renders null when pageCount <= 1.

  PARAMS: { page, pageCount, setPage, total, pageSize } (the usePagination() shape).
  RETURNS: the Prev / page-indicator / Next bar, or null.
*/
export default function Pagination({ page, pageCount, setPage, total, pageSize }) {
  if (!pageCount || pageCount <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const btnStyle = (disabled) => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: 'var(--surface-2)', border: '1px solid var(--border-strong)',
    color: disabled ? 'var(--text-subtle)' : 'var(--text)',
    borderRadius: 'var(--radius-control, 8px)', padding: '6px 12px',
    fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1, fontFamily: 'inherit',
  });
  return (
    <div className="cc-pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Showing {start}–{end} of {total}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} style={btnStyle(page <= 1)} aria-label="Previous page">
          <ChevronLeft size={16} aria-hidden="true" /> Prev
        </button>
        <span style={{ fontSize: 13, color: 'var(--text)', minWidth: 92, textAlign: 'center' }}>Page {page} of {pageCount}</span>
        <button type="button" onClick={() => setPage(Math.min(pageCount, page + 1))} disabled={page >= pageCount} style={btnStyle(page >= pageCount)} aria-label="Next page">
          Next <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
