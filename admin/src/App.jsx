import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import Toast from './components/Toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Withdrawals from './pages/Withdrawals';
import DepositsCashfree from './pages/DepositsCashfree';
import DepositsManual from './pages/DepositsManual';
import Transfers from './pages/Transfers';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';
import Config from './pages/Config';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/withdrawals" element={<Withdrawals />} />
              <Route path="/deposits/cashfree" element={<DepositsCashfree />} />
              <Route path="/deposits/manual" element={<DepositsManual />} />
              <Route path="/transfers" element={<Transfers />} />
              <Route path="/users" element={<Users />} />
              <Route path="/users/:id" element={<UserDetail />} />
              <Route path="/config" element={<Config />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toast />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
