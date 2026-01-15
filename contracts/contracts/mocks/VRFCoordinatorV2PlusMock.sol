// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/dev/vrf/libraries/VRFV2PlusClient.sol";
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/dev/vrf/VRFConsumerBaseV2Plus.sol";

contract VRFCoordinatorV2PlusMock {
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

    event RandomWordsFulfilled(
        uint256 indexed requestId,
        uint256 outputSeed,
        uint96 payment,
        bool success
    );

    uint256 s_nextRequestId = 1;
    mapping(uint256 => VRFV2PlusClient.RandomWordsRequest) s_requests;

    uint96 public immutable BASE_FEE;
    uint96 public immutable GAS_PRICE_LINK;

    constructor(uint96 _baseFee, uint96 _gasPriceLink) {
        BASE_FEE = _baseFee;
        GAS_PRICE_LINK = _gasPriceLink;
    }

    // Mocking the V2.5 requestRandomWords
    function requestRandomWords(
        VRFV2PlusClient.RandomWordsRequest calldata req
    ) external returns (uint256 requestId) {
        requestId = s_nextRequestId++;
        s_requests[requestId] = req;

        emit RandomWordsRequested(
            req.keyHash,
            requestId,
            100, // preSeed mock
            req.subId,
            req.requestConfirmations,
            req.callbackGasLimit,
            req.numWords,
            req.extraArgs,
            msg.sender
        );
        return requestId;
    }

    function fulfillRandomWords(uint256 _requestId, address _consumer) external {
        fulfillRandomWordsWithOverride(_requestId, _consumer, new uint256[](0));
    }

    function fulfillRandomWordsWithOverride(
        uint256 _requestId,
        address _consumer,
        uint256[] memory _words
    ) public {
        VRFV2PlusClient.RandomWordsRequest memory req = s_requests[_requestId];
        
        uint256[] memory words = _words;
        if (words.length == 0) {
            words = new uint256[](req.numWords);
            for (uint256 i = 0; i < req.numWords; i++) {
                words[i] = uint256(keccak256(abi.encode(_requestId, i)));
            }
        }

        // Call proper rawFulfillRandomWords
        // VRFConsumerBaseV2Plus defines rawFulfillRandomWords
        // In V2.5 Base contract, ensure the selector is correct.
        
        // Actually VRFConsumerBaseV2Plus checks `msg.sender == s_vrfCoordinator`.
        // So this Mock address must be the one passed to Raffle constructor.
        
        VRFConsumerBaseV2Plus v;
        bytes memory callReq = abi.encodeWithSelector(
            v.rawFulfillRandomWords.selector, 
            _requestId, 
            words
        );
        
        (bool success, ) = _consumer.call{gas: req.callbackGasLimit}(callReq);
        
        emit RandomWordsFulfilled(_requestId, _requestId, 0, success);
    }
    
    // Mock subscription functions to prevent Raffle constructor failure if it calls them?
    // Raffle doesn't call subscription functions in constructor.
    // Tests might call them.
    
    function createSubscription() external returns (uint256 subId) {
        subId = 1;
        emit SubscriptionCreated(subId, msg.sender);
        return subId;
    }
    
    event SubscriptionCreated(uint256 indexed subId, address owner);
    
    function fundSubscription(uint256 /* subId */, uint96 /* amount */) external pure {}
    
    function addConsumer(uint256 subId, address consumer) external {
        emit ConsumerAdded(subId, consumer);
    }
    
    event ConsumerAdded(uint256 indexed subId, address consumer);
    function acceptSubscriptionOwnerTransfer(uint256 /* subId */) external pure {}
}
