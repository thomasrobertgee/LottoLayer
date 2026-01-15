// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/dev/vrf/libraries/VRFV2PlusClient.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/dev/vrf/VRFConsumerBaseV2Plus.sol";

contract VRFCoordinatorV2_5Mock {
    event RandomWordsRequested(
        bytes32 indexed keyHash,
        uint256 requestId,
        uint256 preSeed,
        uint256 indexed subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords,
        bytes extraArgs,
        address indexed sender
    );
    event RandomWordsFulfilled(uint256 indexed requestId, uint256 outputSeed, uint96 payment, bool success);

    uint256 s_currentRequestId;
    mapping(uint256 => address) s_consumers;
    
    uint96 public constant BASE_FEE = 100000000000000000;
    uint96 public constant GAS_PRICE_LINK = 1e9;
    int256 public constant WEI_PER_UNIT_LINK = 4e15;

    constructor(uint96 _baseFee, uint96 _gasPriceLink, int256 _weiPerUnitLink) {
        // Init
    }

    function requestRandomWords(
        VRFV2PlusClient.RandomWordsRequest calldata req
    ) external returns (uint256 requestId) {
        requestId = s_currentRequestId++;
        s_consumers[requestId] = msg.sender;
        
        emit RandomWordsRequested(
            req.keyHash,
            requestId,
            100, // preSeed
            req.subId,
            req.requestConfirmations,
            req.callbackGasLimit,
            req.numWords,
            req.extraArgs,
            msg.sender
        );
        return requestId;
    }

    function fulfillRandomWords(uint256 requestId, address consumer) external {
        // Simple mock fulfillment
        uint256[] memory randomWords = new uint256[](1);
        randomWords[0] = uint256(keccak256(abi.encode(requestId, block.timestamp)));
        
        // Call the consumer
        VRFConsumerBaseV2Plus(consumer).rawFulfillRandomWords(requestId, randomWords);
        emit RandomWordsFulfilled(requestId, randomWords[0], 0, true);
    }
    
    function createSubscription() external returns (uint256 subId) {
        return 1;
    }
    
    function fundSubscription(uint256 subId, uint96 amount) external {
        // Do nothing
    }
    
    function addConsumer(uint256 subId, address consumer) external {
        // Do nothing
    }
}
