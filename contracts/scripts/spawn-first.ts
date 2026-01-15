
import { ethers } from "hardhat";

async function main() {
    const factoryAddress = "0xCc75f09F5208848502BFF663800F7A77ddc24c92";
    console.log(`Spawning First Raffle on Factory: ${factoryAddress}`);

    const factory = await ethers.getContractAt("LottoFactory", factoryAddress);

    // Params: price, maxTickets, duration, rewardToken, numWinners
    // 0.00005 ETH, 5 tickets, 2 minutes, Native, 1 winner
    const tx = await factory.createRaffle(
        ethers.parseEther("0.00005"),
        5,
        0,
        ethers.ZeroAddress,
        1
    );
    console.log("Tx sent:", tx.hash);
    await tx.wait();

    // Get new raffle
    const raffles = await factory.getRaffles();
    console.log(`✅ Raffle Spawned: ${raffles[0]}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
