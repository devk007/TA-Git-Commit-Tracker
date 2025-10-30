const headers = [
  { key: 'name', label: 'Name' },
  { key: 'rollNumber', label: 'Roll No' },
  { key: 'totalCommits', label: 'Commits' },
];

const StudentCommitTable = ({ data, sortBy, sortOrder, onSortChange }) => {
  const handleSort = (key) => {
    if (sortBy === key) {
      onSortChange({ sortBy: key, sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      onSortChange({ sortBy: key, sortOrder: 'desc' });
    }
  };

  const renderSortIcon = (key) => {
    if (sortBy !== key) return null;
    return sortOrder === 'asc' ? '▲' : '▼';
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-100/70 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            {headers.map((header) => (
              <th key={header.key} className="cursor-pointer px-4 py-3" onClick={() => handleSort(header.key)}>
                <div className="flex items-center gap-1">
                  <span>{header.label}</span>
                  <span className="text-[10px] text-slate-400">{renderSortIcon(header.key)}</span>
                </div>
              </th>
            ))}
            <th className="px-4 py-3">Repository</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white text-sm">
          {data.map((student) => (
            <tr key={student.studentId} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{student.name}</td>
              <td className="px-4 py-3 text-slate-600">{student.rollNumber}</td>
              <td className="px-4 py-3 font-semibold text-slate-900">{student.totalCommits}</td>
              <td className="px-4 py-3 text-slate-600">
                <a
                  className="text-slate-700 underline-offset-2 hover:text-slate-900 hover:underline"
                  href={student.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {student.repoUrl}
                </a>
              </td>
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                No students match the current filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default StudentCommitTable;
