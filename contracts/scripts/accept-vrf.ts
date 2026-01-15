
import { ethers } from "hardhat";

async function main() {
    const factoryAddress = "0xfDa866da8B363220752A7082e5bE3b689092b1F6";
    console.log(`Accepting VRF Ownership for Factory: ${factoryAddress}`);

    const factory = await ethers.getContractAt("LottoFactory", factoryAddress);

    try {
        console.log("Sending transaction...");
        const tx = await factory.acceptVRFOwnership();
        console.log("Tx hash:", tx.hash);
        await tx.wait();
        console.log("✅ Ownership Accepted Successfully!");
    } catch (e) {
        console.error("❌ Failed:", e.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
