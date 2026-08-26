const https = require('https');

const token = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjM4MDI5MzRmZTBlZWM0NmU3NjkyMzY1MjMwNzY2ZWVlODg5OGZhOTAiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vc2lra2EtdGVzdCIsImF1ZCI6InNpa2thLXRlc3QiLCJhdXRoX3RpbWUiOjE3MzE0MDE4NzcsInVzZXJfaWQiOiJ0R3RzM0ZScGFVVDh2QXkxUUZqQkwwZ2FqMkUzIiwic3ViIjoidEd0czNGUnBhVVQ4dkF5MVFGP0JMMGdhajJFMyIsImlhdCI6MTczMTQwMTg3NywiZXhwIjoxNzMxNDA1NDc3LCJlbWFpbCI6ImFwcHJvdmVkLWt5Yy10cmFkZXJAdGVzdC5jb20iLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsiYXBwcm92ZWQta3ljLXRyYWRlckB0ZXN0LmNvbSJdfSwic2lnbl9pbl9wcm92aWRlciI6InBhc3N3b3JkIn19.hxKDp6VPt82vz9BcFKXSRZZaIVXdmjV9Ax3xXm3mKz6U_pQGXpHv5Z5yL25s7X0r1FXgMhmYlA1MDmDUGjlI9z5fD-gVpvQGkMogA';

const http = require('http');

const options = {
  hostname: '35.200.154.218',
  port: 3000,
  path: '/api/balance',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Backend Response:');
      console.log(JSON.stringify(response, null, 2));

      if (response.data) {
        console.log('\n=== KEY VALUES ===');
        console.log('MAIN total INR:', response.data.main?.totalValueINR);
        console.log('TRADE total INR:', response.data.trade?.totalValueINR);
        console.log('Returned totalValueINR:', response.data.totalValueINR);
        console.log('\nMAIN balances:', response.data.main?.balances);
        console.log('\nTRADE balances:', response.data.trade?.balances);
      }
    } catch (e) {
      console.error('Parse error:', e.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
});

req.end();
