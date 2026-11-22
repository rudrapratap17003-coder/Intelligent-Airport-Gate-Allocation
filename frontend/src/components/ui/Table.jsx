import React from 'react'

const TableComponent = ({
  columns = [],
  data = [],
  keyExtractor,
  emptyMessage = 'No records found',
  className = '',
  loading = false,
  minWidth = 'min-w-[640px]',
}) => {
  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-[#222E42] bg-[#121826] shadow-sm ${className}`}>
      <table className={`w-full text-left text-sm text-[#F8FAFC] ${minWidth}`}>
        <thead className="bg-[#0D121F] text-xs uppercase tracking-wider text-[#94A3B8] border-b border-[#222E42] sticky top-0 z-10">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.key || idx}
                scope="col"
                className={`px-4 py-3.5 font-semibold ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#222E42]/60">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-[#94A3B8]">
                <div className="flex flex-col items-center justify-center gap-3">
                  <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  <span className="text-xs font-mono uppercase tracking-wider">Loading records...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-[#94A3B8]">
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
                  className="hover:bg-[#1A2337] transition-colors duration-150 group"
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

export const Table = React.memo(TableComponent)
export default Table
