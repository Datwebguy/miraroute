import fs from 'fs';

async function get() {
  const res = await fetch('https://testnet.arcscan.app/api?module=contract&action=getabi&address=0xceA69A03A998002296b5c6b089b94b2B498D8751');
  const data = await res.json();
  fs.writeFileSync('abi_impl.json', JSON.stringify(data, null, 2));
}
get();
