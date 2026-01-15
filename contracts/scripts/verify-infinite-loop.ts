
import { ethers } from "hardhat";

async function main() {
    const factoryAddress = "0x7Ef8EB317bdF28c7D6A93282a17250359Cd69ce4";
    const [signer] = await ethers.getSigners();
    console.log("Using Signer:", signer.address);

    const factory = await ethers.getContractAt("LottoFactory", factoryAddress);

    // Step A: Identify the most recent OPEN raffle
    console.log("Fetching raffles...");
    const raffles = await factory.getRaffles();
    if (raffles.length === 0) {
        console.error("No raffles found!");
        return;
    }

    // Find the latest open raffle
    let targetRaffleAddress = "";
    let targetRaffle = null;

    for (let i = raffles.length - 1; i >= 0; i--) {
        const addr = raffles[i];
        const r = await ethers.getContractAt("Raffle", addr);
        const state = await r.getRaffleState();
        if (state.toString() === "0") { // OPEN
            targetRaffleAddress = addr;
            targetRaffle = r;
            console.log(`Found OPEN Raffle: ${addr}`);
            break;
        }
    }

    if (!targetRaffle) {
        console.error("No OPEN raffle found.");
        return;
    }

    // Step B: Buy all remaining tickets
    const maxTickets = await targetRaffle.getMaxTickets();
    const players = await targetRaffle.getNumPlayers();
    const price = await targetRaffle.getEntranceFee();

    const ticketsNeeded = Number(maxTickets) - Number(players);
    console.log(`Raffle needs ${ticketsNeeded} tickets to sell out.`);

    if (ticketsNeeded > 0) {
        try {
            for (let i = 0; i < ticketsNeeded; i++) {
                console.log(`Buying ticket ${i + 1}/${ticketsNeeded}...`);
                const tx = await targetRaffle.buyTicket({ value: price });
                await tx.wait();
            }
            console.log("All tickets purchased. Raffle should be SOLD OUT.");
        } catch (err: any) {
            console.error("❌ Buy failed:", err.message);
            const bal = await ethers.provider.getBalance(signer.address);
            console.log("Signer Balance:", ethers.formatEther(bal));
            return;
        }
    } else {
        console.log("Raffle already full?");
    }

    // Step C: Trigger performUpkeep (if not already calculating)
    // Note: buyTicket usually triggers pickWinner if sold out. Let's check state.
    const stateAfter = await targetRaffle.getRaffleState();
    console.log("Raffle State after buying:", stateAfter.toString() === "1" ? "CALCULATING" : "OPEN");

    if (stateAfter.toString() === "0") {
        console.log("Triggering performUpkeep manually...");
        try {
            const upTx = await targetRaffle.performUpkeep("0x");
            await upTx.wait();
            console.log("performUpkeep executed.");
        } catch (e) {
            console.log("performUpkeep failed (likely already calculating or conditions not met):", e.reason || e.message);
        }
    } else {
        console.log("Raffle is already CALCULATING (VRF pending). Skipping manual upkeep.");
    }

    // Step D & E: Listen for WinnerPicked and RaffleCreated
    console.log("Waiting for Chainlink VRF fulfillment and Factory replacement...");
    console.log("(This may take 1-2 minutes on testnet)...");

    // We need to listen to events.
    // 1. WinnerPicked on the target raffle
    // 2. RaffleCreated on the factory

    // Promise wrapper for events
    const waitForWinner = new Promise((resolve, reject) => {
        targetRaffle.once("WinnerPicked", (winner, amount) => {
            console.log(`\n🎉 WinnerPicked Event Detected!`);
            console.log(`Winner: ${winner}`);
            console.log(`Prize Amount: ${ethers.formatEther(amount)} ETH`);
            resolve({ winner, amount });
        });
        setTimeout(() => reject(new Error("Timeout waiting for WinnerPicked")), 180000); // 3 min timeout
    });

    const waitForReplacement = new Promise((resolve, reject) => {
        factory.once("RaffleCreated", (newRaffleAddress) => {
            console.log(`\n🏭 RaffleCreated Event Detected!`);
            console.log(`New Raffle Address: ${newRaffleAddress}`);
            resolve(newRaffleAddress);
        });
        setTimeout(() => reject(new Error("Timeout waiting for RaffleCreated")), 180000);
    });

    try {
        const [winnerData, newRaffleAddr] = await Promise.all([waitForWinner, waitForReplacement]);

        // Validate Fees?
        // We can't easily see the internal tx for treasury fee unless we inspect the tx receipt or check treasury balance change.
        // Let's check the balance of the *Old* raffle (should be 0)
        const oldBalance = await ethers.provider.getBalance(targetRaffleAddress);
        console.log(`Old Raffle Balance: ${ethers.formatEther(oldBalance)} ETH (Should be 0)`);

        console.log("\nSuccess Summary:");
        console.log("----------------");
        console.log(`Old Raffle: ${targetRaffleAddress} (Closed)`);
        console.log(`Winner Recipient: ${winnerData.winner}`);
        console.log(`Winner Payout: ${ethers.formatEther(winnerData.amount)} ETH`);
        console.log(`New Raffle: ${newRaffleAddr} (Born)`);
        console.log("Infinite Loop Logic Verified ✅");

    } catch (e: any) {
        console.error("❌ verification failed:", e.message);

        // Log Request ID for debugging if timeout occurred
        if (targetRaffle) {
            console.log("\nChecking for VRF Request ID...");
            const filter = targetRaffle.filters.RequestedRaffleWinner();
            const events = await targetRaffle.queryFilter(filter);
            if (events.length > 0) {
                const lastReq = events[events.length - 1];
                console.log(`⚠️ VRF Request Sent! Request ID: ${lastReq.args[0]}`);
                console.log(`Check status on Explorer: https://sepolia.basescan.org/address/${targetRaffleAddress}`);
            } else {
                console.log("No VRF Request event found. performUpkeep might have failed to trigger.");
            }
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
