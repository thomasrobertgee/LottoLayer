
import { ethers } from "hardhat";

async function main() {
    const raffleAddress = "0x466045Bc94ACE7913Ad65CB68c2B22Dd3Daf6f7A"; // The stuck raffle
    console.log(`Unsticking Raffle: ${raffleAddress}`);

    const [signer] = await ethers.getSigners();
    const raffle = await ethers.getContractAt("Raffle", raffleAddress, signer);

    const fee = await raffle.getEntranceFee();
    console.log(`Entrance Fee: ${ethers.formatEther(fee)} ETH`);

    // 1. Buy Ticket
    console.log("Buying 1 ticket...");
    const tx = await raffle.buyTicket({ value: fee });
    await tx.wait();
    console.log("✅ Ticket Bought.");

    // 2. Wait slightly
    await new Promise(r => setTimeout(r, 5000));

    // 3. Force Perform Upkeep (since time is passed and players > 0 now)
    console.log("Checking Upkeep...");
    const check = await raffle.checkUpkeep("0x");
    console.log(`Upkeep Needed: ${check[0]}`);

    if (check[0]) {
        console.log("Performing Upkeep...");
        const tx2 = await raffle.performUpkeep("0x");
        await tx2.wait();
        console.log("✅ Upkeep Performed! Raffle should be CALCULATING/CLOSED.");
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
