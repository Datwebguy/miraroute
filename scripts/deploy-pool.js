const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying PublicStableSwapPool with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance (native USDC):", hre.ethers.formatEther(balance));

  // Arc Testnet USDC and EURC addresses
  const USDC_ARC = "0x3600000000000000000000000000000000000000";
  const EURC_ARC = "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a";
  
  // Tokens array for the pool
  const tokens = [USDC_ARC, EURC_ARC];
  const fee = 0; // 0% fee for demo

  console.log("Deploying contract...");
  const Pool = await hre.ethers.getContractFactory("PublicStableSwapPool");
  const pool = await Pool.deploy(tokens, fee);

  await pool.waitForDeployment();
  const poolAddress = await pool.getAddress();

  console.log("PublicStableSwapPool deployed to:", poolAddress);

  // Automatically update constants.js with the new pool address
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
