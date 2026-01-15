import { ethers } from "hardhat";

async function main() {
    const vrfCoordinatorAddress = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
    const factoryAddress = "0xc271eF2e57baC2bbaF6ffE293274678f28B6610F";

    // Amount to fund: 0.002 ETH
    const fundAmount = ethers.parseEther("0.002");

    const [deployer] = await ethers.getSigners();
    console.log("Using account:", deployer.address);
    // console.log("Account balance:", ethers.formatEther(await deployer.getBalance()));

    // 1. Create New Subscription
    console.log("\n--- Creating Fresh Subscription ---");
    const coordinatorAbi = [
        "function createSubscription() external returns (uint256 subId)",
        "function fundSubscriptionWithNative(uint256 subId) external payable",
        "function requestSubscriptionOwnerTransfer(uint256 subId, address newOwner) external",
        "function getSubscription(uint256 subId) external view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address owner, address[] memory consumers)"
    ];
    const coordinator = await ethers.getContractAt(coordinatorAbi, vrfCoordinatorAddress);

    const createTx = await coordinator.createSubscription();
    console.log("Create Sub Tx:", createTx.hash);
    const createReceipt = await createTx.wait();

    // Event: SubscriptionCreated(uint256 indexed subId, address owner)
    // subId is topic[1]
    const subIdHex = createReceipt.logs[0].topics[1];
    const newSubId = BigInt(subIdHex).toString();
    console.log("✨ New Subscription Created ID:", newSubId);

    // 2. Fund Subscription with Native
    console.log("\n--- Funding Subscription (0.002 ETH) ---");
    const fundTx = await coordinator.fundSubscriptionWithNative(newSubId, { value: fundAmount });
    console.log("Fund Tx:", fundTx.hash);
    await fundTx.wait();
    console.log("✅ Funded.");

    // 3. Request Transfer to Factory
    console.log("\n--- Requesting Transfer to Factory ---");
    const reqTx = await coordinator.requestSubscriptionOwnerTransfer(newSubId, factoryAddress);
    await reqTx.wait();
    console.log("✅ Transfer Requested.");

    // 4. Factory Accepts
    console.log("\n--- Factory Accepting Ownership ---");
    const LottoFactory = await ethers.getContractAt("LottoFactory", factoryAddress);
    const acceptTx = await LottoFactory.acceptSubscriptionOwnerTransfer(newSubId);
    await acceptTx.wait();
    console.log("✅ Ownership Accepted.");

    // 5. Set ID
    console.log("\n--- Setting Subscription ID in Factory ---");
    const setTx = await LottoFactory.setSubscriptionId(newSubId);
    await setTx.wait();
    console.log("✅ Subscription ID Set.");

    console.log("\n🎉 SYSTEM FULLY OPERATIONAL!");
    console.log("Factory:", factoryAddress);
    console.log("Subscription ID:", newSubId);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
