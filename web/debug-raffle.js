const { ethers } = require("ethers");

// Need to match the error in the user report
const ERROR_SELECTOR = "0x3ee5aeb5";
const RAFFLE_ADDRESS = "0x72BeFBF10FE21271d95dA065Cc34368053Dc7AE8";
const RPC_URL = "https://base-sepolia.g.alchemy.com/v2/SXqPBGIZbxZ7_nMpta_JU";

const ABI = [
    "function getRaffleState() view returns (uint8)",
    "function getEntranceFee() view returns (uint256)",
    "function getNumPlayers() view returns (uint256)",
    "function getMaxTickets() view returns (uint256)",
    "function getRewardToken() view returns (address)"
];

async function main() {
    console.log("Checking Raffle:", RAFFLE_ADDRESS);
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const raffle = new ethers.Contract(RAFFLE_ADDRESS, ABI, provider);

    const state = await raffle.getRaffleState();
    console.log("State:", state); // 0=OPEN, 1=CALC

    const fee = await raffle.getEntranceFee();
    console.log("Fee:", ethers.formatEther(fee));

    const token = await raffle.getRewardToken();
    console.log("Token:", token);

    // Check selector for RaffeNotOpen
    console.log("Raffle__RaffleNotOpen selector:", ethers.id("Raffle__RaffleNotOpen()").slice(0, 10));
}

main().catch(console.error);
