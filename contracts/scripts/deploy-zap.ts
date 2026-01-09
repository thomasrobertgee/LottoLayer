
import { ethers } from "hardhat";

async function main() {
    const swapRouter = "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4"; // Base Sepolia V3
    const weth = "0x4200000000000000000000000000000000000006"; // Base Sepolia WETH

    console.log("Deploying LottoZap...");
    const LottoZap = await ethers.getContractFactory("LottoZap");
    const zap = await LottoZap.deploy(swapRouter, weth);
    await zap.waitForDeployment();

    console.log(`LottoZap deployed to: ${await zap.getAddress()}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
