
import { ethers } from "hardhat";

async function main() {
    const factoryAddress = "0x7Ef8EB317bdF28c7D6A93282a17250359Cd69ce4";
    console.log("Checking Factory for new spawn...");
    const factory = await ethers.getContractAt("LottoFactory", factoryAddress);

    // V2 uses activeRaffles for monitoring
    // We can also check s_raffles history
    const raffles = await factory.getRaffles();
    console.log(`Total Raffles History: ${raffles.length}`);

    // Check Active List
    const activeRaffles = await factory.getActiveRaffles();
    console.log(`Active Raffles: ${activeRaffles.length}`);

    // We want to find if the *latest* historic raffle is CLOSED but not replaced?
    // Or check if the active raffle is stuck? 
    // If Active Raffle is CLOSED, it needs spawn.

    if (activeRaffles.length > 0) {
        const latestAddress = activeRaffles[activeRaffles.length - 1]; // Use last active
        console.log(`Checking Active Raffle: ${latestAddress}`);
        const latestRaffle = await ethers.getContractAt("Raffle", latestAddress);
        const state = await latestRaffle.getRaffleState();

        console.log(`Active Raffle State: ${state} (0=OPEN, 1=CALC, 2=CLOSED)`);

        if (state.toString() === "2") {
            console.log("⚠️ Active Raffle is CLOSED. Forcing Spawn (Action 1)...");
            // For V2: Index is index in activeRaffles array
            const index = activeRaffles.length - 1;
            const performData = ethers.AbiCoder.defaultAbiCoder().encode(["uint256", "uint256"], [index, 1]);

            try {
                const tx = await factory.performUpkeep(performData);
                console.log("Spawn Tx sent:", tx.hash);
                await tx.wait();
                console.log("✅ Forced Spawn Complete.");

                const newRaffles = await factory.getRaffles();
                console.log(`🆕 NEW Raffle Spawned: ${newRaffles[newRaffles.length - 1]}`);
            } catch (e: any) {
                console.log("❌ Failed to force spawn:", e.message);
            }
        } else if (state.toString() === "0") {
            console.log("✅ Latest raffle is OPEN. System is healthy.");
        } else {
            console.log("⏳ Latest raffle is CALCULATING. Waiting for VRF.");
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
