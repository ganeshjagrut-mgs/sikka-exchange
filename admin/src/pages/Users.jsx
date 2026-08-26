import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/adminApi';
import DataTable from '../components/DataTable';
import { useToast } from '../context/ToastContext';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();
  const { error } = useToast();

  const fetchUsers = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await adminApi.getUsers(pageNum, 20);
      if (response.success) {
        setUsers(response.data.users || []);
        setTotalPages(response.data.totalPages || 1);
        setPage(pageNum);
      }
    } catch (err) {
      error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN');
  };

  const getKycStatusBadge = (status) => {
    const styles = {
      approved: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      rejected: 'bg-red-100 text-red-800',
      not_submitted: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded ${styles[status] || styles.not_submitted}`}>
        {status || 'not_submitted'}
      </span>
    );
  };

  const columns = [
    { key: 'email', label: 'Email' },
    { key: 'full_name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    {
      key: 'kyc_status',
      label: 'KYC Status',
      render: (val) => getKycStatusBadge(val),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (val) => formatDate(val),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={() => fetchUsers(page)}
          className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="No users found"
        onRowClick={(user) => navigate(`/users/${user.id}`)}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => fetchUsers(page - 1)}
            disabled={page <= 1 || loading}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => fetchUsers(page + 1)}
            disabled={page >= totalPages || loading}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
