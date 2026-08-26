import { useState, useEffect } from 'react';
import { adminApi } from '../api/adminApi';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
        Error: {error}
      </div>
    );
  }

  const formatINR = (value) => {
    const num = parseFloat(value) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatUSDT = (value) => {
    const num = parseFloat(value) || 0;
    return `${num.toFixed(2)} USDT`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button
          onClick={fetchStats}
          className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatsCard title="Total Users" value={stats?.totalUsers || 0} color="blue" />
        <StatsCard
          title="Pending KYC"
          value={stats?.pendingKYC || 0}
          color="yellow"
        />
        <StatsCard
          title="Approved KYC"
          value={stats?.approvedKYC || 0}
          color="green"
        />
        <StatsCard
          title="Total Deposits"
          value={formatINR(stats?.totalDeposits)}
          color="green"
        />
        <StatsCard
          title="Total Withdrawals"
          value={formatINR(stats?.totalWithdrawals)}
          color="red"
        />
        <StatsCard
          title="Pending Withdrawals"
          value={stats?.pendingWithdrawals || 0}
          color="yellow"
        />
        <StatsCard
          title="Total Trades"
          value={stats?.totalTrades || 0}
          color="purple"
        />
        <StatsCard
          title="Platform Revenue"
          value={formatINR(stats?.platformRevenue)}
          color="green"
        />
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Broker Balance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Total USDT"
            value={formatUSDT(stats?.brokerBalance?.usdt)}
            subtitle={`~ ${formatINR(stats?.brokerBalance?.inr)}`}
            color="green"
          />
          <StatsCard
            title="MAIN Account"
            value={formatUSDT(stats?.brokerBalance?.main)}
            color="blue"
          />
          <StatsCard
            title="TRADE Account"
            value={formatUSDT(stats?.brokerBalance?.trade)}
            color="purple"
          />
        </div>
      </div>

      <div className="mt-6 p-4 bg-white rounded-lg border">
        <p className="text-sm text-gray-500">
          Current Conversion Rate:{' '}
          <span className="font-semibold text-gray-900">
            1 USDT = {stats?.conversionRate || '-'} INR
          </span>
        </p>
      </div>
    </div>
  );
}
