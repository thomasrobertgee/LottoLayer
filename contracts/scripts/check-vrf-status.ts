
import { ethers } from "hardhat";

async function main() {
    const raffleAddress = "0xaC4DA8Ee3e0C4ebBc9ad4d1b9Dd885514A911935";
    console.log(`Checking Status of: ${raffleAddress}`);

    const raffle = await ethers.getContractAt("Raffle", raffleAddress);
    const state = await raffle.getRaffleState();
    console.log(`State: ${state} (1 = CALCULATING)`);

    if (state.toString() == "1") {
        console.log("Still CALCULATING. VRF Callback Missing/Reverted.");
    } else if (state.toString() == "2") {
        console.log("CLOSED! Winner Picked.");
        const winner = await raffle.getRecentWinner();
        console.log(`Winner: ${winner}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
