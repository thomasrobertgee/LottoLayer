
import { ethers } from "hardhat";

async function main() {
    const stuckRaffle = "0x252e798Ef4c1B6D4F81b27cc44b169b11420440C";
    console.log(`Checking parameters for Raffle: ${stuckRaffle}`);

    const raffle = await ethers.getContractAt("Raffle", stuckRaffle);

    try {
        const gasLimit = await raffle.i_callbackGasLimit();
        console.log(`Callback Gas Limit: ${gasLimit.toString()}`);

        if (gasLimit.toString() === "2500000") {
            console.log("✅ Gas Limit is correct (2.5M).");
        } else {
            console.log("❌ Gas Limit is WRONG. It should be 2.5M.");
            console.log(`Current: ${gasLimit.toString()}`);
        }
    } catch (e) {
        console.error("Error reading parameters:", e.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
