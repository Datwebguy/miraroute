import { createPublicClient, http, parseAbi } from 'viem'

const client = createPublicClient({
  transport: http('https://rpc.testnet.arc.network'),
})

async function get() {
  const count = await client.readContract({
    address: '0x2F4490e7c6F3DaC23ffEe6e71bFcb5d1CCd7d4eC',
    abi: parseAbi(['function getTokenCount() view returns (uint256)']),
    functionName: 'getTokenCount'
  })
  console.log("Token count:", count)
}
get()
