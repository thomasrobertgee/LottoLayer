
import { ethers, run } from "hardhat";

async function main() {
    console.log("🚀 Deploying LottoFactory V3 (Failsafe Included)...");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying as:", deployer.address);

    // Configuration for Base Sepolia
    const vrfCoordinatorAddress = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
    const gasLane = "0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71"; // 30 gwei Key Hash
    const callbackGasLimit = 2500000;

    // 1. Create Subscription Programmatically
    console.log("\n--- Creating New VRF Subscription ---");
    const coordinatorAbi = [
        "function createSubscription() external returns (uint256 subId)",
        "function fundSubscriptionWithNative(uint256 subId) external payable",
        "function addConsumer(uint256 subId, address consumer) external"
    ];
    const coordinator = await ethers.getContractAt(coordinatorAbi, vrfCoordinatorAddress);

    const createTx = await coordinator.createSubscription();
    const createReceipt = await createTx.wait();

    // Parse log for Sub ID
    const subIdHex = createReceipt.logs[0].topics[1];
    const newSubId = BigInt(subIdHex).toString();
    console.log(`✅ Subscription Created: ${newSubId}`);

    // 2. Fund Subscription with Native ETH
    console.log("\n--- Funding Subscription (0.004 ETH) ---");
    try {
        const fundTx = await coordinator.fundSubscriptionWithNative(newSubId, { value: ethers.parseEther("0.004") });
        await fundTx.wait();
        console.log("✅ Subscription Funded.");
    } catch (e: any) {
        console.log("⚠️ Funding failed (insufficient balance?):", e.message);
        console.log("Please fund manually later.");
    }

    // 3. Deploy Factory
    console.log("\n--- Deploying Factory Contract ---");
    const Factory = await ethers.getContractFactory("LottoFactory");
    const factory = await Factory.deploy(
        vrfCoordinatorAddress,
        gasLane,
        newSubId,
        callbackGasLimit
    );
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log(`✅ LottoFactory V2 Deployed at: ${factoryAddress}`);

    // 4. Add Factory as Consumer (to manage sub)
    console.log("\n--- authorizing Factory as Consumer ---");
    // Factory manages the sub, so it must be a consumer itself? 
    // Actually, only the Raffles need to be consumers.
    // The Factory is the OWNER of the subscription (once we transfer it).
    // Wait, we created it as 'deployer'. We need to transfer ownership to Factory?
    // In V1 we did this. In V2, let's stick to this pattern so Factory can addConsumers.

    // Transfer Sub Ownership to Factory
    console.log("Transferring Subscription Ownership to Factory...");
    // We need IVRFCoordinator interface for requestSubscriptionOwnerTransfer
    const coordFull = await ethers.getContractAt("IVRFCoordinatorV2Plus", vrfCoordinatorAddress);

    const reqTx = await coordFull.requestSubscriptionOwnerTransfer(newSubId, factoryAddress);
    await reqTx.wait();
    console.log("Ownership Transfer Requested.");

    const acceptTx = await factory.acceptSubscriptionOwnerTransfer(newSubId);
    await acceptTx.wait();
    console.log("✅ Ownership Transferred to Factory.");

    // 5. Verification
    console.log("\n--- verifying Contract ---");
    try {
        await run("verify:verify", {
            address: factoryAddress,
            constructorArguments: [
                vrfCoordinatorAddress,
                gasLane,
                newSubId,
                callbackGasLimit
            ],
        });
    } catch (e: any) {
        console.log("Verification failed/skipped:", e.message);
    }

    console.log("\n==================================================");
    console.log("DEPLOYMENT COMPLETE");
    console.log("Factory:", factoryAddress);
    console.log("Sub ID:", newSubId);
    console.log("==================================================");
    console.log("NEXT STEPS:");
    console.log("1. Register New Chainlink Upkeep (Automation) for:", factoryAddress);
    console.log("2. Update frontend constants.ts");
    console.log("==================================================");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
