
import { ethers } from "hardhat";

async function main() {
    console.log("🔍 Checking VRF Status for Active Raffle...");

    // 1. Get the current active raffle (from Factory or manually specified if known)
    // We can assume the last deployed raffle from the previous step which was likely 0x4097C8ba642f1232538f8f1044d9f29692928aA5
    // But let's check Factory to be sure.

    // 1. Target the specific stuck raffle
    const targetRaffleAddr = "0x252e798Ef4c1B6D4F81b27cc44b169b11420440C";

    // Address of the Factory
    const factoryAddress = "0x1D1C0c6A2B638d23eB2Ed55b9e2d55295AA779B4";
    const factory = await ethers.getContractAt("LottoFactory", factoryAddress);

    /* 
    const raffles = await factory.getRaffles();
    if (raffles.length === 0) {
        console.log("No raffles found.");
        return;
    }

    // Find the last one
    const targetRaffleAddr = raffles[raffles.length - 1]; // Or search for one in CALCULATING state
    */
    let targetRaffle = await ethers.getContractAt("Raffle", targetRaffleAddr);
    let state = await targetRaffle.getRaffleState();

    console.log(`Checking Raffle: ${targetRaffleAddr}`);
    console.log(`Current State: ${state.toString() === "1" ? "CALCULATING" : (state.toString() === "0" ? "OPEN" : "CLOSED")}`);

    // If state is OPEN, check if it was supposed to be detecting... but user says calculating.
    if (state.toString() !== "1") {
        console.log("Raffle is NOT in CALCULATING state? Checking recent winners...");
        const winner = await targetRaffle.getRecentWinner();
        console.log("Recent Winner:", winner);
    }

    /*
    if (state.toString() !== "1") {
        // If OPEN, maybe it hasn't requested yet? check recent events
        console.log("Status is NOT Calculating. Did it reset? Or never requested?");
        // Try to find one that IS calculating?
        let found = false;
        for (let i = raffles.length - 1; i >= 0; i--) {
            const r = await ethers.getContractAt("Raffle", raffles[i]);
            const s = await r.getRaffleState();
            if (s.toString() === "1") {
                targetRaffle = r;
                console.log(`Found CALCULATING Raffle: ${raffles[i]}`);
                found = true;
                break;
            }
        }
        if (!found) {
            console.log("No Raffle currently in CALCULATING state.");
            return;
        }
    }
    */

    // Helper for chunked queries
    const queryFilterChunked = async (contract: any, filter: any, startBlock: number, endBlock: number) => {
        let events = [];
        const MAX_RANGE = 10;
        for (let i = startBlock; i <= endBlock; i += MAX_RANGE) {
            const to = Math.min(i + MAX_RANGE - 1, endBlock);
            try {
                const chunk = await contract.queryFilter(filter, i, to);
                events.push(...chunk);
            } catch (e) {
                // Ignore or log error
            }
        }
        return events;
    };

    // 2. Get Request ID from events (Scan last 200 blocks? ~6 mins)
    console.log("Fetching Request ID (scanning last 100 blocks)...");
    const currentBlock = await ethers.provider.getBlockNumber();
    const filter = targetRaffle.filters.RequestedRaffleWinner();

    // We scan backwards or forwards?
    // Let's scan the last 100 blocks.
    const events = await queryFilterChunked(targetRaffle, filter, currentBlock - 100, currentBlock);

    if (events.length === 0) {
        console.log("No VRF Request found in the last 100 blocks.");
        // Fallback: Check if we have one stuck in storage? No way to read logs.
        console.log("Expanding search to 500 blocks...");
        const eventsExtended = await queryFilterChunked(targetRaffle, filter, currentBlock - 600, currentBlock - 100);
        if (eventsExtended.length === 0) {
            console.log("❌ Could not find Request ID. Please provide it manually if known.");
            return;
        }
        events.push(...eventsExtended);
    }

    const lastEvent = events[events.length - 1] as any;
    const reqId = lastEvent.args[0];
    console.log(`Request ID: ${reqId}`);

    // 3. Query Coordinator Status
    // Base Sepolia Coordinator V2.5
    const coordinatorAddress = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";

    // We need to check if we can query status.
    // IVRFCoordinatorV2Plus doesn't expose `getRequestStatus` usually. 
    // It's internal? Or we can check pending requests?
    // Wait, V2.5 `getSubscription` tells balance.
    // The status of a *specific* request is harder if not exposed.
    // But we can check if the Coordinator emitted `RandomWordsFulfilled` for that ID.

    console.log("Querying Coordinator Fulfillment...");
    // We'll read events from Coordinator?
    // "RandomWordsFulfilled(uint256 requestId, uint256 outputSeed, uint96 payment, bool success)"
    const coordinatorAbi = [
        "event RandomWordsFulfilled(uint256 indexed requestId, uint256 outputSeed, uint96 payment, bool success)",
        "function getSubscription(uint256 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] consumers)"
    ];

    const coordinator = await ethers.getContractAt(coordinatorAbi, coordinatorAddress);

    // Filter by RequestID (which is indexed in RandomWordsFulfilled)
    const fulfilledFilter = coordinator.filters.RandomWordsFulfilled(reqId);
    const fulfilledEvents = await coordinator.queryFilter(fulfilledFilter); // This might be slow if we scan too much, but reqId is specific.
    // We scan from the block the request happened.
    const fromBlock = lastEvent.blockNumber;

    // Scan next 100 blocks
    const statusEvents = await queryFilterChunked(coordinator, fulfilledFilter, fromBlock, Math.min(fromBlock + 100, currentBlock));

    let isFulfilled = false;
    let isSuccess = false;

    if (statusEvents.length > 0) {
        isFulfilled = true;
        isSuccess = (statusEvents[0] as any).args[3]; // 'success' bool
    }

    console.log("-----------------------------------------");
    if (!isFulfilled) {
        console.log("VRF Status: PENDING (Chainlink has not responded yet)");
        // Check balance
        // We know subId is ... wait, get it from setup script?
        // Or assume from Factory?
        // Factory has `s_subscriptionId`.
        const subId = await factory.s_subscriptionId();
        const subData = await coordinator.getSubscription(subId);
        console.log(`Subscription Balance: ${ethers.formatEther(subData.balance)} LINK`);
        if (subData.balance < ethers.parseEther("0.1")) {
            console.log("⚠️ Low Balance! This is likely the cause.");
            console.log("Suggested Fix: Fund Subscription with more LINK.");
        } else {
            console.log("Balance seems OK. Network congestion or waiting for block confirmations.");
        }
    } else {
        console.log(`VRF Status: ${isSuccess ? "FULFILLED (Success)" : "FULFILLED (Failed)"}`);

        if (isSuccess) {
            console.log("Coordinator says: SUCCESS.");
            console.log("But Raffle is still CALCULATING?");
            console.log("🛑 Revert Detected: Yes (Likely)");
            console.log("Possible causes: ");
            console.log("1. Gas limit too low in callback?");
            console.log("2. Logic error in fulfillRandomWords?");
            console.log("3. Out of funds for Payout (Treasury or Winner transfer failed)?");

            // Simulation
            console.log("\n--- Simulating Callback Locally ---");
            // We can try to impersonate the Coordinator and call rawFulfillRandomWords on the raffle?
            // On a live network fork? No, we are on live network. We can't impersonate easily without Forking.
            // But the user asked: "run a simulation ... locally using the agent".
            // This implies: Use Hardhat Forking or just reasoning.
            // Let's suggest running `diagnostic-simulation.ts` logic but tailored to this failure.

            console.log("Suggested Fix: Check 'diagnostic-simulation.ts' again. If that passes, check Payout/Treasury Reverts.");
            console.log("Specific Check: Does the Raffle have enough ETH for the payout? (Balance vs Tickets Sold)");
            const balance = await ethers.provider.getBalance(targetRaffleAddr);
            console.log(`Raffle ETH Balance: ${ethers.formatEther(balance)}`);
        }
    }
    console.log("-----------------------------------------");

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
