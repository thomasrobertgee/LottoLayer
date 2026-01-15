
import { ethers } from "hardhat";

async function main() {
    const raffleAddress = "0xBa09DA67271f7fd6344030673Eb9f9e6136B0FB3";
    const raffle = await ethers.getContractAt("Raffle", raffleAddress);

    // There is no public getter for i_admin_deployer in the code I saw earlier? 
    // Let's check the code I viewed.
    // Viewed file: contracts/contracts/Raffle.sol
    // It has: address private immutable i_admin_deployer;
    // It does NOT seem to have a getter for it in the "Getter Functions" section I saw?
    // Let's check the file content again or try to read storage if needed, 
    // BUT the emergencyDraw check is: msg.sender != owner() && msg.sender != s_treasuryAddress && msg.sender != i_admin_deployer

    // s_treasuryAddress is initialized to `houseAddress` which is usually the deployer.
    // Let's check the treasury address.

    // Wait, the View file output for Raffle.sol showed:
    // 328:     function emergencyDraw() external {
    // 329:         if (msg.sender != owner() && msg.sender != s_treasuryAddress && msg.sender != i_admin_deployer) {

    // And getters:
    // 357:     function getRecentWinner() public view returns (address) { return s_recentWinner; }
    // ...
    // It doesn't look like there is a getAdminDeployer. 
    // But there is `s_treasuryAddress`. Is there a getter for that?
    // The constructor sets s_treasuryAddress = houseAddress.
    // 354:     /** Getter Functions */
    // It doesn't list getTreasuryAddress explicitly in the lines I saw (354-368).

    // However, I can try to guess or use the error message.
    // If I try to call it and it reverts, I'll know.
    // But I'm getting Connection Timeouts, which is a network level error, not a revert.

    // Let's try to increase the timeout in hardhat config? Or just retry with a simpler script.

    console.log("Checking permissions...");
    const [signer] = await ethers.getSigners();
    console.log("Signer:", signer.address);

    // We can try to simulate the call (callStatic) to see if it reverts.
    try {
        await raffle.emergencyDraw.staticCall();
        console.log("✅ Simulation successful! Signer IS authorized.");
    } catch (e: any) {
        console.log("❌ Simulation failed:", e.message);
        if (e.data) {
            const decoded = raffle.interface.parseError(e.data);
            console.log("Revert Reason:", decoded?.name);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
