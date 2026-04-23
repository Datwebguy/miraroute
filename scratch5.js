import { createPublicClient, http } from 'viem'

const client = createPublicClient({
  transport: http('https://rpc.testnet.arc.network'),
})

async function get() {
  const impl = await client.getStorageAt({
    address: '0xBBD70b01a1CAbc96d5b7b129Ae1AAabdf50dd40b',
    slot: '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
  })
  console.log("Implementation:", impl)
}
get()
