import { ethers } from "hardhat";

async function main() {
    const vrfCoordinatorAddress = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
    const subscriptionId = "59784186355827571481918499793576861511711427999704478400086178388893170893369";

    const [deployer] = await ethers.getSigners();
    console.log("Checking subscription details...");

    const abi = [
        "function getSubscription(uint256 subId) external view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address owner, address[] memory consumers)"
    ];

    const coordinator = await ethers.getContractAt(abi, vrfCoordinatorAddress);

    try {
        const result = await coordinator.getSubscription(subscriptionId);
        console.log("--- Subscription Details ---");
        console.log("Balance (LINK):", ethers.formatEther(result.balance));
        console.log("Native Balance:", ethers.formatEther(result.nativeBalance));
        console.log("Request Count:", result.reqCount.toString());
        console.log("Current Owner:", result.owner);
        console.log("Consumers:", result.consumers);

        // Check if our deployer is the owner
        if (result.owner.toLowerCase() === deployer.address.toLowerCase()) {
            console.log("✅ YOU (Deployer) are the owner.");
        } else {
            console.log("❌ You are NOT the owner.");
            if (result.owner === "0x2e37b9Be2A40d02233223369eF17Cd95f82f2f61") {
                console.log("👉 The OLD LottoFactory owns it.");
            } else if (result.owner === "0x8A349b6487630497BE0C2eD6080cA13f51874579") {
                console.log("🎉 The NEW LottoFactory ALREADY owns it!");
            }
        }

    } catch (error: any) {
        console.error("Error fetching subscription:", error.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
