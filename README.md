# LottoLayer 🎲

> **Decentralized, Autonomous, and Provably Fair Raffle Protocol on Base.**

LottoLayer is a full-stack Web3 application designed to demonstrate the power of autonomous smart contracts. It enables users to create, participate in, and verify on-chain raffles that are self-managed by Chainlink Automation and secured by Chainlink VRF.

This repository serves as a **production-ready baseline** for any project requiring:
1.  **Factory Pattern**: Spawning child contracts from a master factory.
2.  **Automated Limits**: Contracts that react to time or state (e.g., ticket caps) without manual intervention.
3.  **True Randomness**: Integrating Chainlink VRF V2.5.
4.  **Web3 Frontend**: A modern Next.js dashboard interacting with complex on-chain logic.

---

## 📂 Repository Structure

```
LottoLayer/
├── contracts/                  # Hardhat Environment (Smart Contracts)
│   ├── contracts/              # Solidity Source Code
│   │   ├── LottoFactory.sol    # The "Manager" contract
│   │   ├── Raffle.sol          # The "Instance" contract
│   │   └── LottoZap.sol        # Token Swap Helper
│   ├── scripts/                # Deployment & Interaction Scripts
│   ├── test/                   # Unit Tests
│   └── hardhat.config.ts       # Network Configuration
│
└── web/                        # Next.js Frontend
    ├── src/
    │   ├── app/                # Pages (Home, Results, etc.)
    │   ├── components/         # React Components (RaffleCard, Navbar)
    │   ├── lib/                # Utilities, ABIs, Web3 Context
    │   └── hooks/              # Custom React Hooks
    └── public/                 # Static Assets
```

---

## 🏗 Core Architecture

The system relies on a **Hub-and-Spoke** model where the `LottoFactory` spawns individual `Raffle` contracts.

### 1. The Factory (`LottoFactory.sol`)
*   **Role**: Deployer, Manager, and Automation Registry.
*   **Functionality**:
    *   Deploys new `Raffle` contracts using specific parameters (Price, Duration, Max Tickets).
    *   Manages the global **Chainlink VRF Subscription**.
    *   Acts as the central point for **Chainlink Automation**. Instead of registering an upkeep for every single raffle (expensive), we register **ONE** upkeep for the Factory. The Factory then loops through its `activeRaffles` list to check if any child raffle needs attention.
*   **Key Concept**: *Bucket Management*. The factory tracks active raffles. When a raffle closes, the factory removes it from the active list and spawns a replacement if configured to auto-renew.

### 2. The Raffle (`Raffle.sol`)
*   **Role**: The container for funds and game logic.
*   **State Machine**:
    *   `OPEN` (0): Accepts deposits/tickets.
    *   `CALCULATING` (1): Tickets are locked. Waiting for Chainlink VRF to return a random number.
    *   `CLOSED` (2): Winner has been picked, funds distributed.
*   **Modes**:
    *   **Capped**: `duration = 0`. Closes strictly when `maxTickets` are sold.
    *   **Timed**: `maxTickets = MaxUint256`. Closes strictly when `block.timestamp > end`.
*   **Failsafes**: Includes an `emergencyDraw()` function. If the raffle gets stuck in `CALCULATING` (due to VRF network failure) for >1 hour, the automation triggers a fallback mechanism using block difficulty to pick a winner and free the funds.

### 3. The Zap (`LottoZap.sol`)
*   **Role**: UX enhancer.
*   **Functionality**: Allows users to pay with ERC20 tokens (like USDC). It performs a Uniswap swap to WETH/ETH in the background and buys the ticket in a single transaction.

---

## 📜 Smart Contract Deep Dive

### `Raffle.sol`

| Function | Access | Description |
| :--- | :--- | :--- |
| `buyTicket()` | Public | Purchase a single ticket with ETH. |
| `buyTickets(uint256 n)` | Public | Bulk purchase `n` tickets. Value must match `price * n`. |
| `buyTicketFor(address)` | Public | Purchase a ticket on behalf of another address (Gift/Zap). |
| `checkUpkeep()` | Automation | Checks if the raffle should close (Time passed OR Cap reached). Returns `true`. |
| `performUpkeep()` | Automation | Triggers the state change to `CALCULATING` and requests VRF randomness. |
| `fulfillRandomWords()` | Internal | VRF Callback. Receives random number, picks winner, sends funds, resets state. |
| `emergencyDraw()` | Owner/Admin | Manual override to force a draw if the system hangs. |

**Key State Variables:**
*   `i_interval`: Duration in seconds.
*   `i_maxTickets`: Max capacity.
*   `s_players`: Append-only array of participant addresses.
*   `s_recentWinner`: Address of the last winner.

### `LottoFactory.sol`

| Function | Access | Description |
| :--- | :--- | :--- |
| `createRaffle(...)` | Public | Spawns a new `Raffle` contract instance. |
| `checkUpkeep()` | Automation | Iterates all `s_activeRaffles`. Checks if any need a Draw (Action 0) or Respawn (Action 1). |
| `performUpkeep()` | Automation | Executes the action returned by `checkUpkeep`. |
| `onRaffleEnded(...)` | External | Callback from a child raffle to notify the factory it has finished. |

---

## 💻 Frontend Architecture

The frontend is built with **Next.js 15** and **Ethers v6**. It provides a real-time dashboard for the protocol.

*   `src/lib/web3-provider.tsx`: Context provider that manages the wallet connection (MetaMask, etc.), signer, and provider state.
*   `src/lib/constants.ts`: Stores deployed contract addresses. **Update this file when deploying to a new network.**
*   `src/components/raffle-list.tsx`: The main "feed" of raffles. It fetches the list of active raffles from the Factory, then creates a contract instance for *each* raffle to fetch its live data (tickets sold, timer, price).
*   `src/components/create-raffle-button.tsx`: The modal interface for spawning new raffles. Handles the switch between "Timed" and "Capped" modes logic.

---

## 🔁 The Lifecycle (How it Works)

1.  **Spawn**: A user calls `factory.createRaffle()`. The factory deploys a new contract and adds it to the `s_activeRaffles` array.
2.  **Play**: Users call `raffle.buyTicket()` sending ETH. Their address is added to `s_players`.
3.  **Detect**: Chainlink Automation nodes constantly call `factory.checkUpkeep()`. The factory checks the child raffle.
    *   *Is time up?* OR *Is it sold out?*
4.  **Trigger**: If yes, Chainlink calls `factory.performUpkeep()`, which calls `raffle.performUpkeep()`.
5.  **Randomness**: The raffle sets state to `CALCULATING` and requests a random number from the VRF Coordinator.
6.  **Callback**: The VRF Coordinator responds to `fulfillRandomWords()` with a random number.
7.  **Payout**:
    *   The code processes the random number modulo the number of players (`rng % players.length`) to find the index of the winner.
    *   95% of pot is sent to the winner.
    *   5% is sent to the Treasury.
    *   Raffle state moves to `CLOSED`.
8.  **Cycle**: The Factory sees the raffle is `CLOSED`. It removes it from the active list and (optionally) spawns a fresh new raffle with the same settings.

---

## 🛠 Setup & Deployment Guide

### Prerequisites
*   Node.js v18+
*   An Ethereum Wallet (e.g., MetaMask) with **Base Sepolia (Testnet)** ETH.
*   Chainlink VRF Subscription ID (Base Sepolia).

### 1. Contracts Setup
```bash
cd contracts
npm install

# Create .env
echo "PRIVATE_KEY=your_key_here" > .env
echo "ETHERSCAN_API_KEY=your_key_here" >> .env
```

### 2. Deploy to Base Sepolia
```bash
npx hardhat run scripts/deploy-v2-complete.ts --network baseSepolia
```
*   This script deploys the Factory.
*   It creates a new VRF Subscription (or uses an existing one).
*   It adds the Factory as a consumer.

### 3. Verification
```bash
npx hardhat verify --network baseSepolia <FACTORY_ADDRESS> <VRF_COORD> <GAS_LANE> <SUB_ID>
```

### 4. Frontend Setup
```bash
cd ../web
npm install

# Update Constants
# Edit src/lib/constants.ts and set LOTTO_FACTORY_ADDRESS to your new address.

npm run dev
```

---

## 🔮 Pivot Guide: How to repurpose this repo?

This codebase is a template for **Factory-Instance** dApps. Here are ideas on how to pivot:

### Scenario A: "Decentralized Crowdfunding Platform"
1.  **Rename** `Raffle.sol` to `Campaign.sol`.
2.  **Modify** logic: Instead of picking a winner at the end, `fulfillRandomWords` becomes `finalizeCampaign`.
3.  **Logic Change**: If `totalFunds >= goal`, send funds to the `creator`. If `totalFunds < goal`, enable a `refund()` function for depositors.
4.  **UI**: Change "Buy Ticket" to "Donate".

### Scenario B: "Prediction Market / Betting"
1.  **Modify** `Raffle.sol` to allow two teams/outcomes. `buyTicket(uint outcome)`.
2.  **State**: `s_players` becomes `s_teamA` and `s_teamB`.
3.  **Resolution**: Instead of VRF picking a winner, add an `Oracle` address that calls `resolve(winner_team)`.
4.  **Payout**: Distribute losing team's funds to winning team's depositors.

### Scenario C: "NFT Minting Drop"
1.  **Modify** `createRaffle` to accept an NFT Collection address.
2.  **Payout**: Instead of sending ETH to the winner, the contract calls `nft.mint(winner)`.
3.  **Revenue**: The ETH pot goes 100% to the creator/treasury.

---

## 🔐 Security & Known Limitations

*   **Automation Costs**: The Factory pays for the gas of the upkeep loop. Ensure the factory or the subscription is funded.
*   **Gas Limits**: If `s_activeRaffles` grows too large (e.g., >50 active raffles), the loop in `checkUpkeep` might exceed the block gas limit. *Mitigation: Implement a 'max active raffles' cap in the factory.*
*   **Reentrancy**: All state-changing functions dealing with ETH transfer are protected with `nonReentrant`.

---

**Built with 💙 by Antigravity**
