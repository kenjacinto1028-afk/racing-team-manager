import { useMemo, useState, type ReactNode } from 'react';
import { Tip } from './Tip';

export interface Column<T> {
  key: string;
  label: string;
  /** Glossary key for a header tooltip. */
  tip?: string;
  render: (row: T, index: number) => ReactNode;
  /** Value used for sorting. Omit to make the column unsortable. */
  sort?: (row: T) => number | string;
  align?: 'left' | 'right' | 'center';
  width?: string | number;
}

/** Sortable table. Click a header to sort; click again to flip. */
export function DataTable<T>({ rows, columns, rowKey, initialSort, rowClass, empty, onRowClick }: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  rowClass?: (row: T) => string | undefined;
  empty?: string;
  onRowClick?: (row: T) => void;
}) {
  const [sort, setSort] = useState(initialSort ?? null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sort) return rows;
    const f = col.sort;
    const out = [...rows].sort((a, b) => {
      const x = f(a), y = f(b);
      const d = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return sort.dir === 'asc' ? d : -d;
    });
    return out;
  }, [rows, columns, sort]);

  const click = (c: Column<T>) => {
    if (!c.sort) return;
    setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key: c.key, dir: 'desc' }));
  };

  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={{ textAlign: c.align ?? 'left', width: c.width }}
                className={(c.sort ? 'sortable' : '') + (sort?.key === c.key ? ' sorted' : '')}
                onClick={() => click(c)}
                aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                {c.tip ? <Tip k={c.tip} plain>{c.label}</Tip> : c.label}
                {sort?.key === c.key && <span className="sort-arrow">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr><td colSpan={columns.length} className="empty">{empty ?? 'Nothing to show.'}</td></tr>
          )}
          {sorted.map((r, i) => (
            <tr key={rowKey(r)} className={(rowClass?.(r) ?? '') + (onRowClick ? ' clickable' : '')} onClick={onRowClick ? () => onRowClick(r) : undefined}>
              {columns.map((c) => (
                <td key={c.key} style={{ textAlign: c.align ?? 'left' }}>{c.render(r, i)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
