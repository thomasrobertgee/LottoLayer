import { ethers } from "hardhat";

async function main() {
    const factoryAddress = "0x8A349b6487630497BE0C2eD6080cA13f51874579";
    const subscriptionId = "11547292710490310652319982786260130824090068706254455126863651989605687278102";

    const [deployer] = await ethers.getSigners();
    console.log("Interacting with LottoFactory at:", factoryAddress);
    console.log("Using account:", deployer.address);

    const LottoFactory = await ethers.getContractAt("LottoFactory", factoryAddress);

    // 1. Accept Ownership
    console.log("1. Accepting Subscription Ownership...");
    const acceptTx = await LottoFactory.acceptSubscriptionOwnerTransfer(subscriptionId);
    console.log("Accept Transaction sent:", acceptTx.hash);
    await acceptTx.wait();
    console.log("✅ Ownership Accepted.");

    // 2. Set Subscription ID
    console.log("2. Setting Subscription ID in Factory...");
    const setTx = await LottoFactory.setSubscriptionId(subscriptionId);
    console.log("Set ID Transaction sent:", setTx.hash);
    await setTx.wait();
    console.log("✅ Subscription ID Set.");

    // 3. Deploy Test Raffle
    console.log("3. Deploying Test Raffle to verify Auto-Add Consumer...");
    const ticketPrice = ethers.parseEther("0.0001");
    const maxTickets = 10;
    const duration = 300; // 5 mins

    const createTx = await LottoFactory.createRaffle(ticketPrice, maxTickets, duration);
    console.log("Create Raffle Transaction sent:", createTx.hash);

    const receipt = await createTx.wait();

    // Check for RaffleCreated event
    let newRaffleAddress;
    for (const log of receipt.logs) {
        try {
            const parsedLog = LottoFactory.interface.parseLog(log);
            if (parsedLog && parsedLog.name === "RaffleCreated") {
                newRaffleAddress = parsedLog.args[0];
                break;
            }
        } catch (e) { }
    }

    if (newRaffleAddress) {
        console.log("✨ New Raffle Deployed at:", newRaffleAddress);
        console.log("✅ If this succeeded without revert, 'addConsumer' worked!");
        console.log("Verify on BaseScan that this address is now a consumer in your Chainlink Dashboard.");
    } else {
        console.error("❌ Failed to find RaffleCreated event.");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
