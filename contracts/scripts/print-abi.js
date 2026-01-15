
const fs = require('fs');
const path = require('path');

async function main() {
    const artifactPath = path.join(__dirname, '../artifacts/contracts/LottoFactory.sol/LottoFactory.json');
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    const automationAbi = artifact.abi.filter(item =>
        item.type === 'function' && (item.name === 'checkUpkeep' || item.name === 'performUpkeep')
    );

    console.log("=== LottoFactory Automation ABI ===");
    console.log(JSON.stringify(automationAbi, null, 2));
    console.log("===================================");
    console.log("Factory Address: 0xE50Cba1bCB947F08487aAD84B37ab32D3Edd4FDB");
}

main();
