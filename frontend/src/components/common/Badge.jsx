import classNames from 'classnames';

const variants = {
  slate: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-100 text-emerald-700',
  blue: 'bg-blue-100 text-blue-700',
};

const Badge = ({ variant = 'slate', children, className }) => (
  <span
    className={classNames(
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
      variants[variant],
      className,
    )}
  >
    {children}
  </span>
);

export default Badge;
