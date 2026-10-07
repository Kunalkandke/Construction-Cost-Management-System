import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton, EmptyState, ErrorState } from './Feedback';
import { Button } from './Button';

// Server-side friendly table: sticky header, sortable, pagination, loading skeleton, empty/error states, sticky first column.
export function DataTable({ columns, rows, loading, error, onRetry, meta, onPage, sort, onSort, rowKey = 'id', actions, empty, onRowClick, className = '' }) {
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  const sortKey = sort?.replace(/^-/, '');
  const desc = sort?.startsWith('-');
  return (
    <div className={className}>
      <div className="overflow-x-auto rounded-xl">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-brand-50/95 text-left text-xs uppercase tracking-wide text-ink-500 backdrop-blur">
            <tr>
              {columns.map((c, i) => (
                <th key={c.key} scope="col" className={`px-3 py-3 font-semibold ${i === 0 ? 'sticky left-0 bg-brand-50/95' : ''} ${c.align === 'right' ? 'text-right' : ''}`} aria-sort={sortKey === c.key ? (desc ? 'descending' : 'ascending') : undefined}>
                  {c.sortable && onSort ? (
                    <button type="button" className="inline-flex items-center gap-1 uppercase" onClick={() => onSort(sortKey === c.key && !desc ? `-${c.key}` : c.key)}>
                      {c.header}{sortKey === c.key && (desc ? <ArrowDown className="h-3 w-3" aria-hidden /> : <ArrowUp className="h-3 w-3" aria-hidden />)}
                    </button>
                  ) : c.header}
                </th>
              ))}
              {actions && <th scope="col" className="px-3 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-300/40 bg-white/50">
            {loading && !rows?.length
              ? Array.from({ length: 5 }, (_, r) => <tr key={r}>{columns.map((c) => <td key={c.key} className="px-3 py-3"><Skeleton className="h-5 w-full" /></td>)}{actions && <td />}</tr>)
              : rows?.map((row) => (
                <tr key={row[rowKey]} className={`hover:bg-white/80 ${onRowClick ? 'cursor-pointer' : ''}`} onClick={onRowClick ? () => onRowClick(row) : undefined}>
                  {columns.map((c, i) => (
                    <td key={c.key} className={`px-3 py-3 align-middle ${i === 0 ? 'sticky left-0 bg-white/90 font-medium' : ''} ${c.align === 'right' ? 'text-right tabular' : ''} ${c.className || ''}`}>{c.render ? c.render(row) : row[c.key] ?? '-'}</td>
                  ))}
                  {actions && <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>{actions(row)}</td>}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!loading && !rows?.length && (empty || <EmptyState title="Nothing here yet">No records match your filters.</EmptyState>)}
      {meta && onPage && meta.total > meta.pageSize && <Pagination meta={meta} onPage={onPage} />}
    </div>
  );
}

export function Pagination({ meta, onPage }) {
  const pages = Math.max(1, Math.ceil(meta.total / meta.pageSize));
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-2 px-1 pt-3 text-sm">
      <span className="text-ink-500">Page {meta.page} of {pages} ({meta.total} total)</span>
      <div className="flex gap-1">
        <Button size="sm" variant="secondary" icon={ChevronLeft} disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} aria-label="Previous page" />
        <Button size="sm" variant="secondary" icon={ChevronRight} disabled={meta.page >= pages} onClick={() => onPage(meta.page + 1)} aria-label="Next page" />
      </div>
    </nav>
  );
}
