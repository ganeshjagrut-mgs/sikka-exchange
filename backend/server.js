// Load .env from /root/ in Docker, or parent directory when running locally
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPath = fs.existsSync('/root/.env') ? '/root/.env' : path.join(__dirname, '../.env');
dotenv.config({ path: envPath });
const express = require('express');
const cors = require('cors');

// Initialize configs and services on startup
const pool = require('./src/config/database');
const firebaseAdmin = require('./src/config/firebase');
const cashfreeConfig = require('./src/config/cashfree');
const kucoinConfig = require('./src/config/kucoin');

// Load services
const dbService = require('./src/services/db.service');
const firebaseService = require('./src/services/firebase.service');
const cashfreeService = require('./src/services/cashfree.service');
const adminService = require('./src/services/admin.service');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - CORS configuration to allow frontend access
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:8081',     // Expo web dev
      'http://localhost:19006',    // Expo web alternative port
      'http://localhost:3000',     // Local development
      'http://35.200.154.218:3000' // GCP server (for test-ui)
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for now (can restrict later)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
}));

// Raw body parser for webhook signature verification (must come before express.json)
app.use('/api/webhooks', express.raw({ type: 'application/json' }));

// Standard JSON parser for all other routes (increased limit for KYC images)
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

// Serve static files from test-ui directory (Docker mounts at /test-ui)
const testUiPath = fs.existsSync('/test-ui') ? '/test-ui' : path.join(__dirname, '../test-ui');
app.use('/test-ui', express.static(testUiPath));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Sikka Exchange API',
    version: '1.0.0',
    status: 'running',
  });
});

// Mount routes
const authRoutes = require('./src/routes/auth.routes');
app.use('/api/auth', authRoutes);

const kycRoutes = require('./src/routes/kyc.routes');
app.use('/api/kyc', kycRoutes);

const checkoutRoutes = require('./src/routes/checkout.routes');
app.use('/', checkoutRoutes); // Mount at root for /checkout and /api/payment/return

const depositRoutes = require('./src/routes/deposit.routes');
app.use('/api/deposits', depositRoutes);

const webhookRoutes = require('./src/routes/webhook.routes');
app.use('/api/webhooks', webhookRoutes);

const tradesRoutes = require('./src/routes/trades.routes');
app.use('/api/trades', tradesRoutes);

const tokensRoutes = require('./src/routes/tokens.routes');
app.use('/api/tokens', tokensRoutes);

const marketRoutes = require('./src/routes/market.routes');
app.use('/api/market', marketRoutes);

const balanceRoutes = require('./src/routes/balance.routes');
app.use('/api/balance', balanceRoutes);

// Transfers (internal account transfers)
const transfersRoutes = require('./src/routes/transfers.routes');
app.use('/api/transfers', transfersRoutes);

// P2P Transfers (user-to-user internal transfers)
const p2pRoutes = require('./src/routes/p2p.routes');
app.use('/api/p2p', p2pRoutes);

// Phase 7: Bank accounts and withdrawals
const bankAccountsRoutes = require('./src/routes/bank-accounts.routes');
app.use('/api/bank-accounts', bankAccountsRoutes);

const withdrawalRoutes = require('./src/routes/withdrawal.routes');
app.use('/api/withdrawals', withdrawalRoutes);

// Admin routes
const adminAuthRoutes = require('./src/routes/admin/auth.routes');
app.use('/api/admin', adminAuthRoutes);

const adminWithdrawalsRoutes = require('./src/routes/admin/withdrawals.routes');
app.use('/api/admin/withdrawals', adminWithdrawalsRoutes);

const adminDepositsRoutes = require('./src/routes/admin/deposits.routes');
app.use('/api/admin/deposits', adminDepositsRoutes);

// Phase 8: Admin panel routes
const adminUsersRoutes = require('./src/routes/admin/users.routes');
app.use('/api/admin/users', adminUsersRoutes);

const adminConfigRoutes = require('./src/routes/admin/config.routes');
app.use('/api/admin/config', adminConfigRoutes);

const adminStatsRoutes = require('./src/routes/admin/stats.routes');
app.use('/api/admin/stats', adminStatsRoutes);

const adminTransfersRoutes = require('./src/routes/admin/transfers.routes');
app.use('/api/admin/transfers', adminTransfersRoutes);

// Load polling service
const pollingService = require('./src/services/polling.service');

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=🚀 Sikka Exchange Backend running on port ${PORT}`);
  console.log(`=📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=✅ Health check: http://localhost:${PORT}/health`);

  // Start polling service after server starts
  pollingService.startPolling();
});
