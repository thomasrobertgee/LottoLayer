
import { ethers } from "hardhat";

async function main() {
    const raffleAddress = "0x0d3c6B4681F279e448b05B43Fdc002Da6A2e877B";
    const vrfCoordinatorAddress = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";

    console.log(`Checking VRF Logs for Raffle: ${raffleAddress}`);

    const coordinatorAbi = [
        "event RandomWordsRequested(bytes32 indexed keyHash, uint256 requestId, uint256 preSeed, uint256 indexed subId, uint16 minimumRequestConfirmations, uint32 callbackGasLimit, uint32 numWords, address indexed sender)"
    ];

    const coordinator = await ethers.getContractAt(coordinatorAbi, vrfCoordinatorAddress);

    // Filter for events where sender is the raffle
    const filter = coordinator.filters.RandomWordsRequested(null, null, null, null, null, null, null, raffleAddress);

    // Query last 1000 blocks (or more if needed, Base Sepolia is fast)
    // Actually, let's query from block 0 or a reasonably recent block.
    // Base Sepolia block time is 2s. 1 day = 43200 blocks.
    // Let's try last 10000 blocks.
    const startBlock = -100;

    console.log("Querying logs...");
    const events = await coordinator.queryFilter(filter, startBlock);

    console.log(`Found ${events.length} Request Events.`);

    events.forEach((event: any) => {
        console.log("\n--- Request Event ---");
        console.log("Tx Hash:", event.transactionHash);
        console.log("Request ID:", event.args.requestId.toString());
        console.log("Sub ID:", event.args.subId.toString());
        console.log("Callback Gas Limit:", event.args.callbackGasLimit.toString());
        console.log("Sender:", event.args.sender);
    });
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
