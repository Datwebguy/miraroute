import { createPublicClient, http, encodeFunctionData, parseAbi } from 'viem'

const client = createPublicClient({
  transport: http('https://rpc.testnet.arc.network'),
})

const address = '0xBBD70b01a1CAbc96d5b7b129Ae1AAabdf50dd40b' // ARC_ADAPTER

async function check() {
  const abis = [
    "function addLiquidity(uint256[] amounts)",
    "function add_liquidity(uint256[3] amounts, uint256 min_mint_amount)",
    "function addLiquidity(address pool, uint256[] amounts)"
  ]

  for (const abi of abis) {
    try {
      const data = encodeFunctionData({
        abi: parseAbi([abi]),
        functionName: abi.split(' ')[1].split('(')[0],
        args: abi.includes('pool') ? ['0x2F4490e7c6F3DaC23ffEe6e71bFcb5d1CCd7d4eC', [0n, 0n, 0n]]
            : abi.includes('[3]') ? [[0n, 0n, 0n], 0n] 
            : [[0n, 0n, 0n]]
      })
      await client.call({
        to: address,
        data
      })
      console.log("Success with", abi)
    } catch (e) {
      console.log("Error with", abi, "->", e.shortMessage || e.message.split('\n')[0])
    }
  }
}
check()
