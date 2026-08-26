import LoadingSpinner from './LoadingSpinner';

export default function DataTable({
  columns,
  data,
  loading,
  emptyMessage = 'No data found',
  onRowClick,
}) {
  if (loading) {
    return <LoadingSpinner />;
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 bg-white rounded-lg border">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg border">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, idx) => (
            <tr
              key={row.id || idx}
              onClick={() => onRowClick && onRowClick(row)}
              className={`${
                onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''
              } ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  {col.render ? col.render(row[col.key], row) : row[col.key] || '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
