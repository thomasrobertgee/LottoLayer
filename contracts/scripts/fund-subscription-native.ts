
import { ethers } from "hardhat";

async function main() {
    const vrfCoordinatorAddress = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
    const subId = "90430583857947891518047754884046361094240409583543649430657491732863964007638";
    const amount = ethers.parseEther("0.004"); // Fund with 0.004 ETH

    const [deployer] = await ethers.getSigners();
    console.log(`Funding Subscription ${subId} with ${ethers.formatEther(amount)} ETH`);
    console.log(`From: ${deployer.address}`);

    const coordinatorAbi = [
        "function fundSubscriptionWithNative(uint256 subId) external payable"
    ];

    const coordinator = await ethers.getContractAt(coordinatorAbi, vrfCoordinatorAddress);

    try {
        const tx = await coordinator.fundSubscriptionWithNative(subId, { value: amount });
        console.log("Tx Sent:", tx.hash);
        await tx.wait();
        console.log("✅ Subscription Funded Successfully!");
    } catch (e: any) {
        console.error("❌ Failed to fund:", e.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
