const { ethers } = require("ethers");
const fs = require("fs");

const abiPath = "c:\\Users\\thoma\\Desktop\\LottoLayer\\web\\src\\lib\\abis\\Raffle.json";
const abi = JSON.parse(fs.readFileSync(abiPath)).abi;

const iface = new ethers.Interface(abi);
const selector = iface.getFunction("buyTicket").selector;
console.log("buyTicket selector:", selector);

// generic check for 0xedca914c if possible, but mainly just checking buyTicket
abi.forEach(item => {
    if (item.type === 'function') {
        const sig = item.name + '(' + item.inputs.map(i => i.type).join(',') + ')';
        const hash = ethers.id(sig).substring(0, 10);
        console.log(sig, hash);
        if (hash === '0xedca914c') {
            console.log("FOUND 0xedca914c match:", sig);
        }
    }
});
