// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Raffle} from "./Raffle.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IVRFCoordinatorV2Plus} from "@chainlink/contracts/src/v0.8/dev/interfaces/IVRFCoordinatorV2Plus.sol";
import {AutomationCompatible} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

contract LottoFactory is Ownable, AutomationCompatible {
    // History of all raffles created
    Raffle[] public s_raffles;
    // List of currently active raffles being monitored
    Raffle[] public s_activeRaffles;
    
    mapping(address => bool) public isRaffle;

    // VRF Configuration Configuration
    address public immutable i_vrfCoordinator;
    bytes32 public immutable i_gasLane; // keyHash
    uint256 public s_subscriptionId;
    uint32 public immutable i_callbackGasLimit;

    event RaffleCreated(address indexed raffleAddress);
    event WinnerPicked(address indexed raffle, address indexed winner, uint256 amount);
    event RaffleSpawned(address indexed oldRaffle, address indexed newRaffle);

    constructor(
        address vrfCoordinator,
        bytes32 gasLane,
        uint256 subscriptionId,
        uint32 callbackGasLimit
    ) Ownable(msg.sender) {
        i_vrfCoordinator = vrfCoordinator;
        i_gasLane = gasLane;
        s_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
    }

    function setSubscriptionId(uint256 subscriptionId) public onlyOwner {
        s_subscriptionId = subscriptionId;
    }

    function acceptSubscriptionOwnerTransfer(uint256 subscriptionId) public onlyOwner {
        IVRFCoordinatorV2Plus(i_vrfCoordinator).acceptSubscriptionOwnerTransfer(subscriptionId);
    }

    function acceptVRFOwnership() public onlyOwner {
        IVRFCoordinatorV2Plus(i_vrfCoordinator).acceptSubscriptionOwnerTransfer(s_subscriptionId);
    }

    // List of tokens supported by the UI/Factory (can be used for dropdowns)
    address[] public s_supportedTokens; // address(0) for Native

    function addSupportedToken(address token) public onlyOwner {
        s_supportedTokens.push(token);
    }
    
    function getSupportedTokens() public view returns (address[] memory) {
        return s_supportedTokens;
    }

    /**
     * @notice Create a new Raffle
     */
    function createRaffle(
        uint256 ticketPrice,
        uint256 maxTickets,
        uint256 duration,
        address rewardToken,
        uint32 numWinners
    ) public {
        _createRaffle(ticketPrice, maxTickets, duration, rewardToken, numWinners);
    }
    
    function _createRaffle(
        uint256 ticketPrice,
        uint256 maxTickets,
        uint256 duration,
        address rewardToken,
        uint32 numWinners
    ) internal returns (Raffle) {
        Raffle raffle = new Raffle(
            ticketPrice,
            duration,
            maxTickets,
            i_vrfCoordinator,
            i_gasLane,
            s_subscriptionId,
            i_callbackGasLimit,
            owner(), // House Address starts as Factory Owner
            rewardToken,
            numWinners,
            address(this), // Factory Address
            owner() // Admin Deployer
        );
        
        // Transfer ownership of raffle to the factory owner (admin)
        raffle.transferOwnership(owner()); 
        
        // Add the new raffle as a consumer to the VRF subscription
        IVRFCoordinatorV2Plus(i_vrfCoordinator).addConsumer(s_subscriptionId, address(raffle));
        
        s_raffles.push(raffle);
        s_activeRaffles.push(raffle); // Add to active monitoring
        isRaffle[address(raffle)] = true;
        
        emit RaffleCreated(address(raffle));
        return raffle;
    }

    function onRaffleEnded(
        address winner,
        uint256 amount,
        uint256, /* ticketPrice */
        uint256, /* maxTickets */
        uint256, /* duration */
        address, /* rewardToken */
        uint32 /* numWinners */
    ) external {
        require(isRaffle[msg.sender], "Only valid raffles can trigger replacement");
        emit WinnerPicked(msg.sender, winner, amount);
        // Decoupled: Spawn happens in performUpkeep via Chainlink Automation
    }

    // Chainlink Automation to manage ACTIVE child raffles
    // Supports MULTIPLE concurrent raffles
    function checkUpkeep(bytes calldata /* checkData */) external view override returns (bool upkeepNeeded, bytes memory performData) {
        if (s_activeRaffles.length == 0) return (false, "");
        
        // Iterate through all active raffles to check for needed actions
        for (uint256 i = 0; i < s_activeRaffles.length; i++) {
            Raffle activeRaffle = s_activeRaffles[i];
            
            // 1. Check if CLOSED -> Needs Spawn (Action 1)
            // Use try/catch to avoid reverting entire loop
            try activeRaffle.getRaffleState() returns (Raffle.RaffleState state) {
                // Enum Value 2 is CLOSED
                if (uint256(state) == 2) {
                     return (true, abi.encode(i, 1)); 
                }
            } catch {}

            // 2. Check if Needs Draw (Action 0)
            try activeRaffle.checkUpkeep("") returns (bool needed, bytes memory /* data */) {
                if (needed) {
                    return (true, abi.encode(i, 0)); 
                }
            } catch {}
        }
        
        return (false, "");
    }

    function performUpkeep(bytes calldata performData) external override {
        (uint256 index, uint256 action) = abi.decode(performData, (uint256, uint256));
        
        // Safety check: specific index must exist
        if (index >= s_activeRaffles.length) return;

        if (action == 0) {
             // Action 0: Trigger Draw
             s_activeRaffles[index].performUpkeep("");
        } else if (action == 1) {
             // Action 1: Respawn (Cycle)
             Raffle oldRaffle = s_activeRaffles[index];
             
             // Double check it is closed
             if (uint256(oldRaffle.getRaffleState()) == 2) {
                 Raffle newRaffle = _createRaffle(
                     oldRaffle.getEntranceFee(),
                     oldRaffle.getMaxTickets(),
                     oldRaffle.getInterval(),
                     oldRaffle.getRewardToken(),
                     oldRaffle.getNumWinners()
                 );
                 
                 emit RaffleSpawned(address(oldRaffle), address(newRaffle));

                 // Remove old raffle from active list (Swap and Pop)
                 // Move the last element to the deleted spot
                 s_activeRaffles[index] = s_activeRaffles[s_activeRaffles.length - 1];
                 // Remove the last element
                 s_activeRaffles.pop();
             }
        }
    }

    function getRaffles() public view returns (Raffle[] memory) {
        return s_raffles;
    }

    function getActiveRaffles() public view returns (Raffle[] memory) {
        return s_activeRaffles;
    }
}
