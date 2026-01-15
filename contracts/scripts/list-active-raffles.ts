
import { ethers } from "hardhat";

async function main() {
    const factoryAddress = "0xCc75f09F5208848502BFF663800F7A77ddc24c92";
    console.log(`Querying Factory at ${factoryAddress}...`);

    const factory = await ethers.getContractAt("LottoFactory", factoryAddress);

    // Try getActiveRaffles if it exists, otherwise getRaffles
    try {
        const activeRaffles = await factory.getActiveRaffles();
        console.log("Active Raffles:", activeRaffles);

        for (const raffleAddr of activeRaffles) {
            const raffle = await ethers.getContractAt("Raffle", raffleAddr);
            const state = await raffle.getRaffleState();
            const balance = await ethers.provider.getBalance(raffleAddr);
            const players = await raffle.getNumPlayers();
            console.log(`Raffle ${raffleAddr} | State: ${state} | Balance: ${ethers.formatEther(balance)} ETH | Players: ${players}`);
        }

    } catch (e) {
        console.log("getActiveRaffles failed, trying getRaffles...");
        const allRaffles = await factory.getRaffles();
        console.log("All Raffles:", allRaffles);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
