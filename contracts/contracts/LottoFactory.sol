// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Raffle} from "./Raffle.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IVRFCoordinatorV2Plus} from "@chainlink/contracts/src/v0.8/dev/interfaces/IVRFCoordinatorV2Plus.sol";

contract LottoFactory is Ownable {
    Raffle[] public s_raffles;

    // VRF Configuration Configuration
    address public immutable i_vrfCoordinator;
    bytes32 public immutable i_gasLane; // keyHash
    uint256 public s_subscriptionId;
    uint32 public immutable i_callbackGasLimit;

    event RaffleCreated(address indexed raffleAddress);

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
     * @param ticketPrice The price of a ticket (entrance fee)
     * @param maxTickets The maximum number of tickets allowed
     * @param duration The duration of the raffle in seconds
     * @param rewardToken The token to use for entry/reward (address(0) for native)
     * @param numWinners The number of winners to select (default 1)
     */
    function createRaffle(
        uint256 ticketPrice,
        uint256 maxTickets,
        uint256 duration,
        address rewardToken,
        uint32 numWinners
    ) public onlyOwner {
        Raffle raffle = new Raffle(
            ticketPrice,
            duration,
            maxTickets,
            i_vrfCoordinator,
            i_gasLane,
            s_subscriptionId,
            i_callbackGasLimit,
            owner(), // House Address is the Factory Owner
            rewardToken,
            numWinners
        );
        
        // Transfer ownership of raffle to the factory owner (admin) if needed for administrative tasks
        raffle.transferOwnership(owner()); 
        
        // Add the new raffle as a consumer to the VRF subscription
        // The Factory must be the owner of the subscription for this to work
        IVRFCoordinatorV2Plus(i_vrfCoordinator).addConsumer(s_subscriptionId, address(raffle));
        
        s_raffles.push(raffle);
        emit RaffleCreated(address(raffle));
    }

    function getRaffles() public view returns (Raffle[] memory) {
        return s_raffles;
    }
}
