import { createPublicClient, http, encodeFunctionData, parseAbi } from 'viem'

const client = createPublicClient({
  transport: http('https://rpc.testnet.arc.network'),
})

const address = '0x2F4490e7c6F3DaC23ffEe6e71bFcb5d1CCd7d4eC'

async function check() {
  const abis = [
    "function add_liquidity(uint256[3] amounts, uint256 min_mint_amount)",
    "function add_liquidity(uint256[] amounts, uint256 min_mint_amount)",
    "function addLiquidity(uint256[] amounts, uint256 minToMint, uint256 deadline)",
    "function addLiquidity(uint256[] amounts, uint256 minToMint)",
    "function add_liquidity(uint256[2] amounts, uint256 min_mint_amount)"
  ]

  for (const abi of abis) {
    try {
      const data = encodeFunctionData({
        abi: parseAbi([abi]),
        functionName: abi.split(' ')[1].split('(')[0],
        args: abi.includes('[3]') ? [[0n, 0n, 0n], 0n] 
            : abi.includes('[2]') ? [[0n, 0n], 0n]
            : abi.includes('deadline') ? [[0n, 0n, 0n], 0n, 9999999999n]
            : [[0n, 0n, 0n], 0n]
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
