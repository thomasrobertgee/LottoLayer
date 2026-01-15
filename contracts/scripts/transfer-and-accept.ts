import { ethers } from "hardhat";

async function main() {
    const vrfCoordinatorAddress = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
    const factoryAddress = "0x8A349b6487630497BE0C2eD6080cA13f51874579";
    const subscriptionId = "11547292710490310652319982786260130824090068706254455126863651989605687278102";

    const [deployer] = await ethers.getSigners();
    console.log("Using account:", deployer.address);
    console.log("Target Factory:", factoryAddress);
    console.log("Subscription ID:", subscriptionId);

    // --- Step 1: Request Transfer ---
    console.log("\n--- Step 1: Requesting Subscription Transfer ---");
    // Minimal ABI for requestSubscriptionOwnerTransfer
    const coordinatorAbi = [
        "function requestSubscriptionOwnerTransfer(uint256 subId, address newOwner) external"
    ];
    const coordinator = await ethers.getContractAt(coordinatorAbi, vrfCoordinatorAddress);

    try {
        const reqTx = await coordinator.requestSubscriptionOwnerTransfer(subscriptionId, factoryAddress);
        console.log("Request Transaction sent:", reqTx.hash);
        await reqTx.wait();
        console.log("✅ Transfer Requested.");
    } catch (error: any) {
        console.log("⚠️ Request failed (maybe already requested?):", error.message);
    }

    // --- Step 2: Accept Transfer ---
    console.log("\n--- Step 2: Factory Accepting Ownership ---");
    const LottoFactory = await ethers.getContractAt("LottoFactory", factoryAddress);

    // We added acceptSubscriptionOwnerTransfer(uint256) to the Factory
    const acceptTx = await LottoFactory.acceptSubscriptionOwnerTransfer(subscriptionId);
    console.log("Accept Transaction sent:", acceptTx.hash);
    await acceptTx.wait();
    console.log("✅ Ownership Accepted.");

    // --- Step 3: Set ID ---
    console.log("\n--- Step 3: Setting Subscription ID ---");
    const setTx = await LottoFactory.setSubscriptionId(subscriptionId);
    console.log("Set ID Transaction sent:", setTx.hash);
    await setTx.wait();
    console.log("✅ Subscription ID Set.");

    console.log("\n🎉 Handshake Complete! The Factory now owns the subscription.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
