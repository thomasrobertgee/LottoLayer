const { ethers } = require("ethers");

const RPC_URL = "https://base-sepolia-rpc.publicnode.com";
const FACTORY_ADDRESS = "0xb326305a46fdbacec19121169c3dd0309a9b007f";
const ABI = [
    "function getRaffles() view returns (address[])",
    "function owner() view returns (address)"
];

async function check() {
    console.log("Connecting to:", RPC_URL);
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const factory = new ethers.Contract(FACTORY_ADDRESS, ABI, provider);

    console.log("Checking Factory at:", FACTORY_ADDRESS);

    try {
        const owner = await factory.owner();
        console.log("Owner:", owner);

        const raffles = await factory.getRaffles();
        console.log("Raffles Count:", raffles.length);
        console.log("Raffles:", raffles);
    } catch (e) {
        console.error("Error fetching data:", e);
    }
}

check().catch(console.error);
