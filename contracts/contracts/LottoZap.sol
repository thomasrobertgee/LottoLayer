// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ISwapRouter {
    struct ExactOutputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountOut;
        uint256 amountInMaximum;
        uint160 sqrtPriceLimitX96;
    }

    function exactOutputSingle(ExactOutputSingleParams calldata params) external payable returns (uint256 amountIn);
}

interface IWETH {
    function withdraw(uint256) external;
}

interface IRaffle {
    function buyTicketFor(address player) external payable;
    function getEntranceFee() external view returns (uint256);
}

contract LottoZap {
    using SafeERC20 for IERC20;

    ISwapRouter public immutable i_swapRouter;
    address public immutable i_weth;

    constructor(address _swapRouter, address _weth) {
        i_swapRouter = ISwapRouter(_swapRouter);
        i_weth = _weth;
    }

    /**
     * @notice Swap ER20 token to ETH and enter raffle
     * @param tokenIn The token to swap from
     * @param amountInMax The maximum amount of tokenIn to spend
     * @param raffle The raffle contract address
     * @param fee The pool fee tier (e.g. 3000)
     */
    function swapAndEnter(
        address tokenIn,
        uint256 amountInMax,
        address raffle,
        uint24 fee
    ) external {
        // 1. Get cost
        IRaffle raffleContract = IRaffle(raffle);
        uint256 entranceFee = raffleContract.getEntranceFee(); // ETH needed

        // 2. Transfer tokens from user
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountInMax);
        IERC20(tokenIn).forceApprove(address(i_swapRouter), amountInMax);

        // 3. Swap Exact Output (Get exact WETH for ticket)
        ISwapRouter.ExactOutputSingleParams memory params = ISwapRouter.ExactOutputSingleParams({
            tokenIn: tokenIn,
            tokenOut: i_weth,
            fee: fee,
            recipient: address(this),
            deadline: block.timestamp,
            amountOut: entranceFee,
            amountInMaximum: amountInMax,
            sqrtPriceLimitX96: 0
        });

        uint256 amountIn = i_swapRouter.exactOutputSingle(params);

        // 4. Unwrap WETH
        IWETH(i_weth).withdraw(entranceFee);

        // 5. Enter Raffle
        // The router now has `entranceFee` ETH
        raffleContract.buyTicketFor{value: entranceFee}(msg.sender);

        // 6. Refund remaining tokens
        uint256 remaining = amountInMax - amountIn;
        if (remaining > 0) {
            IERC20(tokenIn).safeTransfer(msg.sender, remaining);
        }
        
        // Reset approval to be safe (optional with modern routers but good practice)
        IERC20(tokenIn).forceApprove(address(i_swapRouter), 0);
    }

    // Allow contract to receive ETH from WETH withdraw
    receive() external payable {}
}
