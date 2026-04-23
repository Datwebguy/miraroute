const https = require('https');

https.get('https://testnet.arcscan.app/api?module=contract&action=getabi&address=0x2F4490e7c6F3DaC23ffEe6e71bFcb5d1CCd7d4eC', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
