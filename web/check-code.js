const { ethers } = require("ethers");

const RPC_URL = "https://base-sepolia.g.alchemy.com/v2/SXqPBGIZbxZ7_nMpta_JU";
const FACTORY_ADDRESS = "0xF5fDe0e8C7483b683854C2BC6E513cc8Af7e6BD7";

async function check() {
    console.log("Checking:", FACTORY_ADDRESS);
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const code = await provider.getCode(FACTORY_ADDRESS);
    console.log("Code length:", code.length);
    if (code === "0x") {
        console.log("NO CODE AT ADDRESS");
    } else {
        console.log("CODE EXISTS");
    }
}
check();
