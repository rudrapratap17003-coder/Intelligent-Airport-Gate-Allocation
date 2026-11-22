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
    <div className={`w-full overflow-x-auto rounded-xl border border-[#333333] bg-[#181818] shadow-sm ${className}`}>
      <table className={`w-full text-left text-sm text-[#FFFFFF] ${minWidth}`}>
        <thead className="bg-[#111111] text-xs uppercase tracking-wider text-[#A3A3A3] border-b border-[#333333] sticky top-0 z-10">
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
        <tbody className="divide-y divide-[#333333]/50">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-[#A3A3A3]">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-mono uppercase tracking-wider">Loading records...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-[#A3A3A3]">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="text-sm font-medium">{emptyMessage}</div>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => {
              const rowKey = keyExtractor ? keyExtractor(row, rowIdx) : row.id || rowIdx
              return (
                <tr
                  key={rowKey}
                  className="hover:bg-[#2A2A2A] transition-colors duration-150 group"
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
