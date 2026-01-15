
import { ethers } from "hardhat";

async function main() {
    const raffleAddress = "0x466045Bc94ACE7913Ad65CB68c2B22Dd3Daf6f7A";
    const [deployer] = await ethers.getSigners();

    console.log(`User: ${deployer.address}`);
    const bal = await ethers.provider.getBalance(deployer.address);
    console.log(`User Balance: ${ethers.formatEther(bal)} ETH`);

    const raffle = await ethers.getContractAt("Raffle", raffleAddress);

    const token = await raffle.getRewardToken();
    console.log(`Reward Token: ${token}`);

    const fee = await raffle.getEntranceFee();
    console.log(`Fee: ${ethers.formatEther(fee)} ETH`);

    if (bal < fee) {
        console.error("Insufficient Funds!");
        return;
    }

    try {
        console.log("Buying ticket...");
        // Explicitly set gas limit to debug OOG
        const tx = await raffle.buyTicket({ value: fee, gasLimit: 500000 });
        console.log("Tx sent:", tx.hash);
        await tx.wait();
        console.log("Success!");
    } catch (e) {
        console.error("FAILED");
        if (e.data) {
            console.log("Revert Data:", e.data);
            // Try decoding
            const decoded = raffle.interface.parseError(e.data);
            console.log("Decoded Error:", decoded);
        } else {
            console.log(e);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
