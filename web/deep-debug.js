const { ethers } = require("ethers");

const RPC_URL = "https://base-sepolia.g.alchemy.com/v2/SXqPBGIZbxZ7_nMpta_JU";
const RAFFLE_ADDRESS = "0x72BeFBF10FE21271d95dA065Cc34368053Dc7AE8";

const ABI = [
    "function getRaffleState() view returns (uint8)",
    "function buyTicket() payable"
];

async function main() {
    console.log("Checking Raffle:", RAFFLE_ADDRESS);
    const provider = new ethers.JsonRpcProvider(RPC_URL);

    // Simulate with a random wallet
    const wallet = ethers.Wallet.createRandom().connect(provider);
    const raffle = new ethers.Contract(RAFFLE_ADDRESS, ABI, wallet);

    // Check State
    const state = await raffle.getRaffleState();
    console.log("Current State (0=OPEN, 1=CALC):", state);

    if (state !== 0) {
        console.log("Raffle is CLOSED on-chain. This explains the error.");
        return;
    }

    // Attempt Estimate Gas
    try {
        console.log("Estimating Gas for buyTicket...");
        // Use 0.01 ETH 
        const gas = await raffle.buyTicket.estimateGas({ value: ethers.parseEther("0.01") });
        console.log("Estimate Gas Success:", gas.toString());
    } catch (e) {
        console.log("Estimate Gas FAILED:");
        if (e.data) {
            console.log("Revert Data:", e.data);
            if (e.data.includes("0x3ee5aeb5")) console.log("Can Confirm: Raffle__RaffleNotOpen logic hit.");
        } else {
            console.log(e.message);
        }
    }
}

main().catch(console.error);
