
import { ethers } from "hardhat";

async function main() {
    const raffleAddress = "0xBa09DA67271f7fd6344030673Eb9f9e6136B0FB3";
    console.log(`Performing Emergency Draw for Raffle: ${raffleAddress}`);

    const [signer] = await ethers.getSigners();
    console.log(`Acting as: ${signer.address}`);

    const raffle = await ethers.getContractAt("Raffle", raffleAddress);

    // Check state first
    const state = await raffle.getRaffleState();
    if (state.toString() !== "1") {
        console.log(`Raffle is NOT in CALCULATING state (State: ${state}). Aborting.`);
        return;
    }

    console.log("State is CALCULATING. Proceeding with Emergency Draw...");

    try {
        const tx = await (raffle as any).emergencyDraw();
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ Emergency Draw executed successfully.");

        const winner = await raffle.getRecentWinner();
        console.log(`🏆 Winner picked: ${winner}`);
    } catch (e: any) {
        console.error("❌ Emergency Draw failed:", e.message);
        if (e.data) {
            const decoded = raffle.interface.parseError(e.data);
            console.log("Decoded Error:", decoded);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
