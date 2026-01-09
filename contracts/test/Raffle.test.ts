import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Raffle, VRFCoordinatorV2_5Mock } from "../typechain-types";

const BASE_FEE = "100000000000000000"; // 0.1 LINK
const GAS_PRICE_LINK = 1e9; // 1 gwei
const WEI_PER_UNIT_LINK = 4e15;
const ENTRANCE_FEE = ethers.parseEther("0.01");
const INTERVAL = 30;
const MAX_TICKETS = 100;
const GAS_LANE = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";
const CALLBACK_GAS_LIMIT = 500000;

describe("Raffle Contract Tests", function () {

    async function deployRaffleFixture() {
        const [deployer, player, player2] = await ethers.getSigners();

        // Deploy Mock VRF 2.5
        const VRFCoordinatorV2_5Mock = await ethers.getContractFactory("VRFCoordinatorV2_5Mock");
        const vrfCoordinatorV2_5Mock = await VRFCoordinatorV2_5Mock.deploy(BASE_FEE, GAS_PRICE_LINK, WEI_PER_UNIT_LINK);
        const vrfCoordinatorAddress = await vrfCoordinatorV2_5Mock.getAddress();

        // Create Subscription
        const tx = await vrfCoordinatorV2_5Mock.createSubscription();
        await tx.wait();
        const subscriptionId = 1;

        await vrfCoordinatorV2_5Mock.fundSubscription(subscriptionId, ethers.parseEther("10"));

        const Raffle = await ethers.getContractFactory("Raffle");
        const raffle = await Raffle.deploy(
            ENTRANCE_FEE,
            INTERVAL,
            MAX_TICKETS,
            vrfCoordinatorAddress,
            GAS_LANE,
            subscriptionId,
            CALLBACK_GAS_LIMIT,
            deployer.address,
            ethers.ZeroAddress, // rewardToken (Native)
            1 // numWinners
        );

        await vrfCoordinatorV2_5Mock.addConsumer(subscriptionId, await raffle.getAddress());

        // Deploy ReentrancyAttacker
        const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
        const reentrancyAttacker = await ReentrancyAttacker.deploy(await raffle.getAddress());

        // Fund attacker to ensure it can pay for re-entrant ticket
        await deployer.sendTransaction({
            to: await reentrancyAttacker.getAddress(),
            value: ethers.parseEther("2.0")
        });

        return { raffle, vrfCoordinatorV2_5Mock, deployer, player, player2, reentrancyAttacker };
    }

    describe("Entrance", function () {
        it("Calculates correct entrance fee and allows entry via buyTicket", async function () {
            const { raffle, player } = await loadFixture(deployRaffleFixture);
            // Attempt with LOWER fee (should fail with strict equality check if implemented as strict, or < check)
            // Code has: if (msg.value != i_entranceFee) revert...
            await expect(
                raffle.connect(player).buyTicket({ value: ethers.parseEther("0.001") })
            ).to.be.revertedWithCustomError(raffle, "Raffle__NotEnoughEthEntered");

            // Attempt with HIGHER fee (should fail logic)
            await expect(
                raffle.connect(player).buyTicket({ value: ethers.parseEther("0.02") })
            ).to.be.revertedWithCustomError(raffle, "Raffle__NotEnoughEthEntered");

            await expect(
                raffle.connect(player).buyTicket({ value: ENTRANCE_FEE })
            ).to.emit(raffle, "RaffleEnter");
        });

        it("Reverts when Max Tickets reached", async function () {
            // Deploy with small max tickets for test
            const [deployer, player] = await ethers.getSigners();
            const Mock = await ethers.getContractFactory("VRFCoordinatorV2_5Mock");
            const mock = await Mock.deploy(BASE_FEE, GAS_PRICE_LINK, WEI_PER_UNIT_LINK);
            const Raffle = await ethers.getContractFactory("Raffle");
            const smallRaffle = await Raffle.deploy(
                ENTRANCE_FEE,
                INTERVAL,
                2, // Max 2 tickets
                await mock.getAddress(),
                GAS_LANE,
                1,
                CALLBACK_GAS_LIMIT,
                deployer.address,
                ethers.ZeroAddress,
                1
            );

            await smallRaffle.connect(player).buyTicket({ value: ENTRANCE_FEE });
            await smallRaffle.connect(player).buyTicket({ value: ENTRANCE_FEE });

            // 3rd should fail
            await expect(
                smallRaffle.connect(player).buyTicket({ value: ENTRANCE_FEE })
            ).to.be.revertedWithCustomError(smallRaffle, "Raffle__MaxTicketsReached");
        });
    });

    describe("Reentrancy & Security", function () {
        it("Prevents re-entrancy during winner selection", async function () {
            const { raffle, vrfCoordinatorV2_5Mock, reentrancyAttacker } = await loadFixture(deployRaffleFixture);

            // 1. Attacker enters
            const entranceFee = await raffle.getEntranceFee();
            // Attacker contract calls buyTicket
            await reentrancyAttacker.attack({ value: entranceFee });

            // 2. Perform Upkeep (start lottery)
            await ethers.provider.send("evm_increaseTime", [INTERVAL + 1]);
            await ethers.provider.send("evm_mine", []);

            const tx = await raffle.performUpkeep("0x");
            const receipt = await tx.wait();
            // Parse logs or assume id 0 from mock
            const requestId = 0;
            // Or get from event: RequestedRaffleWinner(requestId)
            // vrfCoordinatorV2_5Mock emits RandomWordsRequested(..., requestId, ...)

            // 3. Fulfill Random Words
            // This calls back Raffle.fulfillRandomWords -> transfers balance -> Attacker.receive() -> Attacker.buyTicket()
            // We expect this to REVERT with Raffle__RaffleNotOpen (because state is CALCULATING)
            // OR Raffle__TransferFailed (if Raffle catches the revert and bubbles it, or if it reverts itself).

            // In Raffle.sol: `(bool successWinner, ) = recentWinner.call{value: winnerShare}(""); if (!successWinner) revert Raffle__TransferFailed();`
            // ReentrancyAttacker.receive calls raffle.buyTicket.
            // raffle.buyTicket checks `s_raffleState != OPEN`.
            // It IS CALCULATING. So `buyTicket` REVERTS with `Raffle__RaffleNotOpen`.
            // The `receive` function then reverts (uncaught revert in receive propagates).
            // So `recentWinner.call` returns `successWinner = false`.
            // Raffle handles `false` by reverting with `Raffle__TransferFailed`.

            await expect(
                vrfCoordinatorV2_5Mock.fulfillRandomWords(requestId, await raffle.getAddress())
            ).to.be.revertedWithCustomError(raffle, "Raffle__TransferFailed");
        });
    });
});
