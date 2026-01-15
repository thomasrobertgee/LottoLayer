const { ethers } = require("ethers");

const privKey = "2525a831defc1f9816e52db8cc698813d553029d3cc395fc7a5e79af6a46da65";
const wallet = new ethers.Wallet(privKey);
console.log("Derived Address:", wallet.address);
