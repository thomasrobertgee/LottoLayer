import { ethers } from "hardhat";

async function main() {
    const factoryAddress = "0xc271eF2e57baC2bbaF6ffE293274678f28B6610F";

    console.log("\n🚀 STARTING LIVE TEST FLOW 🚀");
    // Connect to Factory
    const factory = await ethers.getContractAt("LottoFactory", factoryAddress);
    console.log("Connected to Factory at:", factoryAddress);

    // 1. Create a Small Raffle
    console.log("\n--- Step 1: Creating Multi-Winner Raffle (3 Winners) ---");
    const ticketPrice = ethers.parseEther("0.0001"); // Cheap ticket
    const maxTickets = 3; // Small size for fast trigger
    const duration = 3600; // 1 hour
    const rewardToken = ethers.ZeroAddress; // Native ETH
    const numWinners = 3; // Test 3 winners split

    const createTx = await factory.createRaffle(
        ticketPrice,
        maxTickets,
        duration,
        rewardToken,
        numWinners
    );
    console.log("Creation Tx Sent:", createTx.hash);
    const createReceipt = await createTx.wait();

    // Find Raffle Address from logs
    // Event: RaffleCreated(address indexed raffleAddress)
    // It's usually the last event or close to it.
    // Parse logs to be safe.
    let raffleAddress;
    const iface = factory.interface;
    for (const log of createReceipt.logs) {
        try {
            const parsed = iface.parseLog(log);
            if (parsed && parsed.name === "RaffleCreated") {
                raffleAddress = parsed.args[0];
                break;
            }
        } catch (e) { }
    }

    if (!raffleAddress) {
        console.error("❌ Could not find RaffleCreated event!");
        return;
    }
    console.log("✅ Raffle Created at:", raffleAddress);

    // 2. Buy Tickets to Fill it
    const raffle = await ethers.getContractAt("Raffle", raffleAddress);

    console.log("\n--- Step 2: Buying Tickets (Auto-Trigger Test) ---");
    const [buyer] = await ethers.getSigners();
    console.log("Buyer:", buyer.address);

    for (let i = 1; i <= maxTickets; i++) {
        console.log(`Buying Ticket ${i}/${maxTickets}...`);
        const buyTx = await raffle.buyTicket({ value: ticketPrice });

        // If this is the last ticket, we expect the VRF Request to fire within this TX
        const receipt = await buyTx.wait();
        console.log(`Ticket ${i} Confirmed. (Gas: ${receipt.gasUsed})`);

        if (i === maxTickets) {
            console.log("🎯 Last Ticket Bought! Checking for VRF Request...");
            // Check logs for RequestSent or similar from Coordinator?
            // Or just check Raffle State.
        }
    }

    // 3. Verify State
    console.log("\n--- Step 3: Verifying Auto-Trigger ---");
    const state = await raffle.getRaffleState();
    // Enum: OPEN=0, CALCULATING=1
    if (state === 1n) {
        console.log("✅ SUCCESS: Raffle State is CALCULATING (1).");
        console.log("🎉 The Sold-Out Trigger worked! VRF Request sent.");
        const recentWinner = await raffle.getRecentWinner();
        console.log("Current Winner (Should be 0x0 until callback):", recentWinner);
        console.log("Wait for Chainlink VRF fulfillment (usually 1-2 mins) to see the winner on the frontend!");
    } else {
        console.error("❌ FAILURE: Raffle State is still OPEN (0) or Unknown:", state);
        console.log("Did the subscription have funds?");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
