export default function StatsCard({ title, value, subtitle, color = 'blue' }) {
  const colors = {
    blue: 'border-l-blue-500',
    green: 'border-l-green-500',
    yellow: 'border-l-yellow-500',
    red: 'border-l-red-500',
    purple: 'border-l-purple-500',
  };

  return (
    <div className={`bg-white rounded-lg border border-l-4 ${colors[color]} p-4`}>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}
