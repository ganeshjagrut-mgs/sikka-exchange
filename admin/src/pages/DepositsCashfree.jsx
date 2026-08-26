import { useState, useEffect } from 'react';
import { adminApi } from '../api/adminApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';

export default function DepositsCashfree() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [amountUsdt, setAmountUsdt] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useToast();

  const fetchDeposits = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getPendingDeposits();
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

  const openTransferModal = (deposit) => {
    setSelectedDeposit(deposit);
    setAmountUsdt(deposit.estimated_usdt || '');
    setAdminNotes('');
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedDeposit(null);
    setShowModal(false);
  };

  const handleTransfer = async () => {
    if (!amountUsdt || parseFloat(amountUsdt) <= 0) {
      error('Please enter a valid USDT amount');
      return;
    }
    try {
      setSubmitting(true);
      const response = await adminApi.transferUSDT(selectedDeposit.id, {
        amount_usdt: parseFloat(amountUsdt),
        admin_notes: adminNotes || undefined,
      });
      if (response.success) {
        success('USDT transferred successfully');
        closeModal();
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
    { key: 'payment_method', label: 'Payment Method' },
    { key: 'utr_number', label: 'UTR' },
    {
      key: 'paid_at',
      label: 'Paid At',
      render: (val) => formatDate(val),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openTransferModal(row);
          }}
          className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Transfer USDT
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cashfree Deposits</h1>
        <button
          onClick={fetchDeposits}
          className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        These are deposits paid via Cashfree, awaiting USDT transfer to user.
      </p>

      <DataTable
        columns={columns}
        data={deposits}
        loading={loading}
        emptyMessage="No pending Cashfree deposits"
      />

      <Modal isOpen={showModal} onClose={closeModal} title="Transfer USDT to User">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              User: <span className="font-medium">{selectedDeposit?.user_email}</span>
            </p>
            <p className="text-sm text-gray-600">
              Paid: <span className="font-medium">{formatINR(selectedDeposit?.amount_inr)}</span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              USDT Amount to Transfer *
            </label>
            <input
              type="number"
              step="0.01"
              value={amountUsdt}
              onChange={(e) => setAmountUsdt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              onClick={handleTransfer}
              disabled={submitting}
              className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Transfer USDT'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
