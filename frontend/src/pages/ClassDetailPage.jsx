import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import Card from '../components/common/Card.jsx';
import Spinner from '../components/common/Spinner.jsx';
import StudentForm from '../components/students/StudentForm.jsx';
import StudentTable from '../components/students/StudentTable.jsx';
import DashboardFilters from '../components/dashboard/DashboardFilters.jsx';
import CommitChart from '../components/dashboard/CommitChart.jsx';
import StudentCommitTable from '../components/dashboard/StudentCommitTable.jsx';
import { useAdmin } from '../context/AdminContext.jsx';
import {
  addStudent,
  deleteStudent,
  fetchClassById,
  fetchDashboard,
  triggerSync,
  updateStudent,
  uploadRoster,
  downloadRoster,
  downloadDashboard,
} from '../services/classService.js';

const defaultFilters = {
  groupType: 'courseWork',
  days: 7,
  sortBy: 'totalCommits',
  sortOrder: 'desc',
  search: '',
  minCommits: '',
  maxCommits: '',
};

const ChevronDownIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronUpIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="none"
    className={className}
    aria-hidden="true"
  >
    <path d="M5 12l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ClassDetailPage = () => {
  const { classId } = useParams();
  const fileInputRef = useRef(null);
  const editFormRef = useRef(null);
  const { isAdmin } = useAdmin();

  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState(defaultFilters);
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isExportingDashboard, setIsExportingDashboard] = useState(false);
  const [isRosterCollapsed, setIsRosterCollapsed] = useState(true);
  const [rosterSearch, setRosterSearch] = useState('');

  const filteredStudents = useMemo(() => {
    const query = rosterSearch.trim().toLowerCase();
    if (!query) {
      return students;
    }

    return students.filter((student) => {
      const fields = [student.name, student.rollNumber, student.repoUrl, student.groupType];
      return fields
        .filter((value) => value !== undefined && value !== null)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [students, rosterSearch]);

  const rosterCountLabel = rosterSearch.trim()
    ? `${filteredStudents.length} of ${students.length} students`
    : `${students.length} students`;

  const showMessage = (type, text) => {
    setActionMessage({ type, text });
  };

  const loadClass = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClassById(classId, { includeStudents: true });
      setClassInfo({
        _id: data._id,
        name: data.name,
        description: data.description,
        studentsUploaded: data.studentsUploaded,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
      setStudents(data.students || []);
      setRosterSearch('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load class details');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async (overrides = {}) => {
    setDashboardLoading(true);
    try {
      const params = { ...filters, ...overrides };
      if (!params.days || params.days < 1) {
        params.days = 7;
      }

      const trimmedSearch = typeof params.search === 'string' ? params.search.trim() : '';
      if (trimmedSearch) {
        params.search = trimmedSearch;
      } else {
        delete params.search;
      }

      const normalizeCommitValue = (value) => {
        if (value === undefined || value === null || value === '') {
          return undefined;
        }
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      };

      const minValue = normalizeCommitValue(params.minCommits);
      const maxValue = normalizeCommitValue(params.maxCommits);

      if (minValue !== undefined) {
        params.minCommits = minValue;
      } else {
        delete params.minCommits;
      }

      if (maxValue !== undefined) {
        params.maxCommits = maxValue;
      } else {
        delete params.maxCommits;
      }

      const data = await fetchDashboard(classId, params);
      setDashboard(data);
    } catch (err) {
      showMessage('error', err.response?.data?.message || err.message || 'Failed to load dashboard');
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    if (classId) {
      loadClass();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  useEffect(() => {
    if (classId) {
      loadDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    classId,
    filters.groupType,
    filters.days,
    filters.sortBy,
    filters.sortOrder,
    filters.search,
    filters.minCommits,
    filters.maxCommits,
  ]);

  useEffect(() => {
    if (editingStudent && editFormRef.current) {
      editFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [editingStudent]);

  useEffect(() => {
    if (!isAdmin) {
      setIsAdding(false);
      setEditingStudent(null);
    }
  }, [isAdmin]);

  const handleUpload = async (event) => {
    if (!isAdmin) {
      showMessage('error', 'Admin access required to upload students.');
      event.target.value = '';
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setActionMessage(null);
      const result = await uploadRoster(classId, file);
      const insertedCount = Number(result?.insertedCount ?? 0);
      const skippedCount = Number(result?.skippedExisting ?? 0);
      const messageParts = [];
      if (result?.message) {
        messageParts.push(result.message);
      }
      if (insertedCount > 0) {
        messageParts.push(`Added ${insertedCount} new student${insertedCount === 1 ? '' : 's'}.`);
      }
      if (skippedCount > 0) {
        messageParts.push(
          `Skipped ${skippedCount} existing entr${skippedCount === 1 ? 'y' : 'ies'}.`,
        );
      }

      const successMessage =
        messageParts.join(' ').trim() || 'Student roster uploaded successfully.';
      showMessage('success', successMessage);
      await loadClass();
      await loadDashboard();
    } catch (err) {
      showMessage('error', err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      event.target.value = '';
    }
  };

  const handleAddStudent = async (payload) => {
    if (!isAdmin) {
      showMessage('error', 'Admin access required to add students.');
      return;
    }

    const student = await addStudent(classId, payload);
    setStudents((prev) => [...prev, student]);
    setIsAdding(false);
    showMessage('success', 'Student added successfully.');
  };

  const handleUpdateStudent = async (payload) => {
    if (!isAdmin) {
      showMessage('error', 'Admin access required to update students.');
      return;
    }

    const student = await updateStudent(classId, editingStudent._id, payload);
    setStudents((prev) => prev.map((item) => (item._id === student._id ? student : item)));
    setEditingStudent(null);
    showMessage('success', 'Student updated successfully.');
  };

  const handleDeleteStudent = async (student) => {
    if (!isAdmin) {
      showMessage('error', 'Admin access required to remove students.');
      return;
    }

    const confirmed = window.confirm(`Remove ${student.name}?`);
    if (!confirmed) return;

    try {
      await deleteStudent(classId, student._id);
      setStudents((prev) => prev.filter((item) => item._id !== student._id));
      showMessage('success', 'Student removed successfully.');
      await loadDashboard();
    } catch (err) {
      showMessage('error', err.response?.data?.message || err.message || 'Failed to remove student');
    }
  };

  const handleSync = async () => {
    if (!isAdmin) {
      showMessage('error', 'Admin access required to trigger sync.');
      return;
    }

    try {
      setIsSyncing(true);
      setActionMessage(null);
      const syncWindow = filters.days && filters.days > 0 ? filters.days : 7;
      await triggerSync(classId, { days: syncWindow });
      showMessage('success', 'Commit sync triggered. Refresh dashboard to see new data.');
      await loadDashboard();
    } catch (err) {
      showMessage('error', err.response?.data?.message || err.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadRoster = async () => {
    try {
      setIsDownloading(true);
      const response = await downloadRoster(classId);

      const blob = new Blob([response.data], {
        type:
          response.headers['content-type'] ||
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      let filename = `${classInfo?.name || 'class'}_students.xlsx`;
      const disposition = response.headers['content-disposition'];
      if (disposition) {
        const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
        const encoded = match?.[1];
        const quoted = match?.[2];
        if (encoded) {
          try {
            filename = decodeURIComponent(encoded);
          } catch (error) {
            filename = encoded;
          }
        } else if (quoted) {
          filename = quoted;
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showMessage('success', 'Student roster downloaded.');
    } catch (err) {
      showMessage('error', err.response?.data?.message || err.message || 'Failed to download roster');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadDashboard = async () => {
    try {
      setIsExportingDashboard(true);
      const params = {
        groupType: filters.groupType,
        days: filters.days && filters.days > 0 ? filters.days : 7,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };
      const trimmedSearch = filters.search?.trim();
      if (trimmedSearch) {
        params.search = trimmedSearch;
      }
      const minValue = filters.minCommits !== '' ? Number(filters.minCommits) : undefined;
      const maxValue = filters.maxCommits !== '' ? Number(filters.maxCommits) : undefined;

      if (Number.isFinite(minValue)) {
        params.minCommits = minValue;
      }
      if (Number.isFinite(maxValue)) {
        params.maxCommits = maxValue;
      }
      const response = await downloadDashboard(classId, params);

      const blob = new Blob([response.data], {
        type:
          response.headers['content-type'] ||
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      let filename = `commit_dashboard_${filters.groupType}_${filters.days}d.xlsx`;
      const disposition = response.headers['content-disposition'];
      if (disposition) {
        const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
        const encoded = match?.[1];
        const quoted = match?.[2];
        if (encoded) {
          try {
            filename = decodeURIComponent(encoded);
          } catch (error) {
            filename = encoded;
          }
        } else if (quoted) {
          filename = quoted;
        }
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showMessage('success', 'Commit dashboard exported.');
    } catch (err) {
      showMessage('error', err.response?.data?.message || err.message || 'Failed to download commit data');
    } finally {
      setIsExportingDashboard(false);
    }
  };

  const handleFiltersChange = (nextFilters) => {
    setFilters((prev) => ({ ...prev, ...nextFilters }));
  };

  const handleSortChange = ({ sortBy, sortOrder }) => {
    setFilters((prev) => ({ ...prev, sortBy, sortOrder }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <p className="rounded-md bg-red-50 px-4 py-3 text-red-600">{error}</p>;
  }

  return (
    <div className="space-y-8">
      <input ref={fileInputRef} className="hidden" type="file" accept=".xls,.xlsx" onChange={handleUpload} />

      <Card className="p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">{classInfo.name}</h2>
            {classInfo.description && (
              <p className="mt-1 max-w-xl text-sm text-slate-600">{classInfo.description}</p>
            )}
            <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
              Created {new Date(classInfo.createdAt).toLocaleDateString()}
            </p>
            {!isAdmin && (
              <p className="mt-2 max-w-xl text-sm text-slate-500">
                You have read-only access. Log in as an admin to upload rosters, modify students, or
                trigger sync jobs.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => loadDashboard()} disabled={dashboardLoading}>
              {dashboardLoading ? 'Refreshing…' : 'Refresh Dashboard'}
            </Button>
            {isAdmin && (
              <>
                <Button onClick={handleSync} disabled={isSyncing}>
                  {isSyncing ? 'Syncing…' : 'Sync Commits'}
                </Button>
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  Upload Student Excel
                </Button>
                <Button variant="ghost" onClick={() => setIsAdding((prev) => !prev)}>
                  {isAdding ? 'Close Form' : 'Add Student'}
                </Button>
              </>
            )}
          </div>
        </div>
        {actionMessage && (
          <p
            className={`mt-4 rounded-md px-4 py-2 text-sm ${
              actionMessage.type === 'error'
                ? 'bg-red-50 text-red-700'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            {actionMessage.text}
          </p>
        )}
      </Card>

      {isAdmin && isAdding && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900">Add Student</h3>
          <p className="mt-1 text-sm text-slate-500">Students can also be added manually after the first upload.</p>
          <div className="mt-4">
            <StudentForm onSubmit={handleAddStudent} onCancel={() => setIsAdding(false)} submitLabel="Add Student" />
          </div>
        </Card>
      )}

      {isAdmin && editingStudent && (
        <Card className="p-6">
          <div ref={editFormRef}>
            <h3 className="text-lg font-semibold text-slate-900">Edit Student</h3>
            <div className="mt-4">
              <StudentForm
                initialValues={editingStudent}
                onSubmit={handleUpdateStudent}
                onCancel={() => setEditingStudent(null)}
                submitLabel="Update Student"
              />
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Student Roster</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">{rosterCountLabel}</span>
              <Button
                variant="secondary"
                onClick={handleDownloadRoster}
                disabled={isDownloading || students.length === 0}
              >
                {isDownloading ? 'Preparing…' : 'Download Excel'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setIsRosterCollapsed((prev) => !prev)}
                type="button"
                className="h-9 w-9 gap-0 p-0 text-slate-600"
                aria-label={isRosterCollapsed ? 'Expand roster' : 'Collapse roster'}
                title={isRosterCollapsed ? 'Expand roster' : 'Collapse roster'}
              >
                {isRosterCollapsed ? (
                  <ChevronDownIcon className="h-4 w-4" />
                ) : (
                  <ChevronUpIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Upload spreadsheets anytime to append new students. Existing entries stay untouched.
          </p>
        </div>

        {!isRosterCollapsed && (
          <>
            {students.length === 0 ? (
              <p className="mt-6 text-sm text-slate-500">
                No students yet. Upload a roster or add manually.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label className="relative block w-full text-sm sm:max-w-xs">
                    <span className="sr-only">Search students</span>
                    <input
                      type="search"
                      value={rosterSearch}
                      onChange={(event) => setRosterSearch(event.target.value)}
                      placeholder="Search students..."
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                    />
                  </label>
                </div>

                {filteredStudents.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No students match your search.
                  </p>
                ) : (
                  <StudentTable
                    students={filteredStudents}
                    canManage={isAdmin}
                    onEdit={isAdmin ? (student) => setEditingStudent(student) : undefined}
                    onDelete={isAdmin ? handleDeleteStudent : undefined}
                  />
                )}
              </div>
            )}
          </>
        )}
      </Card>

      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Commit Dashboard</h3>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={handleDownloadDashboard} disabled={isExportingDashboard || !dashboard?.students?.length}>
              {isExportingDashboard ? 'Preparing…' : 'Download Excel'}
            </Button>
            <Button variant="secondary" onClick={() => loadDashboard()} disabled={dashboardLoading}>
              {dashboardLoading ? 'Refreshing…' : 'Reload'}
            </Button>
          </div>
        </div>
        <DashboardFilters
          filters={filters}
          onChange={handleFiltersChange}
          onRefresh={() => loadDashboard()}
          isLoading={dashboardLoading}
        />

        {dashboardLoading ? (
          <div className="py-16">
            <Spinner />
          </div>
        ) : !dashboard ? (
          <p className="text-sm text-slate-500">Dashboard data unavailable.</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Average Commits</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{dashboard.averageCommits}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total Commits</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{dashboard.totalCommits}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Students Tracked</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{dashboard.studentCount}</p>
              </Card>
            </div>

            <CommitChart data={dashboard.students} />

            <StudentCommitTable
              data={dashboard.students}
              sortBy={dashboard.sortBy}
              sortOrder={dashboard.sortOrder}
              onSortChange={handleSortChange}
            />
          </>
        )}
      </Card>
    </div>
  );
};

export default ClassDetailPage;
