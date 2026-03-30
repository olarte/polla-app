import "dotenv/config";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    celoSepolia: {
      url: "https://forno.celo-sepolia.celo-testnet.org",
      accounts: process.env.POLLA_OPERATOR_PRIVATE_KEY
        ? [process.env.POLLA_OPERATOR_PRIVATE_KEY]
        : [],
      chainId: 11142220,
    },
    celo: {
      url: "https://forno.celo.org",
      accounts: process.env.POLLA_OPERATOR_PRIVATE_KEY
        ? [process.env.POLLA_OPERATOR_PRIVATE_KEY]
        : [],
      chainId: 42220,
    },
  },
};

export default config;
