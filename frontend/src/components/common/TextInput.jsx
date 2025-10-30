import classNames from 'classnames';

const TextInput = ({ label, description, error, className, ...props }) => (
  <label className={classNames('flex flex-col gap-1 text-sm text-slate-700', className)}>
    <span className="font-medium">{label}</span>
    <input
      className={classNames(
        'rounded-md border border-slate-200 px-3 py-2 text-base shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200',
        error && 'border-red-500 focus:border-red-500 focus:ring-red-200',
      )}
      {...props}
    />
    {description && <span className="text-xs text-slate-500">{description}</span>}
    {error && <span className="text-xs text-red-500">{error}</span>}
  </label>
);

export default TextInput;
