import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { EmptyState } from './EmptyState';

export interface DataColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  sortValue?: (row: T) => string | number;
  render: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataColumn<T>[];
  keyExtractor: (row: T, index: number) => string;
  pageSize?: number;
  stickyHeader?: boolean;
  selectable?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  renderMobileCard?: (row: T, index: number) => React.ReactNode;
  rowClassName?: (row: T) => string;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  pageSize = 10,
  stickyHeader = false,
  selectable = false,
  emptyTitle = 'No matching records',
  emptyDescription = 'Adjust your filters or search query to refine results.',
  renderMobileCard,
  rowClassName,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState<number>(1);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set());

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return data;

    return [...data].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (va === vb) return 0;
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
  }, [data, columns, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paginatedRows = sortedData.slice(startIdx, startIdx + pageSize);

  const pageKeys = paginatedRows.map((row, idx) => keyExtractor(row, startIdx + idx));
  const allPageSelected =
    pageKeys.length > 0 && pageKeys.every((k) => selectedKeys.has(k));

  const toggleAllOnPage = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageKeys.forEach((k) => next.delete(k));
      } else {
        pageKeys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  const toggleRow = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSort = (col: DataColumn<T>) => {
    if (!col.sortValue) return;
    if (sortKey === col.key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const alignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  };

  if (data.length === 0) {
    return (
      <div className={cn('rounded-lg border border-border bg-white', className)}>
        <EmptyState
          icon={<Inbox className="w-5 h-5" />}
          title={emptyTitle}
          description={emptyDescription}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-white overflow-hidden',
        className
      )}
    >
      {/* Mobile Card View (when provided) */}
      {renderMobileCard && (
        <div className="divide-y divide-border md:hidden">
          {paginatedRows.map((row, idx) => (
            <div key={keyExtractor(row, startIdx + idx)} className="p-4">
              {renderMobileCard(row, startIdx + idx)}
            </div>
          ))}
        </div>
      )}

      {/* Desktop Table View */}
      <div className={cn('overflow-x-auto', renderMobileCard ? 'hidden md:block' : 'block')}>
        <table className="w-full text-[13px] border-collapse">
          <thead
            className={cn(
              'bg-subtle text-secondary border-b border-border',
              stickyHeader && 'sticky top-0 z-10'
            )}
          >
            <tr>
              {selectable && (
                <th scope="col" className="w-10 py-3 pl-4 pr-2 text-left">
                  <input
                    type="checkbox"
                    aria-label="Select all rows on page"
                    checked={allPageSelected}
                    onChange={toggleAllOnPage}
                    className="h-4 w-4 rounded border-border cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    className={cn(
                      'py-3 px-4 font-medium text-xs text-secondary select-none whitespace-nowrap',
                      alignClass(col.align),
                      col.className
                    )}
                  >
                    {col.sortValue ? (
                      <button
                        type="button"
                        onClick={() => handleSort(col)}
                        className={cn(
                          'inline-flex items-center gap-1 hover:text-primary transition-colors',
                          col.align === 'right' && 'ml-auto'
                        )}
                      >
                        <span>{col.header}</span>
                        {isSorted ? (
                          sortDir === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-brand-600" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-brand-600" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-45" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {paginatedRows.map((row, idx) => {
              const rowKey = keyExtractor(row, startIdx + idx);
              const isSelected = selectedKeys.has(rowKey);

              return (
                <tr
                  key={rowKey}
                  className={cn(
                    'hover:bg-subtle/70 transition-colors',
                    isSelected && 'bg-brand-50/40',
                    rowClassName?.(row)
                  )}
                >
                  {selectable && (
                    <td className="w-10 py-3 pl-4 pr-2 align-middle">
                      <input
                        type="checkbox"
                        aria-label="Select row"
                        checked={isSelected}
                        onChange={() => toggleRow(rowKey)}
                        className="h-4 w-4 rounded border-border cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'py-3.5 px-4 text-primary align-middle',
                        alignClass(col.align),
                        col.className
                      )}
                    >
                      {col.render(row, startIdx + idx)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination & Selection Footer */}
      {(sortedData.length > pageSize || selectedKeys.size > 0) && (
        <div className="no-print flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-t border-border bg-subtle text-xs text-secondary">
          <div className="flex items-center gap-3 tabular-nums">
            <span>
              Showing <strong className="font-medium text-primary">{startIdx + 1}</strong>–
              <strong className="font-medium text-primary">
                {Math.min(startIdx + pageSize, sortedData.length)}
              </strong>{' '}
              of <strong className="font-medium text-primary">{sortedData.length}</strong>
            </span>
            {selectable && selectedKeys.size > 0 && (
              <span className="text-brand-700 font-medium">
                {selectedKeys.size} selected
              </span>
            )}
          </div>
          {sortedData.length > pageSize && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-border bg-white text-primary font-medium hover:bg-subtle disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <span className="px-2 text-xs tabular-nums">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-border bg-white text-primary font-medium hover:bg-subtle disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
