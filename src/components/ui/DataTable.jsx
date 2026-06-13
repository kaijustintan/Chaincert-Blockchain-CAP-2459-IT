// DataTable.jsx
/*
  FILE: DataTable.jsx
  LAYMAN (Tropang Ex): Malinis na table na pare-pareho sa buong app — text naka-align
  sa kaliwa (madaling basahin), numbers/actions sa kanan, sticky header, at may hover.
  Pwede mong gamitin ito (config-driven) PARA sa bagong tables, o gamitin lang ang
  `cc-table` class sa lumang custom na table markup — pareho silang nakukuha ang istilo.

  TECHNICAL: Config-driven table over .cc-table. columns: [{ key, header, align, width,
  render(row,i) }]. align 'num' → right-aligned tabular, 'actions' → right-aligned
  nowrap. Falls back to an EmptyState when rows is empty. Pages with bespoke markup
  can instead just add className="cc-table" inside a .cc-table-wrap (see ui.css).

  PARAMS:
  - columns (array), rows (array), rowKey (fn(row,i)=>key | string field),
    zebra (bool), empty (node shown when no rows).

  RETURNS: a scroll-wrapped table, or the empty node.
*/
import React from 'react';
import EmptyState from './EmptyState';

const alignClass = (align) => (align === 'num' ? 'cc-num' : align === 'actions' ? 'cc-actions' : '');

export default function DataTable({ columns = [], rows = [], rowKey, zebra = false, empty, className = '' }) {
  if (!rows || rows.length === 0) {
    return empty || <EmptyState title="Nothing here yet" message="No records to show." />;
  }
  const keyFor = (row, i) =>
    typeof rowKey === 'function' ? rowKey(row, i) : (rowKey ? row[rowKey] : i);

  return (
    <div className="cc-table-wrap">
      <table className={`cc-table ${zebra ? 'cc-table--zebra' : ''} ${className}`.trim()}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={alignClass(col.align)} style={col.width ? { width: col.width } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={keyFor(row, i)}>
              {columns.map((col) => (
                <td key={col.key} className={alignClass(col.align)}>
                  {col.render ? col.render(row, i) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
