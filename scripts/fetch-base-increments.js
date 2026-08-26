/**
 * Fetch baseIncrement values from KuCoin API and update tokens table
 *
 * Run on GCP server: node scripts/fetch-base-increments.js
 *
 * This script:
 * 1. Fetches all symbol info from KuCoin API
 * 2. Queries tokens from database
 * 3. Generates and executes SQL UPDATE statements
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sikka_exchange',
  user: process.env.DB_USER || 'sikka_user',
  password: process.env.DB_PASSWORD || 'sikka_password'
});

async function fetchKuCoinSymbols() {
  const https = require('https');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.kucoin.com',
      path: '/api/v1/symbols',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.code === '200000') {
            resolve(parsed.data);
          } else {
            reject(new Error(`KuCoin API error: ${parsed.msg}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('=== Fetching baseIncrement values from KuCoin ===\n');

  try {
    // 1. Fetch all symbols from KuCoin
    console.log('1. Fetching symbols from KuCoin API...');
    const symbols = await fetchKuCoinSymbols();
    console.log(`   Found ${symbols.length} trading pairs on KuCoin\n`);

    // Create a map for quick lookup (symbol -> baseIncrement)
    const symbolMap = {};
    symbols.forEach(s => {
      symbolMap[s.symbol] = {
        baseIncrement: s.baseIncrement,
        baseMinSize: s.baseMinSize,
        quoteIncrement: s.quoteIncrement,
        quoteMinSize: s.quoteMinSize
      };
    });

    // 2. Get all tokens from database
    console.log('2. Fetching tokens from database...');
    const result = await pool.query('SELECT symbol, kucoin_symbol, base_increment FROM tokens ORDER BY display_order');
    const tokens = result.rows;
    console.log(`   Found ${tokens.length} tokens in database\n`);

    // 3. Match and generate updates
    console.log('3. Matching tokens with KuCoin symbols:\n');
    console.log('   Symbol     | KuCoin Symbol | Current     | KuCoin baseIncrement');
    console.log('   -----------|---------------|-------------|---------------------');

    const updates = [];

    for (const token of tokens) {
      const kucoinData = symbolMap[token.kucoin_symbol];
      const currentIncrement = token.base_increment || '0.00000001';

      if (kucoinData) {
        const needsUpdate = currentIncrement !== kucoinData.baseIncrement;
        const marker = needsUpdate ? '**' : '  ';
        console.log(`${marker} ${token.symbol.padEnd(10)} | ${token.kucoin_symbol.padEnd(13)} | ${currentIncrement.padEnd(11)} | ${kucoinData.baseIncrement}`);

        if (needsUpdate) {
          updates.push({
            symbol: token.symbol,
            kucoinSymbol: token.kucoin_symbol,
            baseIncrement: kucoinData.baseIncrement
          });
        }
      } else {
        console.log(`!! ${token.symbol.padEnd(10)} | ${token.kucoin_symbol.padEnd(13)} | ${currentIncrement.padEnd(11)} | NOT FOUND ON KUCOIN`);
      }
    }

    console.log('\n   ** = needs update, !! = not found on KuCoin\n');

    // 4. Execute updates
    if (updates.length === 0) {
      console.log('4. No updates needed - all tokens already have correct baseIncrement values.');
    } else {
      console.log(`4. Updating ${updates.length} tokens...\n`);

      for (const update of updates) {
        const sql = `UPDATE tokens SET base_increment = $1 WHERE symbol = $2`;
        await pool.query(sql, [update.baseIncrement, update.symbol]);
        console.log(`   Updated ${update.symbol}: base_increment = '${update.baseIncrement}'`);
      }

      console.log('\n   All updates applied successfully!');
    }

    // 5. Show final state
    console.log('\n5. Final token configuration:\n');
    const finalResult = await pool.query('SELECT symbol, kucoin_symbol, base_increment FROM tokens ORDER BY display_order');
    console.log('   Symbol     | KuCoin Symbol | base_increment');
    console.log('   -----------|---------------|---------------');
    for (const token of finalResult.rows) {
      console.log(`   ${token.symbol.padEnd(10)} | ${token.kucoin_symbol.padEnd(13)} | ${token.base_increment}`);
    }

    console.log('\n=== Done ===');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
