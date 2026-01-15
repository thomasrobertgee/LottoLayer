import { ethers, network } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    let vrfCoordinatorAddress;
    let subscriptionId;
    let gasLane;
    const CALLBACK_GAS_LIMIT = 2500000; // Increased to 2.5M to support Raffle Factory spawning

    if (network.name === "hardhat" || network.name === "localhost") {
        console.log("Local network detected. Deploying Mock VRF...");
        const VRFCoordinatorV2PlusMock = await ethers.getContractFactory("VRFCoordinatorV2PlusMock");
        // Base Fee 0.25 LINK, Gas Price 1e9
        const mock = await VRFCoordinatorV2PlusMock.deploy("250000000000000000", 1000000000);
        await mock.waitForDeployment();
        vrfCoordinatorAddress = await mock.getAddress();
        console.log("Mock VRF deployed to:", vrfCoordinatorAddress);

        // Create subscription
        const tx = await mock.createSubscription();
        const receipt = await tx.wait();
        // Assume subId 1
        subscriptionId = 1;
        await mock.fundSubscription(subscriptionId, ethers.parseEther("100"));

        gasLane = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c"; // Arbitrary
    } else if (network.name === "baseSepolia") {
        // Base Sepolia Config
        vrfCoordinatorAddress = "0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE";
        gasLane = "0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71";

        // Subscription ID must be created manually on Chainlink VRF page
        // and set via environment variable or hardcoded here.
        subscriptionId = 710031339993095813716500153844065593828167228522851098633229620997430821748n;
        const envSubId = process.env.SUBSCRIPTION_ID;
        if (envSubId) {
            subscriptionId = BigInt(envSubId);
        }

        if (subscriptionId === 0n) {
            console.warn("WARNING: VRF_SUBSCRIPTION_ID is missing. Deployment may work but Raffles will fail to request randomness.");
        }
    } else {
        // Other networks...
        console.warn("Unknown network, using placeholders...");
        vrfCoordinatorAddress = "0x0000000000000000000000000000000000000000";
        gasLane = "0x0000000000000000000000000000000000000000000000000000000000000000";
        subscriptionId = 0;
    }

    console.log("Deploying LottoFactory...");
    const LottoFactory = await ethers.getContractFactory("LottoFactory");
    const lottoFactory = await LottoFactory.deploy(
        vrfCoordinatorAddress,
        gasLane,
        subscriptionId,
        CALLBACK_GAS_LIMIT
    );

    await lottoFactory.waitForDeployment();
    const address = await lottoFactory.getAddress();
    console.log("LottoFactory deployed to:", address);
    console.log("Deployment Transaction:", lottoFactory.deploymentTransaction()?.hash);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
