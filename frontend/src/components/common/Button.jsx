import classNames from 'classnames';

const baseStyles =
  'inline-flex items-center justify-center gap-2 rounded-md border border-transparent px-3 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-not-allowed disabled:opacity-60';

const variants = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800',
  secondary: 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:text-slate-900',
  danger: 'bg-red-600 text-white hover:bg-red-500',
  ghost: 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100',
};

const Button = ({ as: Component = 'button', variant = 'primary', className, ...props }) => (
  <Component className={classNames(baseStyles, variants[variant], className)} {...props} />
);

export default Button;
