import { createPublicClient, http, encodeFunctionData, parseAbi } from 'viem'

const client = createPublicClient({
  transport: http('https://rpc.testnet.arc.network'),
})

const address = '0x2F4490e7c6F3DaC23ffEe6e71bFcb5d1CCd7d4eC'

async function check() {
  const data = encodeFunctionData({
    abi: parseAbi(["function asdfghjkl()"]),
    functionName: "asdfghjkl"
  })
  try {
    await client.call({ to: address, data })
    console.log("asdfghjkl Success")
  } catch(e) {
    console.log("asdfghjkl Error:", e.shortMessage || e.message.split('\n')[0])
  }
}
check()
