# Task: Build Active Raffles Dashboard

This task focuses on integrating the `active raffles` grid with the deployed smart contracts using `ethers.js`.

## Prerequisites
- [ ] Install `ethers` in `web` directory: `npm install ethers`
- [ ] Ensure `LottoFactory` address is available (env var or constant)

## Implementation Steps

### 1. Contract Integration Setup
- [ ] Create `web/src/lib/abis/LottoFactory.json` with the ABI from `contracts`
- [ ] Create `web/src/lib/abis/Raffle.json` with the ABI from `contracts`
- [ ] Create `web/src/lib/constants.ts` to store contract addresses
- [ ] Create `web/src/lib/contracts.ts` to initialize `ethers` provider and contract instances

### 2. Data Fetching
- [ ] Implement `fetchRaffles` function in `contracts.ts`:
    - Call `LottoFactory.getRaffles()` to get the list of raffle addresses
    - Iterate through addresses and create `Raffle` contract instances
    - Fetch details for each raffle (price, prize, end time, status) using `Promise.all`
    - **Note**: Ensure we only show "Open" raffles if applicable, or filter by state.

### 3. UI Integration
- [ ] specific component `RaffleGrid` or update `page.tsx`
- [ ] Use `useEffect` or a data fetching library (like SWR or React Query, or simple `useState` for now as per minimal deps) to load data on mount.
- [ ] Display "Loading..." state while fetching.
- [ ] Map the fetched data to the `Card` component properties.
    - Title: `Raffle #{id}` or similar (maybe fetch name if added later, currently generic)
    - Prize: Fetch balance or `Prize` variable
    - Ticket Price: `entranceFee`
    - Ends In: Calculate from `s_lastTimeStamp + i_interval` - `block.timestamp` (approx) or `open/closed` status.

### 4. Verification
- [ ] Run local node (`npx hardhat node`)
- [ ] Deploy contracts locally
- [ ] Create a mock raffle via console or script
- [ ] Verify it appears on the frontend
