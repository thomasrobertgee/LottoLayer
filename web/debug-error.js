const { ethers } = require("ethers");

// Need to match the error in the user report
const ERROR_SELECTOR = "0x3ee5aeb5";

async function main() {
    const errorSigs = [
        "Raffle__NotEnoughEthEntered()",
        "Raffle__TransferFailed()",
        "Raffle__RaffleNotOpen()",
        "Raffle__UpkeepNotNeeded(uint256,uint256,uint256)",
        "Raffle__MaxTicketsReached()"
    ];

    console.log("Calculating selectors...");
    for (const sig of errorSigs) {
        const selector = ethers.id(sig).slice(0, 10);
        console.log(`"${selector}" : "${sig}"`);
    }
}
main();
