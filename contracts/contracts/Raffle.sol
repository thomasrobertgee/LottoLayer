// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/dev/vrf/VRFConsumerBaseV2Plus.sol";
import {IVRFCoordinatorV2Plus} from "@chainlink/contracts/src/v0.8/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/dev/vrf/libraries/VRFV2PlusClient.sol";
import {AutomationCompatible} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Raffle is VRFConsumerBaseV2Plus, AutomationCompatible, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /** Errors */
    error Raffle__NotEnoughEthEntered();
    error Raffle__TransferFailed();
    error Raffle__RaffleNotOpen();
    error Raffle__UpkeepNotNeeded(uint256 currentBalance, uint256 numPlayers, uint256 raffleState);
    error Raffle__MaxTicketsReached();

    /** Type declarations */
    enum RaffleState {
        OPEN,
        CALCULATING
    }

    /** State Variables */
    // Chainlink VRF Variables
    uint256 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1; // Default, overridden in request

    // Lottery Variables
    uint256 private immutable i_interval;
    uint256 private immutable i_entranceFee;
    uint256 private immutable i_maxTickets;
    uint32 private immutable i_numWinners;
    address private immutable i_houseAddress;
    address private immutable i_rewardToken; // address(0) for Native ETH
    
    // Storage
    uint256 private s_lastTimeStamp;
    // Recent winners list
    address[] private s_recentWinners;
    address private s_recentWinner;
    RaffleState private s_raffleState;
    address[] private s_players;

    /** Events */
    event RaffleEnter(address indexed player);
    event WinnerPicked(address indexed winner, uint256 amount);
    event WinnersPicked(address[] winners, uint256[] amounts);
    event RequestedRaffleWinner(uint256 indexed requestId);

    constructor(
        uint256 entranceFee,
        uint256 interval,
        uint256 maxTickets,
        address vrfCoordinatorV2,
        bytes32 gasLane,
        uint256 subscriptionId,
        uint32 callbackGasLimit,
        address houseAddress,
        address rewardToken,
        uint32 numWinners
    ) VRFConsumerBaseV2Plus(vrfCoordinatorV2) {
        i_entranceFee = entranceFee;
        i_interval = interval;
        i_maxTickets = maxTickets;
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        i_houseAddress = houseAddress;
        i_rewardToken = rewardToken;
        i_numWinners = numWinners;
        
        s_raffleState = RaffleState.OPEN;
        s_lastTimeStamp = block.timestamp;
    }

    function buyTicket() public payable {
        buyTicketFor(msg.sender);
    }

    function buyTicketFor(address player) public payable nonReentrant {
        if (s_raffleState != RaffleState.OPEN) {
            revert Raffle__RaffleNotOpen();
        }
        if (s_players.length >= i_maxTickets) {
            revert Raffle__MaxTicketsReached();
        }

        if (i_rewardToken == address(0)) {
            // Native ETH logic
            if (msg.value != i_entranceFee) {
                revert Raffle__NotEnoughEthEntered();
            }
        } else {
            // ERC20 Logic
            IERC20(i_rewardToken).safeTransferFrom(msg.sender, address(this), i_entranceFee);
        }

        s_players.push(payable(player));
        emit RaffleEnter(player);

        // Check Trigger: Sold Out
        if (s_players.length == i_maxTickets) {
           pickWinner();
        }
    }

    /**
     * @dev Trigger the winner selection process.
     * Can be called by checkUpkeep (Automation) or buyTicket (Sold Out).
     */
    function pickWinner() internal {
        // Validation: Must be OPEN and enough players
        if (s_raffleState != RaffleState.OPEN) revert Raffle__RaffleNotOpen();
        
        // If triggered by sold-out, we don't check time.
        // If triggered by upkeep, time is checked in checkUpkeep (not here).
        
        s_raffleState = RaffleState.CALCULATING;
        
        uint256 requestId = IVRFCoordinatorV2Plus(s_vrfCoordinator).requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: i_gasLane,
                subId: i_subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: i_callbackGasLimit,
                numWords: i_numWinners, // Multiple winners
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: true}) // Use Native ETH for VRF
                )
            })
        );
        
        emit RequestedRaffleWinner(requestId);
    }

    /**
     * @dev This is the function that the Chainlink Automation nodes call
     * to see if it's time to perform an upkeep.
     */
    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        view
        override
        returns (bool upkeepNeeded, bytes memory /* performData */)
    {
        bool isOpen = RaffleState.OPEN == s_raffleState;
        bool timePassed = ((block.timestamp - s_lastTimeStamp) > i_interval);
        // maxTickets logic is also handled in buyTicket but Automation acts as backup/failsafe
        bool maxTicketsReached = (s_players.length >= i_maxTickets);
        bool hasPlayers = s_players.length > 0;
        
        bool hasBalance;
        if (i_rewardToken == address(0)) {
            hasBalance = address(this).balance > 0;
        } else {
             hasBalance = IERC20(i_rewardToken).balanceOf(address(this)) > 0;
        }
        
        // We trigger if time passed OR max tickets reached (though buyTicket usually catches max tickets)
        upkeepNeeded = (isOpen && (timePassed || maxTicketsReached) && hasPlayers && hasBalance);
        return (upkeepNeeded, "0x0");
    }

    function performUpkeep(bytes calldata /* performData */) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Raffle__UpkeepNotNeeded(
                i_rewardToken == address(0) ? address(this).balance : IERC20(i_rewardToken).balanceOf(address(this)),
                s_players.length,
                uint256(s_raffleState)
            );
        }
        pickWinner();
    }
    
    function fulfillRandomWords(
        uint256 /* requestId */,
        uint256[] memory randomWords
    ) internal override nonReentrant {
        // Calculate Total Pot
        uint256 totalBalance;
        if (i_rewardToken == address(0)) {
            totalBalance = address(this).balance;
        } else {
            totalBalance = IERC20(i_rewardToken).balanceOf(address(this));
        }

        uint256 houseShare = (totalBalance * 5) / 100; // 5% House
        uint256 winnersPot = totalBalance - houseShare; // 95% to Winners

        // Select Winners
        uint256 count = s_players.length < i_numWinners ? s_players.length : i_numWinners;
        address[] memory winners = new address[](count);
        uint256[] memory payouts = new uint256[](count);
        
        // Shuffle/Selection Logic
        // Note: Simple modulo selection. To pick N distinct winners from M players without duplicates is harder.
        // For simplicity with large pools, we can assume low collision or allow duplicates if tickets = entries?
        // Usually, 1 ticket = 1 chance. A user with 2 tickets can win twice? Yes.
        // If we want distinct *individuals*, we need mapping. 
        // Assuming "Tickets" logic: Each ticket is a chance. Winning twice is allowed if you hold multiple tickets.
        
        // Distribution Logic
        if (count == 1) {
             // 95% to single winner
             uint256 winnerIdx = randomWords[0] % s_players.length;
             winners[0] = s_players[winnerIdx];
             payouts[0] = winnersPot;
        } else if (count == 3 && i_numWinners == 3) {
             // 60/30/5 Split
             // We need 3 random words? Or derive from 1?
             // VRF V2.5 requested `i_numWinners` words. So randomWords array has `count` items.
             
             // 1st Place (60% of Total Pot = ~63% of WinnersPot?)
             // Request: 60/30/5 of TOTAL pot. 
             // 60% Total
             // 30% Total
             // 5% Total
             // 5% House
             // Sum = 100%. Correct.
             
             payouts[0] = (totalBalance * 60) / 100;
             payouts[1] = (totalBalance * 30) / 100;
             payouts[2] = (totalBalance * 5) / 100;
             
             // Indexes
             winners[0] = s_players[randomWords[0] % s_players.length];
             winners[1] = s_players[randomWords[1] % s_players.length];
             winners[2] = s_players[randomWords[2] % s_players.length];
        } else {
             // Equal Split Fallback for other counts
             uint256 share = winnersPot / count;
             for (uint256 i = 0; i < count; i++) {
                 payouts[i] = share;
                 // Use i-th random word
                 // Fail-safe if randomWords provided < count?
                 // requestRandomWords requested i_numWinners, so randomWords should have length == i_numWinners
                 if(i < randomWords.length) {
                     winners[i] = s_players[randomWords[i] % s_players.length];
                 } else {
                     // Fallback if randomness insufficient (shouldn't happen)
                     winners[i] = s_players[(randomWords[0] + i) % s_players.length];
                 }
             }
        }
        
        // Reset State
        s_players = new address payable[](0);
        s_lastTimeStamp = block.timestamp;
        s_raffleState = RaffleState.OPEN;
        delete s_recentWinners; // clear old history? Or we store them?
        // We can just emit events. 
        
        // Effects & Interactions
        
        // Pay House
        if (i_rewardToken == address(0)) {
            (bool successHouse, ) = i_houseAddress.call{value: houseShare}("");
            if (!successHouse) revert Raffle__TransferFailed();
            
            for (uint256 i = 0; i < count; i++) {
                (bool success, ) = winners[i].call{value: payouts[i]}("");
                if (!success) revert Raffle__TransferFailed();
            }
        } else {
            IERC20(i_rewardToken).safeTransfer(i_houseAddress, houseShare);
            for (uint256 i = 0; i < count; i++) {
                 IERC20(i_rewardToken).safeTransfer(winners[i], payouts[i]);
            }
        }
        
        emit WinnersPicked(winners, payouts);
        // Backwards compatibility event for single winner (1st place)
        if (count > 0) {
            s_recentWinner = winners[0];
            emit WinnerPicked(winners[0], payouts[0]);
        }
    }

    /** Getter Functions */
    function getEntranceFee() public view returns (uint256) { return i_entranceFee; }
    function getPlayer(uint256 index) public view returns (address) { return s_players[index]; }
    function getRecentWinner() public view returns (address) { return s_recentWinner; }
    function getRaffleState() public view returns (RaffleState) { return s_raffleState; }
    function getNumPlayers() public view returns (uint256) { return s_players.length; }
    function getLastTimeStamp() public view returns (uint256) { return s_lastTimeStamp; }
    function getInterval() public view returns (uint256) { return i_interval; }
    function getRewardToken() public view returns (address) { return i_rewardToken; }
    function getNumWinners() public view returns (uint32) { return i_numWinners; }

    function getMaxTickets() public view returns (uint256) {
        return i_maxTickets;
    }
}

