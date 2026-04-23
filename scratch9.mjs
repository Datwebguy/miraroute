async function run() {
  const res = await fetch("https://rpc.testnet.arc.network", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getStorageAt",
      params: ["0xBBD70b01a1CAbc96d5b7b129Ae1AAabdf50dd40b", "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc", "latest"],
      id: 1
    })
  });
  const data = await res.json();
  console.log(data);
}
run();
