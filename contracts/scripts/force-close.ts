
import { ethers } from "hardhat";

async function main() {
    const raffleAddress = "0xB7f272b82640D8B30dB565AC5EE65752EB0aD9E9";
    console.log(`Force Closing Stuck Raffle: ${raffleAddress}`);

    const [deployer] = await ethers.getSigners();
    console.log(`Acting as: ${deployer.address}`);

    const raffle = await ethers.getContractAt("Raffle", raffleAddress);

    try {
        console.log("Attempting emergencyDraw...");
        // Increase gas limit in case of complex logic revert/OOG
        const tx = await raffle.emergencyDraw({ gasLimit: 500000 });
        console.log("Tx sent:", tx.hash);
        await tx.wait();
        console.log("✅ Raffle Closed Successfully!");
    } catch (e) {
        console.error("❌ Failed to close:", e.message);
        if (e.data) {
            console.error("Revert Data:", e.data);
            try {
                const decoded = raffle.interface.parseError(e.data);
                console.log("Decoded Error:", decoded);
            } catch { }
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
