
import { ethers } from "hardhat";

async function main() {
    console.log("🚀 Starting Emergency Draw Simulation...");

    const [deployer, player1, player2] = await ethers.getSigners();
    console.log(`Admin/Owner: ${deployer.address}`);

    // 1. Deploy Mock VRF (needed for Factory/Raffle constructor args)
    const MockVRF = await ethers.getContractFactory("VRFCoordinatorV2_5Mock");
    const mockVRF = await MockVRF.deploy(ethers.parseEther("0.1"), 1e9, 4e15);
    const mockVRFAddr = await mockVRF.getAddress();
    const subId = await mockVRF.createSubscription.staticCall();
    await mockVRF.createSubscription();
    await mockVRF.fundSubscription(subId, ethers.parseEther("100"));

    // 2. Deploy Factory
    const Factory = await ethers.getContractFactory("LottoFactory");
    const factory = await Factory.deploy(
        mockVRFAddr,
        ethers.ZeroHash,
        subId,
        2500000 // Gas Limit
    );
    await factory.waitForDeployment();
    console.log("Factory Deployed");

    // 3. Create Raffle
    // 0.1 ETH ticket, 3 tickets max
    await factory.createRaffle(
        ethers.parseEther("0.1"),
        3,
        3600,
        ethers.ZeroAddress,
        1
    );

    const raffles = await factory.getRaffles();
    const raffleAddr = raffles[0];
    const raffle = await ethers.getContractAt("Raffle", raffleAddr);
    console.log(`Raffle Deployed: ${raffleAddr}`);

    // 4. Buy Tickets to Sell Out -> Trigger CALCULATING
    console.log("Buying tickets to trigger CALCULATING state...");
    await (raffle as any).connect(deployer).buyTicket({ value: ethers.parseEther("0.1") });
    await (raffle as any).connect(player1).buyTicket({ value: ethers.parseEther("0.1") });
    await (raffle as any).connect(player2).buyTicket({ value: ethers.parseEther("0.1") });

    let state = await (raffle as any).getRaffleState();
    console.log(`State: ${state} (Expected: 1 - CALCULATING)`);

    if (state.toString() !== "1") {
        throw new Error("Raffle failed to enter CALCULATING state");
    }

    // 5. Simulate "Stuck" (We just don't fulfill VRF)
    console.log("⚠️ Simulating Stuck VRF... Calling Emergency Draw...");

    // 6. Call Emergency Draw (Must be Owner or Treasury)
    // Check owner
    const owner = await raffle.owner();
    console.log(`Raffle Owner: ${owner} (Should be ${deployer.address})`);

    // Factory owner is deployer, so houseAddress is deployer.
    console.log("Calling emergencyDraw as Deployer (Treasury Address)...");
    const tx = await (raffle as any).emergencyDraw();
    await tx.wait();
    console.log("✅ Emergency Draw Executed");

    // 7. Verify Results
    state = await (raffle as any).getRaffleState();
    console.log(`State after draw: ${state} (Expected: 0 - OPEN)`);
    // Note: fulfillRandomWords resets state to OPEN (old raffle resets, but factory creates NEW one).
    // The old raffle stays "OPEN" but players array cleared.
    // In our logic, we reset the old raffle too.

    const recentWinner = await (raffle as any).getRecentWinner();
    console.log(`Winner Picked: ${recentWinner}`);

    if (recentWinner === ethers.ZeroAddress) {
        throw new Error("❌ No winner picked!");
    } else {
        console.log("🎉 Winner confirmed!");
    }

    // Verify New Raffle Created
    const rafflesAfter = await factory.getRaffles();
    console.log(`Total Raffles: ${rafflesAfter.length} (Expected: 2)`);
    if (rafflesAfter.length === 2) {
        console.log("✅ New Raffle successfully spawned by Factory.");
    } else {
        console.error("❌ New raffle NOT spawned.");
    }

    console.log("Simulation Complete.");
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
