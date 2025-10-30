import Button from '../common/Button.jsx';
import TextInput from '../common/TextInput.jsx';

const PRESET_WINDOWS = [7, 14, 30];

const DashboardFilters = ({ filters, onChange, onRefresh, isLoading }) => {
  const handleGroupChange = (groupType) => {
    onChange({ ...filters, groupType });
  };

  const handleWindowChange = (days) => {
    onChange({ ...filters, days });
  };

  const handleCustomDays = (event) => {
    const value = Number(event.target.value) || 0;
    onChange({ ...filters, days: value });
  };

  const handleSearchChange = (event) => {
    onChange({ ...filters, search: event.target.value });
  };

  const handleMinChange = (event) => {
    onChange({ ...filters, minCommits: event.target.value });
  };

  const handleMaxChange = (event) => {
    onChange({ ...filters, maxCommits: event.target.value });
  };

  const clearCommitFilters = () => {
    onChange({ ...filters, minCommits: '', maxCommits: '' });
  };

  const hasCommitFilter = Boolean(filters.minCommits || filters.maxCommits);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Group</span>
            <div className="flex gap-2">
              <Button
                variant={filters.groupType === 'courseWork' ? 'primary' : 'secondary'}
                onClick={() => handleGroupChange('courseWork')}
              >
                Course Work
              </Button>
              <Button
                variant={filters.groupType === 'personalProjects' ? 'primary' : 'secondary'}
                onClick={() => handleGroupChange('personalProjects')}
              >
                Personal Projects
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase text-slate-500">Time Range</span>
            <div className="flex flex-wrap gap-2">
              {PRESET_WINDOWS.map((preset) => (
                <Button
                  key={preset}
                  variant={filters.days === preset ? 'primary' : 'secondary'}
                  onClick={() => handleWindowChange(preset)}
                >
                  Last {preset} days
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <TextInput
              label="Custom Days"
              type="number"
              min={1}
              value={filters.days}
              onChange={handleCustomDays}
            />
          </div>
        </div>
        <Button onClick={onRefresh} disabled={isLoading}>
          {isLoading ? 'Refreshing…' : 'Refresh Dashboard'}
        </Button>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-4">
          <div className="w-full max-w-xs">
            <TextInput
              label="Search Students"
              placeholder="Name or roll no"
              value={filters.search || ''}
              onChange={handleSearchChange}
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <TextInput
              label="Min commits (>=)"
              type="number"
              min={0}
              value={filters.minCommits ?? ''}
              onChange={handleMinChange}
            />
            <TextInput
              label="Max commits (<=)"
              type="number"
              min={0}
              value={filters.maxCommits ?? ''}
              onChange={handleMaxChange}
            />
            <Button variant="ghost" onClick={clearCommitFilters} disabled={!hasCommitFilter}>
              Clear Count Filter
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardFilters;
