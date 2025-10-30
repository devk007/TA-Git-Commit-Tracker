import Button from '../common/Button.jsx';
import Badge from '../common/Badge.jsx';

const groupCopy = {
  courseWork: 'Course Work',
  personalProjects: 'Personal Projects',
};

const StudentTable = ({ students, onEdit, onDelete, canManage = false }) => (
  <div className="overflow-hidden rounded-lg border border-slate-200">
    <table className="min-w-full divide-y divide-slate-200">
      <thead className="bg-slate-100/70">
        <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <th className="px-4 py-3">Name</th>
          <th className="px-4 py-3">Roll No</th>
          <th className="px-4 py-3">Group</th>
          <th className="px-4 py-3">Repository</th>
          {canManage && <th className="px-4 py-3 text-right">Actions</th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white text-sm">
        {students.map((student) => (
          <tr key={student._id} className="hover:bg-slate-50">
            <td className="px-4 py-3 font-medium text-slate-900">{student.name}</td>
            <td className="px-4 py-3 text-slate-600">{student.rollNumber}</td>
            <td className="px-4 py-3">
              <Badge variant="blue">{groupCopy[student.groupType]}</Badge>
            </td>
            <td className="px-4 py-3 text-slate-600">
              <a
                href={student.repoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-slate-700 underline-offset-2 hover:text-slate-900 hover:underline"
              >
                {student.repoUrl}
              </a>
            </td>
            {canManage && (
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => onEdit?.(student)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => onDelete?.(student)}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default StudentTable;
