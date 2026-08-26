import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/withdrawals', label: 'Withdrawals' },
  { path: '/deposits/cashfree', label: 'Deposits (Cashfree)' },
  { path: '/deposits/manual', label: 'Deposits (Manual)' },
  { path: '/transfers', label: 'Manual Transfers' },
  { path: '/users', label: 'Users' },
  { path: '/config', label: 'Configuration' },
];

export default function Sidebar() {
  const { logout } = useAuth();

  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">Sikka Admin</h1>
      </div>
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `block px-4 py-2 rounded-lg text-sm ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={logout}
          className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-lg text-left"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
