import { useState, useEffect } from 'react';
import { adminApi } from '../api/adminApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';

export default function Withdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [failedReason, setFailedReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useToast();

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getPendingWithdrawals();
      if (response.success) {
        setWithdrawals(response.data || []);
      }
    } catch (err) {
      error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const openCompleteModal = (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setModalType('complete');
    setUtrNumber('');
    setAdminNotes('');
  };

  const openRejectModal = (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setModalType('reject');
    setFailedReason('');
    setAdminNotes('');
  };

  const closeModal = () => {
    setSelectedWithdrawal(null);
    setModalType(null);
  };

  const handleComplete = async () => {
    try {
      setSubmitting(true);
      const response = await adminApi.completeWithdrawal(selectedWithdrawal.id, {
        utr_number: utrNumber || undefined,
        admin_notes: adminNotes || undefined,
      });
      if (response.success) {
        success('Withdrawal completed successfully');
        closeModal();
        fetchWithdrawals();
      }
    } catch (err) {
      error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!failedReason.trim()) {
      error('Please provide a reason');
      return;
    }
    try {
      setSubmitting(true);
      const response = await adminApi.failWithdrawal(selectedWithdrawal.id, {
        failed_reason: failedReason,
        admin_notes: adminNotes || undefined,
      });
      if (response.success) {
        success('Withdrawal rejected');
        closeModal();
        fetchWithdrawals();
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

  const formatINR = (value) => {
    const num = parseFloat(value) || 0;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const columns = [
    { key: 'user_email', label: 'User Email' },
    {
      key: 'amount_inr',
      label: 'Amount INR',
      render: (val) => formatINR(val),
    },
    {
      key: 'amount_usdt',
      label: 'Amount USDT',
      render: (val) => `${parseFloat(val || 0).toFixed(2)} USDT`,
    },
    {
      key: 'bank',
      label: 'Bank Details',
      render: (_, row) => (
        <div className="text-xs">
          <div>{row.bank_name || '-'}</div>
          <div className="text-gray-500">{row.account_number}</div>
          <div className="text-gray-500">{row.ifsc_code}</div>
        </div>
      ),
    },
    { key: 'status', label: 'Status' },
    {
      key: 'requested_at',
      label: 'Requested At',
      render: (val) => formatDate(val),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openCompleteModal(row);
            }}
            className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
          >
            Complete
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openRejectModal(row);
            }}
            className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
          >
            Reject
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Withdrawal Management</h1>
        <button
          onClick={fetchWithdrawals}
          className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <DataTable
        columns={columns}
        data={withdrawals}
        loading={loading}
        emptyMessage="No pending withdrawals"
      />

      <Modal
        isOpen={modalType === 'complete'}
        onClose={closeModal}
        title="Complete Withdrawal"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              User: <span className="font-medium">{selectedWithdrawal?.user_email}</span>
            </p>
            <p className="text-sm text-gray-600">
              Amount: <span className="font-medium">{formatINR(selectedWithdrawal?.amount_inr)}</span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              UTR Number (optional)
            </label>
            <input
              type="text"
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Notes (optional)
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={closeModal}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleComplete}
              disabled={submitting}
              className="px-4 py-2 text-sm text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Complete Withdrawal'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modalType === 'reject'} onClose={closeModal} title="Reject Withdrawal">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              User: <span className="font-medium">{selectedWithdrawal?.user_email}</span>
            </p>
            <p className="text-sm text-gray-600">
              Amount: <span className="font-medium">{formatINR(selectedWithdrawal?.amount_inr)}</span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Rejection *
            </label>
            <textarea
              value={failedReason}
              onChange={(e) => setFailedReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Notes (optional)
            </label>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={closeModal}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={submitting}
              className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Reject Withdrawal'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
