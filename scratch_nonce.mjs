import { createPublicClient, http } from 'viem'

const client = createPublicClient({
  transport: http('https://rpc.testnet.arc.network'),
})

async function check() {
  const nonce = await client.getTransactionCount({ 
    address: '0x75A0C2d1Df51C07982De3Ff031E5232518676B19' 
  })
  console.log("Current nonce:", nonce)
}
check()
