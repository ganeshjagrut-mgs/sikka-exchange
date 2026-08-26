import { useState, useEffect } from 'react';
import { adminApi } from '../api/adminApi';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';

export default function Transfers() {
  const [users, setUsers] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useToast();

  const [formData, setFormData] = useState({
    user_id: '',
    amount_usdt: '',
    direction: 'OUT',
    to_trade: false,
    notes: '',
  });

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await adminApi.getUsers(1, 500);
      if (response.success) {
        setUsers(response.data.users || []);
      }
    } catch (err) {
      error(err.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await adminApi.getTransferHistory(20);
      if (response.success) {
        setHistory(response.data || []);
      }
    } catch (err) {
      error(err.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchHistory();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.user_id) {
      error('Please select a user');
      return;
    }
    if (!formData.amount_usdt || parseFloat(formData.amount_usdt) <= 0) {
      error('Please enter a valid amount');
      return;
    }

    try {
      setSubmitting(true);
      const response = await adminApi.executeManualTransfer({
        user_id: formData.user_id,
        amount_usdt: parseFloat(formData.amount_usdt),
        direction: formData.direction,
        to_trade: formData.direction === 'OUT' ? formData.to_trade : undefined,
        notes: formData.notes || undefined,
      });
      if (response.success) {
        success(response.message || 'Transfer completed successfully');
        setFormData({
          user_id: '',
          amount_usdt: '',
          direction: 'OUT',
          to_trade: false,
          notes: '',
        });
        fetchHistory();
      }
    } catch (err) {
      error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-IN');
  };

  const historyColumns = [
    {
      key: 'created_at',
      label: 'Date',
      render: (val) => formatDate(val),
    },
    { key: 'admin_username', label: 'Admin' },
    { key: 'user_email', label: 'User' },
    {
      key: 'amount_usdt',
      label: 'Amount',
      render: (val) => `${parseFloat(val || 0).toFixed(2)} USDT`,
    },
    {
      key: 'direction',
      label: 'Direction',
      render: (val) => (
        <span
          className={`px-2 py-1 text-xs rounded ${
            val === 'OUT' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {val}
        </span>
      ),
    },
    { key: 'notes', label: 'Notes' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Manual Fund Transfers</h1>

      <div className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">New Transfer</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User *</label>
              {loadingUsers ? (
                <LoadingSpinner size="sm" />
              ) : (
                <select
                  name="user_id"
                  value={formData.user_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a user</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email} ({user.full_name || 'No name'})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount USDT *</label>
              <input
                type="number"
                name="amount_usdt"
                step="0.01"
                value={formData.amount_usdt}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Direction *</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="direction"
                  value="OUT"
                  checked={formData.direction === 'OUT'}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-sm">OUT (Fund User)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="direction"
                  value="RECLAIM"
                  checked={formData.direction === 'RECLAIM'}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-sm">RECLAIM (Take Back)</span>
              </label>
            </div>
          </div>

          {formData.direction === 'OUT' && (
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="to_trade"
                  checked={formData.to_trade}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  Send to TRADE account (user can trade immediately)
                </span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="e.g., Bonus for first trade"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Execute Transfer'}
            </button>
          </div>
        </form>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Transfer History</h2>
          <button
            onClick={fetchHistory}
            className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
        <DataTable
          columns={historyColumns}
          data={history}
          loading={loadingHistory}
          emptyMessage="No transfer history"
        />
      </div>
    </div>
  );
}
