import fs from 'fs';

async function get() {
  const res = await fetch('https://testnet.arcscan.app/api?module=contract&action=getabi&address=0xBBD70b01a1CAbc96d5b7b129Ae1AAabdf50dd40b');
  const data = await res.json();
  fs.writeFileSync('abi_adapter.json', JSON.stringify(data, null, 2));
}
get();
