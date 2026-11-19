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
    <div className={`w-full overflow-x-auto rounded-xl border border-[#1e3a5f]/65 bg-gw-card/60 backdrop-blur-md shadow-lg ${className}`}>
      <table className={`w-full text-left text-sm text-gw-text ${minWidth}`}>
        <thead className="bg-gw-bg-secondary/90 text-xs uppercase tracking-wider text-gw-text-secondary border-b border-[#1e3a5f]/60 sticky top-0 z-10 backdrop-blur-md">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                className={`px-4 py-3.5 font-semibold ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1e3a5f]/40">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-gw-text-secondary">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-6 h-6 border-2 border-gw-cyan border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-mono uppercase tracking-wider">Loading records...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-gw-text-secondary">
                <div className="flex flex-col items-center justify-center gap-2">
                  <p className="text-sm font-medium">{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => {
              const rowKey = keyExtractor ? keyExtractor(row, rowIdx) : row.id || rowIdx
              return (
                <tr
                  key={rowKey}
                  className="hover:bg-white/[0.04] transition-colors duration-150 group"
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      className={`px-4 py-3 text-sm ${
                        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                      }`}
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
