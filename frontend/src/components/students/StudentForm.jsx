import { useState } from 'react';
import TextInput from '../common/TextInput.jsx';
import Button from '../common/Button.jsx';

const GROUP_OPTIONS = [
  { value: 'courseWork', label: 'Course Work' },
  { value: 'personalProjects', label: 'Personal Projects' },
];

const StudentForm = ({ initialValues, onSubmit, onCancel, submitLabel = 'Save Student' }) => {
  const [form, setForm] = useState({
    name: initialValues?.name || '',
    rollNumber: initialValues?.rollNumber || '',
    repoUrl: initialValues?.repoUrl || '',
    groupType: initialValues?.groupType || 'courseWork',
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.rollNumber.trim() || !form.repoUrl.trim()) {
      setError('All fields are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        ...form,
        name: form.name.trim(),
        rollNumber: form.rollNumber.trim(),
        repoUrl: form.repoUrl.trim(),
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to save student');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          label="Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
        />
        <TextInput
          label="Roll Number"
          name="rollNumber"
          value={form.rollNumber}
          onChange={handleChange}
          required
        />
        <TextInput
          label="Repository URL"
          name="repoUrl"
          value={form.repoUrl}
          onChange={handleChange}
          required
        />
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          <span className="font-medium">Group Type</span>
          <select
            className="rounded-md border border-slate-200 px-3 py-2 text-base shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            name="groupType"
            value={form.groupType}
            onChange={handleChange}
          >
            {GROUP_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default StudentForm;
