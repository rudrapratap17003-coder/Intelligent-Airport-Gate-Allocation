import React from 'react'

export const Table = ({
  columns = [],
  data = [],
  keyExtractor,
  emptyMessage = 'No records found',
  className = '',
  loading = false,
  minWidth = 'min-w-[640px]',
}) => {
  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-[#1e3a5f]/60 bg-gw-card/50 ${className}`}>
      <table className={`w-full text-left text-sm text-gw-text ${minWidth}`}>
        <thead className="bg-gw-bg-secondary/70 text-xs uppercase tracking-wider text-gw-text-secondary border-b border-[#1e3a5f]/60">
          <tr>
            {columns.map((col, idx) => (
              <th key={col.key || idx} className={`px-4 py-3.5 font-semibold ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1e3a5f]/40">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gw-text-secondary">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-gw-cyan border-t-transparent rounded-full animate-spin" />
                  <span>Loading records...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gw-text-secondary">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => {
              const rowKey = keyExtractor ? keyExtractor(row, rowIdx) : row.id || rowIdx
              return (
                <tr
                  key={rowKey}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      className={`px-4 py-3 text-sm ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                    >
                      {col.render ? col.render(row, rowIdx) : row[col.key]}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

export default Table
