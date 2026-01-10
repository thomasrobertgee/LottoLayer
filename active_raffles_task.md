# Task: Build Active Raffles Dashboard

This task focuses on integrating the `active raffles` grid with the deployed smart contracts using `ethers.js`.

## Prerequisites
- [x] Install `ethers` in `web` directory: `npm install ethers`
- [x] Ensure `LottoFactory` address is available (env var or constant)

## Implementation Steps

### 1. Contract Integration Setup
- [x] Create `web/src/lib/abis/LottoFactory.json` with the ABI from `contracts`
- [x] Create `web/src/lib/abis/Raffle.json` with the ABI from `contracts`
- [x] Create `web/src/lib/constants.ts` to store contract addresses
- [x] Create `web/src/lib/contracts.ts` to initialize `ethers` provider and contract instances

### 2. Data Fetching
- [x] Implement `fetchRaffles` function in `contracts.ts` (or `raffle-list.tsx`):
    - Call `LottoFactory.getRaffles()` to get the list of raffle addresses
    - Iterate through addresses and create `Raffle` contract instances
    - Fetch details for each raffle (price, prize, end time, status) using `Promise.all`
    - **Note**: Ensure we only show "Open" raffles if applicable, or filter by state.

### 3. UI Integration
- [x] specific component `RaffleGrid` or update `page.tsx`
- [x] Use `useEffect` or a data fetching library to load data on mount.
- [x] Display "Loading..." state while fetching.
- [x] Map the fetched data to the `Card` component properties.
    - Title: `Raffle #{id}` or similar (maybe fetch name if added later, currently generic)
    - Prize: Fetch balance or `Prize` variable
    - Ticket Price: `entranceFee`
    - Ends In: Calculate from `s_lastTimeStamp + i_interval` - `block.timestamp` (approx) or `open/closed` status.

### 4. Verification
- [x] Run local node (`npx hardhat node`) or Base Sepolia
- [x] Deploy contracts locally or testnet
- [x] Create a mock raffle via console or script
- [x] Verify it appears on the frontend

## Enhancements (Completed)
- [x] **Emergency Draw**: Admin button to force-close stuck "Calculating" raffles.
- [x] **Winner History**: Real-time table showing recent winners with TX proof.
- [x] **Duplicate Spawn Guard**: Factory logic to prevent "Double Loop" race conditions.
