
import { ethers } from "hardhat";

async function main() {
    const raffleAddress = "0x255AC184bFeb2cad50A9c6814B75033868a4CE92";
    console.log(`Force Drawing Raffle: ${raffleAddress}`);

    const [deployer] = await ethers.getSigners();
    console.log(`Acting as: ${deployer.address}`);

    const raffle = await ethers.getContractAt("Raffle", raffleAddress);

    // Check state
    const state = await raffle.getRaffleState();
    console.log(`Current State: ${state} (Must be 1 for CALCULATING)`);

    if (state.toString() !== "1") {
        console.log("Raffle is not determining winner. Aborting.");
        return;
    }

    // Attempt Emergency Draw
    try {
        console.log("Sending emergencyDraw transaction...");
        const tx = await raffle.emergencyDraw();
        console.log("Tx sent:", tx.hash);
        await tx.wait();
        console.log("✅ Emergency Draw Successful!");
    } catch (e) {
        console.error("❌ Failed:", e.message);
        if (e.data) console.error("Data:", e.data);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
