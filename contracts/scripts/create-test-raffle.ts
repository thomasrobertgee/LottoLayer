import { ethers } from "hardhat";

async function main() {
    const factoryAddress = "0xe92bC4005fd1359aA8efef1BeCd4884b103ff58C";
    const [deployer] = await ethers.getSigners();

    console.log("Interacting with LottoFactory at:", factoryAddress);
    console.log("Using account:", deployer.address);

    const LottoFactory = await ethers.getContractAt("LottoFactory", factoryAddress);

    // Raffle Parameters
    const ticketPrice = ethers.parseEther("0.001"); // 0.001 ETH/MATIC
    const maxTickets = 100;
    const duration = 300; // 5 minutes

    console.log(`Creating raffle with Price: ${ethers.formatEther(ticketPrice)}, MaxTickets: ${maxTickets}, Duration: ${duration}s...`);

    const tx = await LottoFactory.createRaffle(ticketPrice, maxTickets, duration);
    console.log("Creation Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");

    // Parse logs to find RaffleCreated event
    // Event: RaffleCreated(address indexed raffleAddress)
    // The logs in receipt contain the event. 
    // We can filter using the contract interface.

    let newRaffleAddress;
    for (const log of receipt.logs) {
        try {
            const parsedLog = LottoFactory.interface.parseLog(log);
            if (parsedLog && parsedLog.name === "RaffleCreated") {
                newRaffleAddress = parsedLog.args[0];
                break;
            }
        } catch (e) {
            // ignore logs that don't belong to this interface
        }
    }

    if (!newRaffleAddress) {
        throw new Error("RaffleCreated event not found in logs");
    }

    console.log("✨ New Raffle Deployed at:", newRaffleAddress);

    // Now buy a ticket
    console.log("Buying 1 ticket...");
    const Raffle = await ethers.getContractAt("Raffle", newRaffleAddress);

    const buyTx = await Raffle.buyTicket({ value: ticketPrice });
    console.log("Buy Transaction sent:", buyTx.hash);

    await buyTx.wait();
    console.log("✅ Ticket purchased successfully!");

    console.log("Verify on BaseScan:");
    console.log(`https://sepolia.basescan.org/address/${newRaffleAddress}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
