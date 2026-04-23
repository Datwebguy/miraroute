require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",

  networks: {
    // Local Hardhat node for fast contract testing without spending gas
    hardhat: {},

    // QIE Mainnet — the only public network for QIE Blockchain (Chain ID: 5656)
    qie: {
      url: process.env.QIE_RPC_URL || "https://rpc1mainnet.qie.digital/",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      chainId: 1990,
    },

    // Arc Testnet
    arcTestnet: {
      url: "https://rpc.testnet.arc.network",
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      chainId: 5042002,
    },
  },
};
