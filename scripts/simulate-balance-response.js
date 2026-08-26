// This simulates what the frontend will receive from GET /api/balance

const usdtBalance = 11.83;
const inrToUsdtRate = 84.5;

// Backend calculation (from balance.routes.js line 86-107)
const totalValueINR = usdtBalance * inrToUsdtRate;

const apiResponse = {
  success: true,
  data: {
    main: {
      balances: [],
      totalValueINR: 0
    },
    trade: {
      balances: [
        {
          currency: 'USDT',
          balance: '11.83000000',
          available: '11.83000000',
          holds: '0.00000000'
        }
      ],
      totalValueINR: parseFloat(totalValueINR.toFixed(2))
    },
    totalValueINR: parseFloat(totalValueINR.toFixed(2)),
    balances: [
      {
        currency: 'USDT',
        balance: '11.83000000',
        available: '11.83000000',
        holds: '0.00000000'
      }
    ]
  }
};

console.log('\n=== SIMULATED /api/balance RESPONSE ===\n');
console.log(JSON.stringify(apiResponse, null, 2));

console.log('\n=== KEY VALUES ===');
console.log('Portfolio Value (totalValueINR):', apiResponse.data.totalValueINR, 'INR');
console.log('Available USDT:', parseFloat(apiResponse.data.balances[0].available));
console.log('Locked USDT:', parseFloat(apiResponse.data.balances[0].holds));

console.log('\n=== EXPECTED FRONTEND DISPLAY ===');
console.log('Portfolio Value: ₹' + apiResponse.data.totalValueINR.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}));
console.log('Available: ₹' + apiResponse.data.totalValueINR.toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2}));
console.log('Locked: ₹0.00');
console.log('USDT: \$' + parseFloat(apiResponse.data.balances[0].balance).toFixed(2));

console.log('\n=== MATH CHECK ===');
console.log('11.83 USDT × 84.5 INR/USDT =', (11.83 * 84.5).toFixed(2), 'INR');
console.log('Backend returns:', apiResponse.data.totalValueINR, 'INR');
console.log('Match:', (11.83 * 84.5).toFixed(2) === apiResponse.data.totalValueINR.toFixed(2) ? '✅' : '❌');
