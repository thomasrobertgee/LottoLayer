import { ethers } from "hardhat";

async function main() {
    const raffleAddress = "0x31d9659AAEE92D74e03a3898d8273CF61cD17355";
    const vrfCoordinatorAddress = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
    const subId = "73097331539132244121154602106415664381922857953691306084417385416509670241206";

    console.log("🔍 DEBUGGING RAFFLE:", raffleAddress);

    const raffle = await ethers.getContractAt("Raffle", raffleAddress);

    // 1. Check State
    try {
        const state = await raffle.getRaffleState();
        console.log("State:", state.toString(), state == 0n ? "(OPEN)" : "(CALCULATING)");
    } catch (e) {
        console.log("❌ Failed to get State:", e.message);
    }

    // 2. Check Entrance Fee
    try {
        const fee = await raffle.getEntranceFee();
        console.log("Entrance Fee:", ethers.formatEther(fee), "ETH");
    } catch (e) {
        console.log("❌ Failed to get Fee:", e.message);
    }

    // 3. Check Subscription Consumer Status
    console.log("\n--- Checking Subscription Consumers ---");
    const coordinatorAbi = [
        "function getSubscription(uint256 subId) external view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address owner, address[] memory consumers)"
    ];
    const coordinator = await ethers.getContractAt(coordinatorAbi, vrfCoordinatorAddress);

    try {
        const sub = await coordinator.getSubscription(subId);
        console.log("Owner:", sub.owner);
        console.log("Native Balance:", ethers.formatEther(sub.nativeBalance));
        console.log("Consumers:", sub.consumers);

        const isConsumer = sub.consumers.includes(raffleAddress);
        if (isConsumer) {
            console.log("✅ Raffle IS a valid consumer.");
        } else {
            console.error("❌ Raffle is NOT a consumer! Factory addConsumer failed?");
        }
    } catch (e) {
        console.error("❌ Failed to get Subscription:", e.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
