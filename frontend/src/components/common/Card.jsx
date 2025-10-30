import classNames from 'classnames';

const Card = ({ className, children }) => (
  <div className={classNames('rounded-lg border border-slate-200 bg-white shadow-sm', className)}>
    {children}
  </div>
);

export default Card;
