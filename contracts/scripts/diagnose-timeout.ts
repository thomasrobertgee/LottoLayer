
import { ethers } from "hardhat";

async function main() {
    const raffleAddress = "0xBa09DA67271f7fd6344030673Eb9f9e6136B0FB3";
    const factoryAddress = "0xCc75f09F5208848502BFF663800F7A77ddc24c92";

    console.log(`Diagnosing Timeout for Raffle: ${raffleAddress}`);

    const [signer] = await ethers.getSigners();

    // 1. Check Raffle Config
    const raffle = await ethers.getContractAt("Raffle", raffleAddress);

    // Note: i_callbackGasLimit is private in the contract code I see? 
    // Wait, in Step 2662 view: `uint32 private immutable i_callbackGasLimit;`.
    // We cannot read it directly unless there is a getter.
    // There is no getter for it in the code at Step 2662.
    // However, we can check the Factory's recorded value if we stored it?
    // The Factory has `i_callbackGasLimit` public?
    // Step 2514: `uint32 public immutable i_callbackGasLimit;`. YES.

    const factory = await ethers.getContractAt("LottoFactory", factoryAddress);
    try {
        const gasLimit = await factory.i_callbackGasLimit();
        console.log(`Factory Configured Callback Gas Limit: ${gasLimit.toString()}`);
    } catch (e) {
        console.log("Could not read i_callbackGasLimit from Factory:", e.message);
    }

    // 2. Check Subscription
    const subId = await factory.s_subscriptionId();
    console.log(`Subscription ID: ${subId}`);

    // 3. Check State
    const state = await raffle.getRaffleState();
    console.log(`Raffle State: ${state} (Expect 1 = CALCULATING)`);

    const owner = await raffle.owner();
    console.log(`Raffle Owner: ${owner}`);
    console.log(`Signer: ${signer.address}`);

    if (owner.toLowerCase() === signer.address.toLowerCase()) {
        console.log("✅ Signer IS the owner. Can perform emergencyDraw.");
    } else {
        console.log("❌ Signer is NOT the owner.");
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
