import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying PublicStableSwapPool with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance (native USDC):", hre.ethers.formatEther(balance));

  const USDC_ARC = "0x3600000000000000000000000000000000000000";
  const EURC_ARC = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";
  const tokens = [USDC_ARC, EURC_ARC];
  const fee = 0;

  console.log("Deploying contract...");
  const Pool = await hre.ethers.getContractFactory("PublicStableSwapPool");
  
  // HARDCODED HIGH PRIORITY FEE to jump the mempool
  const maxFeePerGas = hre.ethers.parseUnits("1000", "gwei");
  const maxPriorityFeePerGas = hre.ethers.parseUnits("50", "gwei");

  console.log(`Using gas fees: maxFee=1000 gwei, maxPriority=50 gwei`);

  let pool;
  let retries = 5;
  while(retries > 0) {
    try {
      // Force a fresh nonce
      const nonce = await hre.ethers.provider.getTransactionCount(deployer.address, "latest");
      console.log(`Using nonce: ${nonce}`);
      
      pool = await Pool.deploy(tokens, fee, { maxFeePerGas, maxPriorityFeePerGas, nonce });
      console.log("Transaction submitted. Waiting for deployment confirmation...");
      
      // Reduce timeout for confirmation check
      const receipt = await pool.deploymentTransaction().wait(1); 
      console.log("Deployment receipt received!");
      break;
    } catch(e) {
      if(e.message.includes('txpool is full')) {
        console.log(`[${new Date().toLocaleTimeString()}] Txpool full, retrying in 15 seconds... (${retries} left)`);
        await new Promise(r => setTimeout(r, 15000));
        retries--;
      } else {
        console.error("Deployment error:", e.message);
        throw e;
      }
    }
  }
  
  if(!pool) throw new Error("Failed to deploy after retries.");

  const poolAddress = await pool.getAddress();
  console.log("PublicStableSwapPool deployed to:", poolAddress);

  const constantsPath = path.join(__dirname, "..", "src", "utils", "constants.js");
  let constantsCode = fs.readFileSync(constantsPath, "utf8");
  
  constantsCode = constantsCode.replace(
    /export const STABLE_SWAP_POOL = '0x[a-fA-F0-9]{40}';/,
    `export const STABLE_SWAP_POOL = '${poolAddress}'; // DEPLOYED LIVE`
  );
  
  fs.writeFileSync(constantsPath, constantsCode);
  console.log("Updated src/utils/constants.js with the new STABLE_SWAP_POOL address!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
