import { useState, useEffect } from 'react';
import { adminApi } from '../api/adminApi';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import LoadingSpinner from '../components/LoadingSpinner';
import { useToast } from '../context/ToastContext';

export default function Config() {
  const [conversionRate, setConversionRate] = useState('');
  const [newRate, setNewRate] = useState('');
  const [rateUpdatedAt, setRateUpdatedAt] = useState(null);
  const [loadingRate, setLoadingRate] = useState(true);
  const [savingRate, setSavingRate] = useState(false);

  const [tokens, setTokens] = useState([]);
  const [loadingTokens, setLoadingTokens] = useState(true);
  const [selectedToken, setSelectedToken] = useState(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenForm, setTokenForm] = useState({
    is_active: true,
    quote_min_size: '',
    quote_max_size: '',
  });
  const [savingToken, setSavingToken] = useState(false);

  const { success, error } = useToast();

  const fetchConversionRate = async () => {
    try {
      setLoadingRate(true);
      const response = await adminApi.getConversionRate();
      if (response.success) {
        setConversionRate(response.data.conversion_rate);
        setNewRate(response.data.conversion_rate);
        setRateUpdatedAt(response.data.updated_at);
      }
    } catch (err) {
      error(err.message);
    } finally {
      setLoadingRate(false);
    }
  };

  const fetchTokens = async () => {
    try {
      setLoadingTokens(true);
      const response = await adminApi.getTokens();
      if (response.success) {
        setTokens(response.data || []);
      }
    } catch (err) {
      error(err.message);
    } finally {
      setLoadingTokens(false);
    }
  };

  useEffect(() => {
    fetchConversionRate();
    fetchTokens();
  }, []);

  const handleUpdateRate = async () => {
    if (!newRate || parseFloat(newRate) <= 0) {
      error('Please enter a valid rate');
      return;
    }
    try {
      setSavingRate(true);
      const response = await adminApi.updateConversionRate(parseFloat(newRate));
      if (response.success) {
        success('Conversion rate updated');
        fetchConversionRate();
      }
    } catch (err) {
      error(err.message);
    } finally {
      setSavingRate(false);
    }
  };

  const openTokenModal = (token) => {
    setSelectedToken(token);
    setTokenForm({
      is_active: token.is_active,
      quote_min_size: token.quote_min_size || '',
      quote_max_size: token.quote_max_size || '',
    });
    setShowTokenModal(true);
  };

  const handleUpdateToken = async () => {
    try {
      setSavingToken(true);
      const response = await adminApi.updateToken(selectedToken.symbol, {
        is_active: tokenForm.is_active,
        quote_min_size: tokenForm.quote_min_size
          ? parseFloat(tokenForm.quote_min_size)
          : undefined,
        quote_max_size: tokenForm.quote_max_size
          ? parseFloat(tokenForm.quote_max_size)
          : undefined,
      });
      if (response.success) {
        success('Token updated');
        setShowTokenModal(false);
        fetchTokens();
      }
    } catch (err) {
      error(err.message);
    } finally {
      setSavingToken(false);
    }
  };

  const toggleTokenActive = async (token) => {
    try {
      const response = await adminApi.updateToken(token.symbol, {
        is_active: !token.is_active,
      });
      if (response.success) {
        success(`${token.symbol} ${token.is_active ? 'disabled' : 'enabled'}`);
        fetchTokens();
      }
    } catch (err) {
      error(err.message);
    }
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-IN');
  };

  const tokenColumns = [
    { key: 'symbol', label: 'Symbol' },
    { key: 'name', label: 'Name' },
    { key: 'kucoin_symbol', label: 'KuCoin Symbol' },
    {
      key: 'quote_min_size',
      label: 'Min Size (USDT)',
      render: (val) => val || '-',
    },
    {
      key: 'quote_max_size',
      label: 'Max Size (USDT)',
      render: (val) => val || '-',
    },
    {
      key: 'is_active',
      label: 'Active',
      render: (val, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleTokenActive(row);
          }}
          className={`px-2 py-1 text-xs rounded ${
            val ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}
        >
          {val ? 'Active' : 'Inactive'}
        </button>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            openTokenModal(row);
          }}
          className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Edit
        </button>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configuration</h1>

      <div className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Conversion Rate</h2>
        {loadingRate ? (
          <LoadingSpinner size="sm" />
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">
                Current Rate:{' '}
                <span className="font-semibold text-gray-900">1 USDT = ₹{conversionRate}</span>
              </p>
              {rateUpdatedAt && (
                <p className="text-xs text-gray-400 mt-1">Last updated: {formatDate(rateUpdatedAt)}</p>
              )}
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1 max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Rate (INR per USDT)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleUpdateRate}
                disabled={savingRate || newRate === conversionRate}
                className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                {savingRate ? 'Saving...' : 'Update Rate'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Token Configuration</h2>
          <button
            onClick={fetchTokens}
            className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
        <DataTable
          columns={tokenColumns}
          data={tokens}
          loading={loadingTokens}
          emptyMessage="No tokens configured"
        />
      </div>

      <Modal isOpen={showTokenModal} onClose={() => setShowTokenModal(false)} title={`Edit ${selectedToken?.symbol}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <p className="text-sm text-gray-900">{selectedToken?.name}</p>
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={tokenForm.is_active}
                onChange={(e) =>
                  setTokenForm((prev) => ({ ...prev, is_active: e.target.checked }))
                }
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Active (users can trade this token)</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Trade Size (USDT)
            </label>
            <input
              type="number"
              step="0.01"
              value={tokenForm.quote_min_size}
              onChange={(e) =>
                setTokenForm((prev) => ({ ...prev, quote_min_size: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Trade Size (USDT)
            </label>
            <input
              type="number"
              step="0.01"
              value={tokenForm.quote_max_size}
              onChange={(e) =>
                setTokenForm((prev) => ({ ...prev, quote_max_size: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowTokenModal(false)}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateToken}
              disabled={savingToken}
              className="px-4 py-2 text-sm text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {savingToken ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
