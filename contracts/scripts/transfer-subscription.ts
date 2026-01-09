import { ethers } from "hardhat";

async function main() {
    const vrfCoordinatorAddress = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
    const newFactoryAddress = "0x2e37b9Be2A40d02233223369eF17Cd95f82f2f61";
    const subscriptionId = "11547292710490310652319982786260130824090068706254455126863651989605687278102";

    const [deployer] = await ethers.getSigners();
    console.log("Transferring subscription ownership using account:", deployer.address);

    // Minimal ABI for requestSubscriptionOwnerTransfer
    const abi = [
        "function requestSubscriptionOwnerTransfer(uint256 subId, address newOwner) external"
    ];

    const coordinator = await ethers.getContractAt(abi, vrfCoordinatorAddress);

    console.log(`Requesting transfer of SubID ${subscriptionId} to ${newFactoryAddress}...`);

    const tx = await coordinator.requestSubscriptionOwnerTransfer(subscriptionId, newFactoryAddress);
    console.log("Transaction sent:", tx.hash);

    await tx.wait();
    console.log("✅ Request sent successfully.");
    console.log("Next step: Call acceptSubscriptionOwnerTransfer on the LottoFactory.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
