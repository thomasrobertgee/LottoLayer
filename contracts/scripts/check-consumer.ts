
import { ethers } from "hardhat";

async function main() {
    const coordinatorAddress = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
    const subId = "96053508822311408016122142460723719939506736243225886096922585931436450228981";
    const stuckRaffle = "0x252e798Ef4c1B6D4F81b27cc44b169b11420440C";

    console.log(`Checking Subscription ${subId} for consumer ${stuckRaffle}...`);

    const coordinatorAbi = [
        "function getSubscription(uint256 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] consumers)"
    ];
    const coordinator = await ethers.getContractAt(coordinatorAbi, coordinatorAddress);

    try {
        const subData = await coordinator.getSubscription(subId);
        console.log("Subscription Owner:", subData.owner);
        console.log("Balance:", ethers.formatEther(subData.balance), "LINK");
        console.log("Consumers:", subData.consumers);

        const isConsumer = subData.consumers.some(c => c.toLowerCase() === stuckRaffle.toLowerCase());

        if (isConsumer) {
            console.log("✅ Raffle IS a valid consumer.");
        } else {
            console.log("❌ Raffle is NOT a consumer. This is the problem!");
            console.log("The request was likely rejected by the Coordinator.");
        }

    } catch (e) {
        console.error("Error fetching subscription:", e.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
