import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address))
  );

  const network = await ethers.provider.getNetwork();
  let usdcAddress: string;
  let deploymentFile: string;

  if (network.chainId === 11142220n) {
    usdcAddress = "0x01C5C0122039549AD1493B8220cABEdD739BC44E";
    deploymentFile = "parlay-sepolia.json";
    console.log("Network: Celo Sepolia");
    console.log("USDC:", usdcAddress);
  } else if (network.chainId === 42220n) {
    usdcAddress = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
    deploymentFile = "parlay-celo.json";
    console.log("Network: Celo mainnet");
    console.log("USDC:", usdcAddress);
    console.log(
      "⚠  MAINNET DEPLOY — this session is Alfajores/Sepolia only; abort unless Session 18 approval."
    );
    throw new Error("Mainnet deploy is gated. Abort.");
  } else {
    throw new Error(`Unknown network chainId: ${network.chainId}`);
  }

  const treasury = process.env.NEXT_PUBLIC_TREASURY_ADDRESS?.trim();
  if (!treasury) {
    throw new Error(
      "NEXT_PUBLIC_TREASURY_ADDRESS not set — this should be the Sabi hardware wallet"
    );
  }

  // Operator = the hot wallet signing this tx (i.e., the deployer).
  const operator = deployer.address;

  console.log("Treasury (hardware wallet):", treasury);
  console.log("Operator (hot wallet):", operator);

  console.log("Deploying SabiParlayPools...");
  const Factory = await ethers.getContractFactory("SabiParlayPools");
  const pools = await Factory.deploy(usdcAddress, operator, treasury);
  const deployTx = pools.deploymentTransaction();
  await pools.waitForDeployment();
  const address = await pools.getAddress();
  const deployedBlock = deployTx ? await deployTx.wait() : null;
  console.log("SabiParlayPools deployed to:", address);
  console.log("Deploy tx:", deployTx?.hash);
  console.log("Deploy block:", deployedBlock?.blockNumber);

  // Export ABI + address to lib/contracts for frontend.
  const artifact = require("../artifacts/contracts/SabiParlayPools.sol/SabiParlayPools.json");
  const libContractsDir = path.resolve(__dirname, "../../lib/contracts");
  if (!fs.existsSync(libContractsDir)) {
    fs.mkdirSync(libContractsDir, { recursive: true });
  }
  const abiPath = path.join(libContractsDir, "SabiParlayPools.json");
  fs.writeFileSync(
    abiPath,
    JSON.stringify({ address, abi: artifact.abi }, null, 2)
  );
  console.log("ABI saved to:", abiPath);

  // Write deployment metadata.
  const deploymentsDir = path.resolve(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  const deploymentPath = path.join(deploymentsDir, deploymentFile);
  fs.writeFileSync(
    deploymentPath,
    JSON.stringify(
      {
        contract: "SabiParlayPools",
        address,
        chainId: Number(network.chainId),
        network:
          network.chainId === 11142220n ? "celo-sepolia" : String(network.chainId),
        usdc: usdcAddress,
        operator,
        treasury,
        txHash: deployTx?.hash,
        blockNumber: deployedBlock?.blockNumber,
        deployedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log("Deployment metadata saved to:", deploymentPath);

  console.log("\n--- Add to .env.local ---");
  console.log(`NEXT_PUBLIC_SABI_PARLAY_POOLS_ADDRESS=${address}`);
  console.log(`\nVerify on Celoscan:`);
  console.log(
    `npx hardhat verify --network ${network.chainId === 11142220n ? "celoSepolia" : "celo"} ${address} ${usdcAddress} ${operator} ${treasury}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
