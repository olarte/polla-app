import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Determine USDC address based on network
  const network = await ethers.provider.getNetwork();
  let usdcAddress: string;

  if (network.chainId === 11142220n) {
    // Celo Sepolia testnet — use Circle's testnet USDC
    usdcAddress = "0x01C5C0122039549AD1493B8220cABEdD739BC44E";
    console.log("Using Celo Sepolia testnet USDC:", usdcAddress);
  } else if (network.chainId === 42220n) {
    // Celo mainnet — real USDC (bridged via Wormhole)
    usdcAddress = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
    console.log("Using Celo mainnet USDC:", usdcAddress);
  } else {
    throw new Error(`Unknown network chainId: ${network.chainId}`);
  }

  // Deploy PollaBets
  const treasury = process.env.NEXT_PUBLIC_TREASURY_ADDRESS;
  if (!treasury) {
    throw new Error("NEXT_PUBLIC_TREASURY_ADDRESS not set — this should be your hardware wallet address");
  }
  console.log("Treasury (hardware wallet):", treasury);
  console.log("Operator (hot wallet):", deployer.address);
  console.log("Deploying PollaBets...");
  const PollaBets = await ethers.getContractFactory("PollaBets");
  const pollaBets = await PollaBets.deploy(usdcAddress, treasury);
  await pollaBets.waitForDeployment();
  const pollaBetsAddress = await pollaBets.getAddress();
  console.log("PollaBets deployed to:", pollaBetsAddress);

  // Export ABI to lib/contracts for frontend
  const artifact = require("../artifacts/contracts/PollaBets.sol/PollaBets.json");
  const abiPath = path.resolve(__dirname, "../../lib/contracts/PollaBets.json");
  fs.writeFileSync(
    abiPath,
    JSON.stringify({ address: pollaBetsAddress, abi: artifact.abi }, null, 2)
  );
  console.log("ABI + address saved to:", abiPath);

  // Print env var for .env
  console.log("\n--- Add to .env ---");
  console.log(`NEXT_PUBLIC_POLLA_BETS_ADDRESS=${pollaBetsAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
