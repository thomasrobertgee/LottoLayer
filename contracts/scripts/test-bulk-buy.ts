
import { ethers } from "hardhat";

async function main() {
    const factoryAddress = "0x61E6de8c545fd8Af592d8BDdEB9c946de9322B3F";
    const [buyer] = await ethers.getSigners();
    console.log(`Testing Bulk Buy with Account: ${buyer.address}`);

    const factory = await ethers.getContractAt("LottoFactory", factoryAddress);

    const raffles = await factory.getRaffles();
    if (raffles.length === 0) {
        console.error("No raffles found. Please spawn one first.");
        return;
    }
    const raffleAddr = raffles[raffles.length - 1]; // Latest
    console.log(`Targeting Raffle: ${raffleAddr}`);

    const raffle = await ethers.getContractAt("Raffle", raffleAddr);

    // Initial State check
    const initialPlayers = await raffle.getNumPlayers();
    console.log(`Initial Players: ${initialPlayers}`);

    const fee = await raffle.getEntranceFee();
    const ticketsToBuy = 3;
    const totalCost = fee * BigInt(ticketsToBuy);

    console.log(`Attempting to buy ${ticketsToBuy} tickets...`);
    console.log(`Single Price: ${ethers.formatEther(fee)} ETH`);
    console.log(`Total Cost: ${ethers.formatEther(totalCost)} ETH`);

    try {
        const tx = await raffle.buyTickets(ticketsToBuy, { value: totalCost });
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log("✅ Transaction Confirmed!");

        const finalPlayers = await raffle.getNumPlayers();
        console.log(`Final Players: ${finalPlayers}`);

        if (Number(finalPlayers) === Number(initialPlayers) + ticketsToBuy) {
            console.log("🎉 SUCCESS: Correct number of players added.");
        } else {
            console.error("❌ FAILURE: Player count mismatch.");
        }

    } catch (e: any) {
        console.error("❌ Bulk Buy Failed:", e.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
