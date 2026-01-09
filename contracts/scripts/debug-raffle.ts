import { ethers } from "hardhat";

async function main() {
    const raffleAddress = "0x72BeFBF10FE21271d95dA065Cc34368053Dc7AE8";
    const vrfCoordinatorAddress = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
    const subId = "29980143324600715001051206472717297898065167654102577580416011305443914466391";

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
