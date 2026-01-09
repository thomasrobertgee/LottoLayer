# LottoLayer Smart Contracts

This directory contains the Solidity smart contracts for LottoLayer.

## Architecture

1.  **LottoFactory.sol**: The Factory contract that deploys and manages `Raffle` contracts. It holds the Chainlink VRF configuration.
2.  **Raffle.sol**: The core logic for a single raffle instance. 
    -   **Entry**: Users buy tickets with native token (MATIC/POL).
    -   **Triggers**: Draw starts when time expires OR max tickets are sold.
    -   **Randomness**: Secured by Chainlink VRF v2.5.
    -   **Payout**: 95% to Winner, 5% to Factory Owner (House).

## Tech Stack
-   Solidity ^0.8.24
-   Hardhat
-   Chainlink VRF v2.5 (Direct Funding / Subscription)
-   Polygon PoS (Amoy Testnet / Mainnet)

## Setup & Testing
1.  Install dependencies: `npm install`
2.  Run tests: `npx hardhat test`
3.  Deploy: `npx hardhat run scripts/deploy.ts`
