import fs from 'fs';

async function get() {
  const res = await fetch('https://testnet.arcscan.app/api?module=contract&action=getabi&address=0x2F4490e7c6F3DaC23ffEe6e71bFcb5d1CCd7d4eC');
  const data = await res.json();
  fs.writeFileSync('abi.json', JSON.stringify(data, null, 2));
}
get();
