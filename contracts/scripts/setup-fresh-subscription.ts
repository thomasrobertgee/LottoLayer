import { ethers } from "hardhat";

async function main() {
    const linkAddress = "0xE4aB69C077896252FAFBD49EFD26B5D171A32410";
    const vrfCoordinatorAddress = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
    const newFactoryAddress = "0x7357537b5401F57f429AF933cFd51f818579E54F";

    // Amount to fund: 1 LINK
    const fundAmount = ethers.parseEther("1.0");

    const [deployer] = await ethers.getSigners();
    console.log("Using account:", deployer.address);

    // 1. Check LINK Balance
    const link = await ethers.getContractAt("IERC20", linkAddress);
    const balance = await link.balanceOf(deployer.address);
    console.log("Current LINK Balance:", ethers.formatEther(balance));

    if (balance < fundAmount) {
        throw new Error("❌ Insufficient LINK. Please faucet more LINK to your wallet.");
    }

    // 2. Create New Subscription
    console.log("\n--- Creating Fresh Subscription ---");
    // Interface for CreateSubscription
    const coordinatorAbi = [
        "function createSubscription() external returns (uint256 subId)",
        "function fundSubscription(uint256 subId, uint96 amount) external",
        "function requestSubscriptionOwnerTransfer(uint256 subId, address newOwner) external",
        "function addConsumer(uint256 subId, address consumer) external"
    ];
    const coordinator = await ethers.getContractAt(coordinatorAbi, vrfCoordinatorAddress);

    const createTx = await coordinator.createSubscription();
    console.log("Create Sub Tx:", createTx.hash);
    const createReceipt = await createTx.wait();

    // Extract Sub ID from logs (Event: SubscriptionCreated(uint256 indexed subId, address owner))
    // Topic 0: Sig, Topic 1: subId
    const subIdHex = createReceipt.logs[0].topics[1];
    const newSubId = BigInt(subIdHex).toString();
    console.log("✨ New Subscription Created ID:", newSubId);

    // 3. Fund Subscription (TransferAndCall is better but fundSubscription requires allowance approval usually)
    // Actually VRF v2.5 might separate this. Coordinator.fundSubscription works if LINK is approved.
    // 3. Fund Subscription (Using transferAndCall)
    console.log("\n--- Funding Subscription via transferAndCall ---");
    const linkToken = await ethers.getContractAt([
        "function transferAndCall(address to, uint256 value, bytes data) external returns (bool success)",
        "function balanceOf(address owner) external view returns (uint256)"
    ], linkAddress);

    console.log("Transferring LINK...");
    // AbiCoder needs to extend ethers... in ethers v6 it is ethers.AbiCoder.defaultAbiCoder()
    const fundTx = await linkToken.transferAndCall(vrfCoordinatorAddress, fundAmount, ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [newSubId]));
    console.log("Fund Tx:", fundTx.hash);
    await fundTx.wait();
    console.log("✅ Funded with " + ethers.formatEther(fundAmount) + " LINK");

    // 4. Request Transfer to New Factory
    console.log("\n--- Requesting Transfer to New Factory ---");
    const reqTx = await coordinator.requestSubscriptionOwnerTransfer(newSubId, newFactoryAddress);
    await reqTx.wait();
    console.log("✅ Transfer Requested.");

    // 5. Factory Accepts
    console.log("\n--- Factory Accepting Ownership ---");
    const LottoFactory = await ethers.getContractAt("LottoFactory", newFactoryAddress);
    const acceptTx = await LottoFactory.acceptSubscriptionOwnerTransfer(newSubId);
    await acceptTx.wait();
    console.log("✅ Ownership Accepted.");

    // 6. Set ID
    console.log("\n--- Setting Subscription ID in Factory ---");
    const setTx = await LottoFactory.setSubscriptionId(newSubId);
    await setTx.wait();
    console.log("✅ Subscription ID Set.");

    // 7. Verify with Test Raffle
    console.log("\n--- Deploying Test Raffle ---");
    // createRaffle(price, max, duration, rewardToken)
    // Use Native Reward (address(0))
    const raffleTx = await LottoFactory.createRaffle(
        ethers.parseEther("0.00005"), // Micro-Fee
        5, // Micro-Cap
        300,
        ethers.ZeroAddress,
        1
    );
    const raffleReceipt = await raffleTx.wait();

    // Find log
    let newRaffleAddr;
    for (const log of raffleReceipt.logs) {
        try {
            const p = LottoFactory.interface.parseLog(log);
            if (p && p.name === "RaffleCreated") {
                newRaffleAddr = p.args[0];
                break;
            }
        } catch (e) { }
    }

    console.log("✨ Test Raffle Deployed:", newRaffleAddr);
    console.log("🎉 SYSTEM FULLY OPERATIONAL WITH NEW SUBSCRIPTION!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
