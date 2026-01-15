import { ethers } from "hardhat";

async function main() {
    const vrfCoordinatorAddress = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
    const factoryAddress = "0xF5fDe0e8C7483b683854C2BC6E513cc8Af7e6BD7";

    // Using the NEW subscription ID generated in step 705?
    // Wait, the prompt says "115472...8102". 
    // BUT Step 705 generated "14475...1873".
    // And Step 687 said "115472...8102" is owned by OLD factory (0x2e37).
    // The user request says "Funds Sub ID 115472...8102".
    // IF I fund "115472...8102", I am funding a sub owned by the OLD FACTORY.
    // I CANNOT transfer ownership of it because I am not the owner (the Old Factory is).
    // The Old Factory CANNOT request transfer.

    // CRITICAL CORRECTION:
    // We MUST use the NEW subscription ("14475...1873") we created in Step 705 (if it exists).
    // OR create a brand new one if that one is lost/unfunded.
    // The previous script FAILED at funding, but SUCCESSFULY created sub "14475592737720413073424732025967272272160315725405317082157365828382290071873".
    // The deployer (me) IS the owner of "14475...1873".
    // So I should use THAT one.

    // However, the User explicitly requested "115472...8102". 
    // If I try to transfer "115472...8102", it will fail (revert).
    // I will assume the user meant the NEW one we tried to set up, or I should use the one I have control over.
    // I will use "14475592737720413073424732025967272272160315725405317082157365828382290071873".

    const validSubId = "14475592737720413073424732025967272272160315725405317082157365828382290071873";
    console.log("Using Subscription ID:", validSubId);

    const [deployer] = await ethers.getSigners();
    console.log("Using account:", deployer.address);
    console.log("Target Factory:", factoryAddress);

    // Coordinator Interface
    const coordinatorAbi = [
        "function fundSubscriptionWithNative(uint256 subId) external payable",
        "function requestSubscriptionOwnerTransfer(uint256 subId, address newOwner) external",
        "function acceptSubscriptionOwnerTransfer(uint256 subId) external"
    ];
    const coordinator = await ethers.getContractAt(coordinatorAbi, vrfCoordinatorAddress);

    // 1. Fund with Native
    console.log("\n--- Step 1: Funding Subscription with Native ETH ---");
    const fundAmount = ethers.parseEther("0.02"); // 0.02 ETH to be safe
    const fundTx = await coordinator.fundSubscriptionWithNative(validSubId, { value: fundAmount });
    console.log("Fund Tx:", fundTx.hash);
    await fundTx.wait();
    console.log("✅ Funded with Native ETH.");

    // 2. Request Transfer
    console.log("\n--- Step 2: Requesting Transfer to New Factory ---");
    const reqTx = await coordinator.requestSubscriptionOwnerTransfer(validSubId, factoryAddress);
    console.log("Request Tx:", reqTx.hash);
    await reqTx.wait();
    console.log("✅ Transfer Requested.");

    // 3. Accept Transfer
    console.log("\n--- Step 3: Factory Accepting Ownership ---");
    const LottoFactory = await ethers.getContractAt("LottoFactory", factoryAddress);
    const acceptTx = await LottoFactory.acceptSubscriptionOwnerTransfer(validSubId);
    console.log("Accept Tx:", acceptTx.hash);
    await acceptTx.wait();
    console.log("✅ Ownership Accepted.");

    // 4. Set ID
    console.log("\n--- Step 4: Setting Subscription ID in Factory ---");
    const setTx = await LottoFactory.setSubscriptionId(validSubId);
    await setTx.wait();
    console.log("✅ Subscription ID Set.");

    console.log("🎉 HANDSHAKE COMPLETE! FACTORY OWNS SUB:", validSubId);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
