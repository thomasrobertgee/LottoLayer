
import { ethers } from "hardhat";

async function main() {
    const raffleAddress = "0xBa09DA67271f7fd6344030673Eb9f9e6136B0FB3";
    console.log(`Checking state for Raffle: ${raffleAddress}`);

    const raffle = await ethers.getContractAt("Raffle", raffleAddress);

    const state = await raffle.getRaffleState();
    const players = await raffle.getNumPlayers();
    const maxTickets = await raffle.getMaxTickets();

    console.log(`State: ${state} (0=OPEN, 1=CALC, 2=CLOSED)`);
    console.log(`Tickets: ${players} / ${maxTickets}`);

    const interval = await raffle.getInterval();
    const lastTimeStamp = await raffle.getLastTimeStamp();
    const block = await ethers.provider.getBlock("latest");
    const currentTime = block!.timestamp;

    console.log(`Interval: ${interval} seconds`);
    console.log(`Last Timestamp: ${lastTimeStamp}`);
    console.log(`Current Block Time: ${currentTime}`);
    console.log(`Time Passed: ${currentTime - Number(lastTimeStamp)} seconds`);
    console.log(`Did it Timeout? ${currentTime - Number(lastTimeStamp) > Number(interval)}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
