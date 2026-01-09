# Implementation Plan - LottoFactory & Raffle v2

## Objective
Implement a secure, non-custodial Factory pattern for the LottoLayer crypto lottery system strictly adhering to the user's requirements:
- **Factory Pattern**: `LottoFactory` deploys `Raffle` instances.
- **Raffle Logic**: 95/5 payout split, specific triggers (time or max tickets), and Chainlink VRF v2.5 integration.

## Architecture

### 1. Dependencies & Setup
- **Chainlink Contracts**: Upgrade/Ensure `@chainlink/contracts` supports VRF v2.5 (Subscription Model).
  - *Note: VRF v2.5 typically uses `VRFConsumerBaseV2Plus`.*
- **OpenZeppelin**: Use `ReentrancyGuard` and `Ownable`.

### 2. Smart Contracts

#### A. `Raffle.sol`
**State Variables:**
- Immutable: `i_entranceFee`, `i_maxTickets`, `i_duration`, `i_factoryAddress`.
- Storage: `s_players`, `s_raffleState`, `s_lastTimeStamp`, `s_payoutAddress` (House/Factory).
- Chainlink: `s_vrfCoordinator`, `s_subscriptionId`, `s_gasLane`, `s_callbackGasLimit`.

**Functions:**
1.  **Constructor**: Initialize immutables and VRF coordinator.
2.  **`buyTicket()`**:
    - `msg.value` validation (`== i_entranceFee`).
    - Raffle state check (must be `OPEN`).
    - Max tickets check.
    - Add `msg.sender` to `s_players`.
3.  **`checkUpkeep()`** (Chainlink Automation):
    - Returns `true` if:
        - Contract has balance.
        - State is `OPEN`.
        - Condition met: `(block.timestamp - s_lastTimeStamp > i_duration)` OR `(s_players.length >= i_maxTickets)`.
4.  **`performUpkeep()`**:
    - Validates `upkeepNeeded`.
    - Updates state to `CALCULATING`.
    - Requests Random Words from VRF.
5.  **`fulfillRandomWords()`**:
    - **Selection**: `randomWord % s_players.length`.
    - **Payouts**:
        - **Winner (95%)**: `(totalBalance * 95) / 100`.
        - **House (5%)**: Remaining balance to Factory owner.
        - *Safety*: Use `call` for transfers and verify success.
    - **Reset**: Clear players, reset timestamp, set state to `OPEN`.
    - **Events**: Emit `WinnerPicked`.
6.  **Safety**:
    - `nonReentrant` on `fulfillRandomWords` (or internal logic handled safely) and `buyTicket` (if necessary, though usually low risk on buy, high risk on payout).
    - Custom errors: `Raffle__UpkeepNotNeeded`, `Raffle__TransferFailed`, `Raffle__WrongPayment`.

#### B. `LottoFactory.sol`
**State Variables:**
- `s_raffles`: Array of deployed Raffle contract addresses.

**Functions:**
1.  **`createRaffle(uint256 ticketPrice, uint256 maxTickets, uint256 duration)`**:
    - Deploys new `Raffle` contract.
    - Emits `RaffleCreated`.
    - *Note: Factory owner will be set as the house beneficiary.*

## Step-by-Step Implementation Strategy

1.  **Dependency Check**: Update `package.json` if needed for VRF v2.5 compatibility.
2.  **Draft `Raffle.sol`**:
    - Implement the logic with Custom Errors.
    - Ensure 95/5 split math is safe (Solidity 0.8+ checked arithmetic).
3.  **Draft `LottoFactory.sol`**:
    - Implement deployment logic.
4.  **Update Deployment Scripts**:
    - Ensure mocks are updated if V2.5 interfaces differ significantly.
5.  **Testing**:
    - **Unit Tests**:
        - Test split ratio (95/5).
        - Test triggers (Time vs Max Tickets).
        - Test Reentrancy (Mock attacker).
    - **Mocking**: Use `VRFCoordinatorV2_5Mock` if available, or adapt existing V2 mock.

## Verification
- Run `npx hardhat test` to ensure all new logic passes.
