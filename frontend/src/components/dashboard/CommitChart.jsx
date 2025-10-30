import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const CommitChart = ({ data }) => (
  <div className="h-72 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip
          cursor={{ fill: 'rgba(148, 163, 184, 0.15)' }}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
          }}
        />
        <Bar dataKey="totalCommits" fill="#0f172a" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default CommitChart;
