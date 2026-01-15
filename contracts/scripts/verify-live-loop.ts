
import { ethers } from "hardhat";

async function main() {
    const factoryAddress = "0xCc75f09F5208848502BFF663800F7A77ddc24c92";
    console.log(`Starting Live Loop Verification`);
    console.log(`Target Factory: ${factoryAddress}`);

    const [deployer] = await ethers.getSigners();
    console.log(`Acting as: ${deployer.address}`);

    // Step A: Fetch Active Raffle
    const factory = await ethers.getContractAt("LottoFactory", factoryAddress);
    const raffles = await factory.getRaffles();

    if (raffles.length === 0) {
        console.error("No raffles found in factory!");
        return;
    }

    const activeRaffleAddress = raffles[raffles.length - 1];
    console.log(`Active Raffle Address: ${activeRaffleAddress}`);

    const raffle = await ethers.getContractAt("Raffle", activeRaffleAddress);

    // Check Status
    let state = await raffle.getRaffleState(); // 0=OPEN, 1=CALC, 2=CLOSED
    console.log(`Initial State: ${state}`);

    if (state.toString() !== "0") {
        console.log("Raffle is not OPEN. Waiting for next spawn or completion...");

        // Use a loop to wait for it to be OPEN or check if we need to look at a new raffle
        // For this script, let's assume if it's not open, we might need to query factory again in a loop?
        // Let's stick to the user plan: Buy Out.
        // If it's CALCULATING, we just monitor. 
        // If CLOSED, we check if factory has a new one using a polling check loop?
        // Let's just monitor if not OPEN.
    } else {
        // Step B: Buy Out
        const maxTickets = await raffle.getMaxTickets();
        const playersCount = await raffle.getNumPlayers();
        const fee = await raffle.getEntranceFee();

        console.log(`Max Tickets: ${maxTickets}`);
        console.log(`Current Players: ${playersCount}`);
        console.log(`Ticket Prices: ${ethers.formatEther(fee)} ETH`);

        const needed = Number(maxTickets) - Number(playersCount);
        console.log(`Buying ${needed} tickets to trigger sellout...`);

        if (needed > 0) {
            for (let i = 0; i < needed; i++) {
                process.stdout.write(`Buying ticket ${i + 1}/${needed}... `);
                try {
                    const tx = await raffle.buyTicket({ value: fee });
                    await tx.wait();
                    console.log("✅");
                } catch (e) {
                    console.log("❌");
                    console.error(e.message);
                    break;
                }
            }
        } else {
            console.log("Raffle already sold out (or over sold). Should be triggering soon.");
        }
    }

    // Step C: Monitor Automation
    console.log("Waiting for Chainlink Automation to trigger 'CALCULATING'...");

    const startTime = Date.now();
    const TIMEOUT = 5 * 60 * 1000; // 5 mins

    let calculatingFound = false;
    let oldRaffleCount = raffles.length;

    while (Date.now() - startTime < TIMEOUT) {
        // Refresh state
        state = await raffle.getRaffleState();

        if (state.toString() === "1" && !calculatingFound) {
            console.log("✨ State changed to CALCULATING! Automation worked.");
            calculatingFound = true;
            console.log("Waiting for Chainlink VRF to pick winner...");
        }

        if (state.toString() === "2") {
            console.log("✨ State changed to CLOSED! Winner picked.");

            // Step E: Audit
            // Get last winner
            const winner = await raffle.getRecentWinner();
            console.log(`🏆 Winner: ${winner}`);
            if (winner === deployer.address) {
                console.log("   (That's you!)");
            }

            // Check factory for new raffle
            const newRaffles = await factory.getRaffles();
            if (newRaffles.length > oldRaffleCount) {
                console.log(`🆕 New Raffle Spawned: ${newRaffles[newRaffles.length - 1]}`);
            } else {
                console.log("⚠️ No new raffle spawned in factory yet (might take a moment).");
                // Wait a bit more to see if it spawns
                await new Promise(r => setTimeout(r, 5000));
                const finalCheck = await factory.getRaffles();
                if (finalCheck.length > oldRaffleCount) {
                    console.log(`🆕 New Raffle Spawned: ${finalCheck[finalCheck.length - 1]}`);
                }
            }

            // Try to find the event for prize amount?
            // Easier to check balance increase? Or just events.
            const filter = raffle.filters.WinnerPicked();
            const events = await raffle.queryFilter(filter, -10); // last 10 blocks
            if (events.length > 0) {
                const logs = events[events.length - 1]; // last one
                console.log(`💰 Prize Amount: ${ethers.formatEther(logs.args[1])} ETH`); // args[1] is amount
            }

            break;
        }

        await new Promise(r => setTimeout(r, 5000)); // sleep 5s
    }

    if (Date.now() - startTime >= TIMEOUT) {
        console.log("⏳ Timeout waiting for flow to complete.");
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
