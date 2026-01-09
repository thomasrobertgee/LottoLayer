
import { ethers } from "hardhat";

async function main() {
    // Using the NEWLY deployed Raffle address (deployed in the previous step)
    // The address in the prompt (0x4DaD...) was the OLD broken one.
    const raffleAddress = "0x532ADb1a71198b5f1e1574a7cD2686d94927FDD0";
    const raffle = await ethers.getContractAt("Raffle", raffleAddress);

    console.log(`Checking Raffle State Headless for ${raffleAddress}...`);
    const state = await raffle.getRaffleState();
    const fee = await raffle.getEntranceFee();

    console.log(`State: ${state}, Fee: ${fee.toString()}`);

    if (state.toString() !== "0") {
        console.error("❌ Raffle is not OPEN. Cannot buy ticket.");
        return;
    }

    try {
        console.log("Attempting Headless buyTicket...");
        // We fixed the ReentrancyGuard bug in the contract, so this should pass now.
        const tx = await raffle.buyTicket({ value: fee, gasLimit: 1000000 });
        console.log("Tx sent:", tx.hash);
        await tx.wait();
        console.log("✅ SUCCESS: Ticket bought without UI!");
    } catch (error: any) {
        console.error("❌ FAILED: ", error.message || error);
        if (error.data) {
            console.error("Error Data:", error.data);
        }
    }
}

main().catch((error) => { console.error(error); process.exit(1); });
