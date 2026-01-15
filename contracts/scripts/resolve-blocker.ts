
import { ethers } from "hardhat";

async function main() {
    const factoryAddress = "0xE50Cba1bCB947F08487aAD84B37ab32D3Edd4FDB";
    console.log(`Checking Factory: ${factoryAddress}`);

    const factory = await ethers.getContractAt("LottoFactory", factoryAddress);
    const raffles = await factory.getRaffles();

    console.log(`Found ${raffles.length} raffles.`);

    if (raffles.length === 0) {
        console.log("No raffles found. Safe to spawn.");
        return;
    }

    const lastRaffleAddress = raffles[raffles.length - 1];
    console.log(`Last Raffle: ${lastRaffleAddress}`);

    const raffle = await ethers.getContractAt("Raffle", lastRaffleAddress);
    const state = await raffle.getRaffleState();
    const players = await raffle.getNumPlayers();
    const balance = await ethers.provider.getBalance(lastRaffleAddress);
    const entranceFee = await raffle.getEntranceFee();
    const maxTickets = await raffle.getMaxTickets();
    const lastTimestamp = await raffle.getLastTimeStamp();
    const interval = await raffle.getInterval();

    console.log(`
    State: ${state} (0=OPEN, 1=CALC, 2=CLOSED)
    Players: ${players}
    Max Tickets: ${maxTickets}
    Balance: ${ethers.formatEther(balance)} ETH
    Entrance Fee: ${ethers.formatEther(entranceFee)} ETH
    Time Ended: ${Number(lastTimestamp) + Number(interval) < Date.now() / 1000}
    `);

    // Resolution Logic
    if (state.toString() === "0") {
        console.log("Raffle is OPEN.");
        if (Number(players) < Number(maxTickets)) {
            console.log("Buying 1 ticket to see if it refreshes...");
            // Just verifying we can interact
            // To close it, we might need to wait or buy out.
        }
    } else if (state.toString() === "1") {
        console.log("Raffle is CALCULATING. Attempting Emergency Draw...");
        try {
            const tx = await raffle.emergencyDraw();
            await tx.wait();
            console.log("Emergency Draw Executed.");
        } catch (e) {
            console.log("Emergency Draw Failed", e.message);
        }
    } else {
        console.log("Raffle is CLOSED. You should be able to spawn.");
    }

}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
