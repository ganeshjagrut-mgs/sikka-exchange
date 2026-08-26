import { useState, useEffect } from 'react';
import { adminApi } from '../api/adminApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../context/ToastContext';

export default function DepositsManual() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useToast();

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getPendingApprovalDeposits();
      if (response.success) {
        setDeposits(response.data || []);
      }
    } catch (err) {
      error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, []);

  const openApproveConfirm = (deposit) => {
    setSelectedDeposit(deposit);
    setShowApproveConfirm(true);
  };

  const openRejectModal = (deposit) => {
    setSelectedDeposit(deposit);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      const response = await adminApi.approveDeposit(selectedDeposit.id);
      if (response.success) {
        success('Deposit approved. Now transfer USDT from Cashfree Deposits page.');
        setShowApproveConfirm(false);
        fetchDeposits();
      }
    } catch (err) {
      error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      error('Please provide a reason');
      return;
    }
    try {
      setSubmitting(true);
      const response = await adminApi.rejectDeposit(selectedDeposit.id, rejectReason);
      if (response.success) {
        success('Deposit rejected');
        setShowRejectModal(false);
        fetchDeposits();
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
    { key: 'user_name', label: 'User Name' },
    {
      key: 'amount_inr',
      label: 'Amount INR',
      render: (val) => formatINR(val),
    },
    {
      key: 'estimated_usdt',
      label: 'Est. USDT',
      render: (val) => `${parseFloat(val || 0).toFixed(2)} USDT`,
    },
    { key: 'utr_number', label: 'UTR Number' },
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
              openApproveConfirm(row);
            }}
            className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
          >
            Approve
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
        <h1 className="text-2xl font-bold text-gray-900">Manual Bank Deposits</h1>
        <button
          onClick={fetchDeposits}
          className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-900 mb-2">Company Bank Account</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p>
            <span className="text-blue-600">Account Name:</span> CRYPEXCH TECHNOLOGIES PRIVATE
            LIMITED
          </p>
          <p>
            <span className="text-blue-600">Account Number:</span> 99998855894319
          </p>
          <p>
            <span className="text-blue-600">IFSC Code:</span> HDFC0004692
          </p>
          <p>
            <span className="text-blue-600">Account Type:</span> Current
          </p>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Verify UTR numbers in your bank statement before approving. After approval, transfer USDT
        from the Cashfree Deposits page.
      </p>

      <DataTable
        columns={columns}
        data={deposits}
        loading={loading}
        emptyMessage="No pending manual deposits"
      />

      <ConfirmDialog
        isOpen={showApproveConfirm}
        onClose={() => setShowApproveConfirm(false)}
        onConfirm={handleApprove}
        title="Approve Deposit"
        message={`Approve deposit of ${formatINR(
          selectedDeposit?.amount_inr
        )} from ${selectedDeposit?.user_email}? Make sure you have verified the UTR in your bank statement.`}
        confirmText={submitting ? 'Approving...' : 'Approve'}
      />

      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Deposit"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              User: <span className="font-medium">{selectedDeposit?.user_email}</span>
            </p>
            <p className="text-sm text-gray-600">
              Amount: <span className="font-medium">{formatINR(selectedDeposit?.amount_inr)}</span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason for Rejection *
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="e.g., UTR not found in bank statement"
              required
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowRejectModal(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={submitting}
              className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Reject Deposit'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
