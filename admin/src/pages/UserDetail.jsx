import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import DataTable from '../components/DataTable';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [kyc, setKyc] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingTxns, setLoadingTxns] = useState(true);
  const [txnFilter, setTxnFilter] = useState('all');
  const { error } = useToast();

  const fetchUser = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getUserById(id);
      if (response.success) {
        setUser(response.data.user);
        setKyc(response.data.kyc);
      }
    } catch (err) {
      error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (type = 'all') => {
    try {
      setLoadingTxns(true);
      const response = await adminApi.getUserTransactions(id, type, 100);
      if (response.success) {
        setTransactions(response.data || []);
      }
    } catch (err) {
      error(err.message);
    } finally {
      setLoadingTxns(false);
    }
  };

  useEffect(() => {
    fetchUser();
    fetchTransactions();
  }, [id]);

  useEffect(() => {
    fetchTransactions(txnFilter);
  }, [txnFilter]);

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-IN');
  };

  const getKycStatusBadge = (status) => {
    const styles = {
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {status || 'not_submitted'}
      </span>
    );
  };

  const getTypeBadge = (type) => {
    const styles = {
      deposit: 'bg-green-100 text-green-800',
      withdrawal: 'bg-red-100 text-red-800',
      trade: 'bg-blue-100 text-blue-800',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded ${styles[type] || 'bg-gray-100 text-gray-800'}`}>
        {type}
      </span>
    );
  };

  const txnColumns = [
    {
      key: 'type',
      label: 'Type',
      render: (val) => getTypeBadge(val),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (val, row) => {
        if (row.type === 'deposit' || row.type === 'withdrawal') {
          return `₹${parseFloat(val || 0).toLocaleString('en-IN')}`;
        }
        return `${parseFloat(val || 0).toFixed(4)} ${row.symbol || ''}`;
      },
    },
    { key: 'status', label: 'Status' },
    {
      key: 'created_at',
      label: 'Date',
      render: (val) => formatDate(val),
    },
  ];

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">User not found</p>
        <button
          onClick={() => navigate('/users')}
          className="mt-4 px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Back to Users
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/users')}
          className="text-gray-500 hover:text-gray-700"
        >
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Information</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Email</dt>
              <dd className="text-sm font-medium text-gray-900">{user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Phone</dt>
              <dd className="text-sm font-medium text-gray-900">{user.phone || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Name</dt>
              <dd className="text-sm font-medium text-gray-900">{user.full_name || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">KuCoin UID</dt>
              <dd className="text-sm font-medium text-gray-900 font-mono">
                {user.kucoin_sub_account_uid || '-'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Created</dt>
              <dd className="text-sm font-medium text-gray-900">{formatDate(user.created_at)}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">KYC Information</h2>
          {kyc ? (
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Status</dt>
                <dd>{getKycStatusBadge(kyc.status)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Full Name</dt>
                <dd className="text-sm font-medium text-gray-900">{kyc.full_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Date of Birth</dt>
                <dd className="text-sm font-medium text-gray-900">{kyc.date_of_birth || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">ID Type</dt>
                <dd className="text-sm font-medium text-gray-900">{kyc.id_type || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">ID Number</dt>
                <dd className="text-sm font-medium text-gray-900 font-mono">{kyc.id_number || '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Address</dt>
                <dd className="text-sm font-medium text-gray-900 text-right max-w-[200px]">
                  {kyc.address || '-'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Submitted</dt>
                <dd className="text-sm font-medium text-gray-900">{formatDate(kyc.submitted_at)}</dd>
              </div>
              {kyc.rejection_reason && (
                <div className="pt-2 border-t">
                  <dt className="text-sm text-gray-500 mb-1">Rejection Reason</dt>
                  <dd className="text-sm text-red-600">{kyc.rejection_reason}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-gray-500">KYC not submitted</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
          <div className="flex gap-2">
            {['all', 'deposits', 'withdrawals', 'trades'].map((filter) => (
              <button
                key={filter}
                onClick={() => setTxnFilter(filter)}
                className={`px-3 py-1 text-sm rounded ${
                  txnFilter === filter
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <DataTable
          columns={txnColumns}
          data={transactions}
          loading={loadingTxns}
          emptyMessage="No transactions found"
        />
      </div>
    </div>
  );
}
