import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

const BASE_FEE = "250000000000000000"; // 0.25 LINK
const GAS_PRICE_LINK = 1e9; // 1 gwei

describe("LottoFactory Tests", function () {
    async function deployFactoryFixture() {
        const [deployer] = await ethers.getSigners();

        // Deploy Mock VRF
        const VRFCoordinatorV2PlusMock = await ethers.getContractFactory("VRFCoordinatorV2PlusMock");
        const vrfCoordinatorMock = await VRFCoordinatorV2PlusMock.deploy(BASE_FEE, GAS_PRICE_LINK);
        const vrfAddress = await vrfCoordinatorMock.getAddress();

        const LottoFactory = await ethers.getContractFactory("LottoFactory");
        // Constructor: vrfCoordinator, gasLane, subscriptionId, callbackGasLimit
        const factory = await LottoFactory.deploy(
            vrfAddress,
            "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // gasLane
            1, // subId
            500000 // callbackGasLimit
        );

        return { factory, deployer, vrfAddress };
    }

    it("Can create a raffle", async function () {
        const { factory } = await loadFixture(deployFactoryFixture);

        await expect(factory.createRaffle(
            ethers.parseEther("0.01"), // price
            100, // maxTickets
            30, // duration
            ethers.ZeroAddress, // rewardToken (Native)
            1 // numWinners
        )).to.emit(factory, "RaffleCreated");

        const raffles = await factory.getRaffles();
        expect(raffles.length).to.equal(1);
    });
});
