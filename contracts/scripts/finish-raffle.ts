import { ethers } from "hardhat";

async function main() {
    const raffleAddress = "0x72BeFBF10FE21271d95dA065Cc34368053Dc7AE8"; // The one we created

    console.log("🚀 Resuming Live Test on:", raffleAddress);

    // Connect with explicit ABI or contract name if artifact available
    // We can use getContractAt with name "Raffle"
    const raffle = await ethers.getContractAt("Raffle", raffleAddress);

    console.log("Connected.");

    // Check Reward Token (Critical for Buy Ticket Logic)
    const rewardToken = await raffle.getRewardToken();
    console.log("Reward Token:", rewardToken);

    if (rewardToken !== ethers.ZeroAddress) {
        console.warn("⚠️ Reward Token is NOT Native ETH! BuyTicket expects ERC20 approval.");
    } else {
        console.log("✅ Reward Token is Native ETH.");
    }

    // Check Fee
    const fee = await raffle.getEntranceFee();
    console.log("Entrance Fee:", ethers.formatEther(fee), "ETH");

    // Check Status
    const max = await raffle.getMaxTickets();
    let count = await raffle.getNumPlayers();
    console.log(`Status: ${count}/${max} Tickets Sold`);

    if (count >= max) {
        console.log("Detailed status: Raffle already full!");
        const state = await raffle.getRaffleState();
        console.log("State:", state == 1n ? "CALCULATING" : state.toString());
        return;
    }

    const [buyer] = await ethers.getSigners();
    const ticketsToBuy = Number(max - count);

    console.log(`Buying ${ticketsToBuy} tickets with manual Gas Limit...`);

    for (let i = 0; i < ticketsToBuy; i++) {
        console.log(`Buying ticket ${i + 1}...`);
        try {
            // Manual gas limit to bypass estimation errors
            const tx = await raffle.buyTicket({
                value: fee,
                gasLimit: 500000
            });
            console.log("Tx Sent:", tx.hash);
            await tx.wait();
            console.log("✅ Confirmed.");
        } catch (e: any) {
            console.error("❌ Failed:", e.reason || e.message);
            if (e.data) {
                console.log("Error Data:", e.data);
            }
            break;
        }
    }

    // Check Trigger
    const state = await raffle.getRaffleState();
    if (state === 1n) {
        console.log("🎉 SUCCESS! Raffle is CALCULATING.");
        console.log("The Sold-Out Trigger worked! VRF Request sent.");
    } else {
        console.log("⚠️ Raffle still OPEN. (Current Players:", (await raffle.getNumPlayers()).toString(), ")");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
