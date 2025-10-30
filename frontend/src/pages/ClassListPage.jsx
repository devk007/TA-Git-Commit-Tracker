import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button.jsx';
import TextInput from '../components/common/TextInput.jsx';
import Card from '../components/common/Card.jsx';
import Spinner from '../components/common/Spinner.jsx';
import { createClass, listClasses } from '../services/classService.js';
import { useAdmin } from '../context/AdminContext.jsx';

const ClassListPage = () => {
  const { isAdmin } = useAdmin();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listClasses();
      setClasses(data);
    } catch (err) {
      setError(err.message || 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleCreateClass = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Class name is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await createClass({ name: form.name.trim(), description: form.description.trim() });
      setForm({ name: '', description: '' });
      await loadClasses();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to create class');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {isAdmin ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900">Create a Class</h2>
          <p className="mt-1 text-sm text-slate-500">Set up a class to manage student repositories.</p>
          <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={handleCreateClass}>
            <TextInput
              label="Class Name"
              placeholder="Section A"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
            <TextInput
              label="Description"
              placeholder="Optional"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            />
            <div className="md:col-span-2 flex items-center justify-end gap-3">
              {error && <span className="text-sm text-red-500">{error}</span>}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create Class'}
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900">View Only Mode</h2>
          <p className="mt-1 text-sm text-slate-500">
            Log in with the admin token to create and manage classes. You currently have read-only
            access.
          </p>
        </Card>
      )}

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Classes</h2>
          <Button variant="ghost" onClick={loadClasses} disabled={loading}>
            Refresh
          </Button>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Select a class to upload students, trigger syncs, and view dashboards.
        </p>

        {loading ? (
          <div className="mt-10 flex justify-center">
            <Spinner />
          </div>
        ) : error ? (
          <p className="mt-6 rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        ) : classes.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">No classes yet. Create one to get started.</p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {classes.map((item) => (
              <Card key={item._id} className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{item.name}</h3>
                    {item.description && (
                      <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    Created {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button variant="secondary" as={Link} to={`/classes/${item._id}`}>
                    View Class
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ClassListPage;
