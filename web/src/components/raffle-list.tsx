"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/lib/web3-provider";
import { ethers, Contract } from "ethers";
import { LOTTO_FACTORY_ADDRESS, LOTTO_ZAP_ADDRESS, USDC_ADDRESS, RPC_URL, CHAIN_ID } from "@/lib/constants";
import LottoFactoryABI from "@/lib/abis/LottoFactory.json";
import RaffleABI from "@/lib/abis/Raffle.json";
import LottoZapABI from "@/lib/abis/LottoZap.json";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AGGREGATOR_V3_ABI, PRICE_FEEDS } from "@/lib/chainlink";
import { Copy, Timer, Info, Trophy, Coins, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";



interface RaffleData {
    id: string; // Address as ID
    entranceFee: string;
    prize: string;
    state: number; // 0: OPEN, 1: CALCULATING
    endsIn: string; // Display string, we might want raw timestamp for real countdown
    participants: number;
    maxTickets: number;
    numWinners: number;
    rawEntranceFee: bigint;
    owner: string;
}



export function RaffleList() {
    const { provider, signer } = useWeb3();
    const [prices, setPrices] = useState({ eth: 0, btc: 0 });
    const [raffles, setRaffles] = useState<RaffleData[]>([]);
    const [loading, setLoading] = useState(false);
    const [account, setAccount] = useState<string>("");

    useEffect(() => {
        if (signer) {
            signer.getAddress().then(setAccount);
        } else {
            setAccount("");
        }
    }, [signer]);


    const fetchPrices = async () => {
        if (!provider) return;
        try {
            // Fetch ETH/USD
            const ethFeed = new Contract(PRICE_FEEDS.ETH_USD, AGGREGATOR_V3_ABI, provider);
            const [, ethPrice, , ,] = await ethFeed.latestRoundData();

            // Fetch BTC/USD
            const btcFeed = new Contract(PRICE_FEEDS.BTC_USD, AGGREGATOR_V3_ABI, provider);
            const [, btcPrice, , ,] = await btcFeed.latestRoundData();

            setPrices({
                eth: parseFloat(ethers.formatUnits(ethPrice, 8)),
                btc: parseFloat(ethers.formatUnits(btcPrice, 8))
            });
        } catch (error) {
            console.error("Failed to fetch prices", error);
        }
    };

    // Auto-Refresh on New Raffle
    useEffect(() => {
        // We use a simple polling or event listener. 
        // Since we have a provider even if wallet not connected (via fallback logic if implemented, or just skip),
        // we should try to listen.
        let factoryContract: Contract | null = null;

        const setupListener = async () => {
            // Fallback provider if no wallet
            const activeProvider = provider || new ethers.JsonRpcProvider(RPC_URL);
            factoryContract = new Contract(LOTTO_FACTORY_ADDRESS, LottoFactoryABI.abi, activeProvider);

            console.log("Listening for RaffleCreated events on", LOTTO_FACTORY_ADDRESS);
            factoryContract.on("RaffleCreated", (raffleAddress) => {
                console.log("New Raffle Detected:", raffleAddress);
                toast.success("New Raffle Created! Refreshing list...", { id: "new-raffle" });
                fetchRaffles();
            });
        };

        setupListener();

        return () => {
            if (factoryContract) {
                factoryContract.removeAllListeners("RaffleCreated");
            }
        };
    }, [provider]);

    const fetchRaffles = async () => {
        if (!LOTTO_FACTORY_ADDRESS) return;
        setLoading(true);
        try {
            // Determine which provider to use for reading
            // If wallet is connected and on correct chain, use it. Otherwise use public RPC.
            const readProvider = (provider && (await provider.getNetwork()).chainId === BigInt(CHAIN_ID))
                ? provider
                : new ethers.JsonRpcProvider(RPC_URL);

            // Fetch prices (only if we have a provider, though JsonRpcProvider works too if configured)
            if (readProvider) {
                // Fetch ETH/USD
                try {
                    const ethFeed = new Contract(PRICE_FEEDS.ETH_USD, AGGREGATOR_V3_ABI, readProvider);
                    const [, ethPrice] = await ethFeed.latestRoundData();
                    setPrices(prev => ({ ...prev, eth: parseFloat(ethers.formatUnits(ethPrice, 8)) }));
                } catch (e) { console.warn("Price feed error", e); }
            }

            const factory = new Contract(ethers.getAddress(LOTTO_FACTORY_ADDRESS), LottoFactoryABI.abi, readProvider);

            // Use getActiveRaffles() to only show currently running raffles
            // This filters out CLOSED/replaced raffles automatically if the contract logic is sound.
            // If getActiveRaffles returns mix, we filter manually too.
            const raffleAddresses = await factory.getActiveRaffles();

            if (raffleAddresses.length === 0) {
                setRaffles([]);
                return;
            }

            // Filter hidden raffles
            const hidden = JSON.parse(localStorage.getItem("hiddenRaffles") || "[]");
            const visibleAddresses = raffleAddresses.filter((addr: string) => !hidden.includes(addr));

            if (visibleAddresses.length === 0) {
                setRaffles([]);
                return;
            }

            const raffleDataPromises = visibleAddresses.map(async (address: string) => {
                const raffle = new Contract(address, RaffleABI.abi, readProvider);

                // Fetch basic info

                const [entranceFee, state, maxTicketsValue, balance, numPlayers, numWinners, owner] = await Promise.all([
                    raffle.getEntranceFee(),
                    raffle.getRaffleState(),
                    raffle.getMaxTickets(), // Added getMaxTickets call
                    readProvider.getBalance(address), // Actual Balance
                    raffle.getNumPlayers(),
                    raffle.getNumWinners(),
                    raffle.owner()
                ]);


                // Calculate Ends In
                const [interval, lastTimestamp] = await Promise.all([
                    raffle.getInterval(),
                    raffle.getLastTimeStamp()
                ]);

                const maxTickets = Number(maxTicketsValue);

                let endsInStr = "Draw on Sell-Out";
                // Timer Logic Removed for now as per user request
                /*
                // If interval is 0, it is untimed (infinite).
                if (Number(interval) !== 0) {
                    const endTime = Number(lastTimestamp) + Number(interval);
                    const now = Math.floor(Date.now() / 1000);
                    const secondsLeft = Math.max(0, endTime - now);
                    const hours = Math.floor(secondsLeft / 3600);
                    const minutes = Math.floor((secondsLeft % 3600) / 60);
                    endsInStr = `${hours}h ${minutes}m`;
                }
                */

                const projectedPrize = BigInt(numPlayers) * entranceFee * BigInt(95) / BigInt(100);

                // If balance is 0 (new raffle), show projected logic or 0.
                // However user asked for "Current Entries * Ticket Price * 0.95" specifically.
                // We'll use the maxim of balance or projected to be safe, or just projected as requested.
                // Let's use projected for "Live Prize Pool" display as requested.

                // NOTE: If state is CALCULATING (1), it means it's closed.

                return {
                    id: address,
                    entranceFee: ethers.formatEther(entranceFee),
                    rawEntranceFee: entranceFee,
                    prize: ethers.formatEther(projectedPrize),
                    state: Number(state),
                    participants: Number(numPlayers),
                    maxTickets: maxTickets,
                    numWinners: Number(numWinners),
                    endsIn: endsInStr,
                    owner: owner
                };
            });

            const data = await Promise.all(raffleDataPromises);

            // Filter out CLOSED raffles (State 2) just in case they linger in active array
            const activeOnly = data.filter(r => r.state !== 2);

            setRaffles(activeOnly);

        } catch (error) {
            console.error("Failed to fetch raffles", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRaffles();
        const interval = setInterval(fetchRaffles, 10000);
        return () => clearInterval(interval);
    }, [provider]);

    const handleBuyTicket = async (raffleAddress: string, price: bigint, quantity: number) => {
        if (!signer) {
            toast.error("Please connect your wallet");
            return;
        }
        try {
            const checksummedAddress = ethers.getAddress(raffleAddress);
            const raffle = new Contract(checksummedAddress, RaffleABI.abi, signer);

            // Debugging: Log pre-flight
            console.log("Attempting to buy ticket for " + checksummedAddress);
            console.log("Frontend Price: " + price.toString());

            // Pre-flight checks
            const onChainFee = await raffle.getEntranceFee();
            const onChainState = await raffle.getRaffleState();
            console.log("Pre-Buy ON-CHAIN Check -> Fee: " + onChainFee.toString() + " | State: " + onChainState.toString());

            if (onChainState.toString() !== "0") {
                console.warn("WARNING: Raffle is NOT OPEN on-chain!");
            }

            console.log("Encoding call for buyTicket manually...");

            // Log signer address to verify we have a signer
            // IMPORTANT: Get fresh signer from provider to ensure no stale state
            if (!provider) throw new Error("No provider available");
            const freshSigner = await provider.getSigner();
            const signerAddress = await freshSigner.getAddress();
            console.log("Using Fresh Signer:", signerAddress);

            // Connect using fresh signer for simulation
            const raffleWithSigner = new Contract(checksummedAddress, RaffleABI.abi, freshSigner);

            // SIMULATION: Static Call to check logic
            try {
                console.log("Simulating transaction via staticCall...");
                await raffleWithSigner.buyTicket.staticCall({ value: price });
                console.log("✅ Static Call Success: Transaction logic is VALID.");
            } catch (e: any) {
                console.error("❌ STATIC CALL FAILED. Logic error found:", e.message);
                if (e.data) {
                    console.error("Revert Data:", e.data);
                    // Decode common errors if possible, or just log
                    if (e.data === "0x3ee5aeb5") console.error("DECODED: RaffleNotOpen");
                }
                if (e.revert) console.error("Revert details:", e.revert);

                toast.error("Simulation Failed: " + (e.reason || "Check Console"), { id: "buy-ticket" });
                // We typically shouldn't proceed if simulation fails, but for debugging flow we sometimes do.
                // However, staticCall failure guarantees tx failure. Let's return to save gas?
                // The prompt says "Diagnostic Task", implies we want to SEE the error.
                // Often better to stop here so we don't annoy the user with a failed wallet popup.
                return;
            }

            // Use Contract instance directly logic
            console.log("Sending transaction via Contract instance...");
            // Calculate total value
            const totalValue = price * BigInt(quantity);
            console.log(`Buying ${quantity} tickets. Total Value: ${totalValue.toString()}`);

            let tx;
            if (quantity > 1) {
                console.log("Calling buyTickets(quantity)...");
                tx = await raffleWithSigner.buyTickets(quantity, {
                    value: totalValue,
                    gasLimit: 1000000 // Generous limit for loop
                });
            } else {
                console.log("Calling buyTicket()...");
                tx = await raffleWithSigner.buyTicket({
                    value: price,
                    gasLimit: 500000
                });
            }
            console.log("SENT TRANSACTION:", tx);
            console.log("FINAL PUSHED DATA (from tx object):", tx.data);

            toast.loading("Buying ticket...", { id: "buy-ticket" });
            await tx.wait();
            toast.success("Ticket purchased!", { id: "buy-ticket" });
            fetchRaffles();
        } catch (error: any) {
            console.error("Buy Ticket Error:", error);

            if (error.data) {
                console.error("Error Data (Revert Custom Error?):", error.data);
                if (error.data === "0x3ee5aeb5") {
                    console.error("CONFIRMED: RaffleNotOpen (0x3ee5aeb5)");
                    toast.error("Raffle is Closed (On-Chain)", { id: "buy-ticket" });
                    return;
                }
            }

            if (error.transaction && error.transaction.data) {
                console.log("Failed Tx Data:", error.transaction.data);
            }

            toast.error("Failed to buy ticket", { id: "buy-ticket", description: error.message || "Unknown error" });
        }
    };

    const handleZapBuy = async (raffleAddress: string, ethCost: string) => {
        if (!signer) {
            toast.error("Please connect your wallet");
            return;
        }
        try {
            const checksummedAddress = ethers.getAddress(raffleAddress);

            // 1. Estimate Token Input needed
            const ZapContract = new Contract(LOTTO_ZAP_ADDRESS, LottoZapABI, signer);
            const UsdcContract = new Contract(USDC_ADDRESS, [
                "function approve(address spender, uint256 amount) external returns (bool)",
                "function allowance(address owner, address spender) external view returns (uint256)"
            ], signer);

            // Hardcoded "max spend" for demo safety.
            const amountInMax = ethers.parseUnits("100", 6); // 100 USDC Max

            toast.loading("Approving USDC...", { id: "zap-buy" });
            const txApprove = await UsdcContract.approve(LOTTO_ZAP_ADDRESS, amountInMax);
            await txApprove.wait();

            toast.loading("Swapping & Entering...", { id: "zap-buy" });

            // Raffle fee in ETH is ethCost
            // Fee tier 3000 (0.3%) for USDC/WETH
            const txZap = await ZapContract.swapAndEnter(
                USDC_ADDRESS,
                amountInMax,
                checksummedAddress,
                3000,
                { gasLimit: 1000000 } // Safety gas limit 1M
            );

            await txZap.wait();
            toast.success("Swap & Entry Success!", { id: "zap-buy" });
            fetchRaffles();

        } catch (error: any) {
            console.error(error);
            toast.error("Detailed Error: " + (error.reason || error.message), { id: "zap-buy" });
        }
    };


    const handleManualDraw = async (raffleAddress: string) => {
        if (!signer) {
            toast.error("Please connect your wallet");
            return;
        }
        try {
            const checksummedAddress = ethers.getAddress(raffleAddress);
            const raffle = new Contract(checksummedAddress, RaffleABI.abi, signer);

            // Manual Draw via performUpkeep
            console.log("Manually triggering draw for " + checksummedAddress);
            const tx = await raffle.performUpkeep("0x", { gasLimit: 500000 });

            toast.loading("Triggering VRF...", { id: "manual-draw" });
            await tx.wait();
            toast.success("Draw Triggered! VRF Request Sent.", { id: "manual-draw" });

            fetchRaffles();
            setTimeout(fetchRaffles, 2000);
        } catch (error: any) {
            console.error("Manual Draw Error:", error);
            const msg = error.reason || error.message || "Unknown error";
            toast.error("Failed to trigger draw: " + msg, { id: "manual-draw" });
        }
    };

    const handleEmergencyDraw = async (raffleAddress: string) => {
        if (!signer) return;
        try {
            const raffle = new Contract(raffleAddress, RaffleABI.abi, signer);
            console.log("Triggering Emergency Draw for " + raffleAddress);

            const tx = await raffle.emergencyDraw({ gasLimit: 500000 });
            toast.loading("Executing Emergency Draw...", { id: "emergency" });
            await tx.wait();
            toast.success("Emergency Draw Completed! Refreshing...", { id: "emergency" });
            fetchRaffles();
        } catch (e: any) {
            console.error(e);
            toast.error("Failed: " + (e.reason || e.message), { id: "emergency" });
        }
    };

    const handleArchive = (raffleAddress: string) => {
        const hidden = JSON.parse(localStorage.getItem("hiddenRaffles") || "[]");
        if (!hidden.includes(raffleAddress)) {
            hidden.push(raffleAddress);
            localStorage.setItem("hiddenRaffles", JSON.stringify(hidden));
            toast.success("Raffle Archived", { description: "Hidden from dashboard" });
            fetchRaffles(); // Refresh list to remove it
        }
    };

    if (!provider) {
        return <div className="text-center py-10 text-muted-foreground">Connect wallet to view raffles</div>;
    }

    if (loading && raffles.length === 0) {
        return <div className="text-center py-10">Loading active raffles...</div>;
    }

    if (raffles.length === 0) {
        return <div className="text-center py-10 text-muted-foreground">No active raffles found. Create one!</div>;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {raffles.map((raffle) => (
                <RaffleCard
                    key={raffle.id}
                    raffle={raffle}
                    prices={prices}
                    onBuy={handleBuyTicket}
                    onZap={handleZapBuy}
                    onManualDraw={handleManualDraw}
                    onEmergencyDraw={handleEmergencyDraw}
                    onArchive={handleArchive}
                    userAddress={account}
                />
            ))}
        </div>
    );
}

function ContractInspector({ address, provider }: { address: string, provider: any }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!address || !provider) return;

        async function load() {
            setLoading(true);
            try {
                const contract = new Contract(address, RaffleABI.abi, provider);
                const [state, fee, owner, interval, lastTimeStamp] = await Promise.all([
                    contract.getRaffleState(),
                    contract.getEntranceFee(),
                    contract.owner(),
                    contract.getInterval(),
                    contract.getLastTimeStamp(),
                    // contract.minInterval() // assuming this might exist or just check ABI
                ]);

                setData({
                    state: state.toString(),
                    fee: ethers.formatEther(fee),
                    owner: owner,
                    interval: interval.toString(),
                    lastTimeStamp: lastTimeStamp.toString(),
                    validOpen: state.toString() === "0",
                });
            } catch (e) {
                console.error("Inspector failed", e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [address, provider]);

    if (loading) return <div className="text-xs font-mono p-2 animate-pulse">Scanning contract...</div>;
    if (!data) return null;

    return (
        <div className="mt-4 p-3 bg-slate-950 rounded border border-slate-800 text-[10px] font-mono text-slate-400 overflow-hidden">
            <div className="font-bold text-slate-300 mb-2 border-b border-slate-800 pb-1">ON-CHAIN INSPECTOR</div>
            <div className="grid grid-cols-[80px_1fr] gap-1">
                <span>State:</span><span className={data.validOpen ? "text-green-500" : "text-red-500"}>{data.state} ({data.validOpen ? "OPEN" : "CLOSED"})</span>
                <span>Fee:</span><span>{data.fee} ETH</span>
                <span>Owner:</span><span className="truncate" title={data.owner}>{data.owner}</span>
                <span>Interval:</span><span>{data.interval}s</span>
                <span>Last TS:</span><span>{data.lastTimeStamp}</span>
                <span>Now:</span><span>{Math.floor(Date.now() / 1000)}</span>
            </div>
            {!data.validOpen && <div className="mt-2 text-red-500 font-bold">⚠️ RAFFLE IS CLOSED</div>}
        </div>
    );
}

function RaffleCard({
    raffle,
    prices,
    onBuy,
    onZap,
    onManualDraw,
    onEmergencyDraw,
    onArchive,
    userAddress
}: {
    raffle: RaffleData,
    prices: { eth: number, btc: number },
    onBuy: (id: string, price: bigint, quantity: number) => Promise<void>,
    onZap: (id: string, ethCost: string) => Promise<void>,
    onManualDraw: (id: string) => void,
    onEmergencyDraw: (id: string) => void,
    onArchive: (id: string) => void,
    userAddress: string
}) {
    const [selectedAsset, setSelectedAsset] = useState<"ETH" | "USDC">("ETH");
    const [quantity, setQuantity] = useState(1);
    const [showInspector, setShowInspector] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const { provider } = useWeb3();

    // Check ownership or Admin privileges
    const ADMIN_ADDRESS = "0xDE2563fcD41a1394a2677F260906FA06fcd88342".toLowerCase();
    const isOwner = userAddress && (
        (raffle.owner && userAddress.toLowerCase() === raffle.owner.toLowerCase()) ||
        userAddress.toLowerCase() === ADMIN_ADDRESS
    );

    // Calculate quote
    const ethCost = parseFloat(raffle.entranceFee);
    const totalEthCost = ethCost * quantity;
    let displayCost = `${Number(totalEthCost.toFixed(6))} ETH`;
    let quote = "";

    if (selectedAsset === "USDC" && prices.eth > 0) {
        const costInUSD = totalEthCost * prices.eth;
        displayCost = `~$${costInUSD.toFixed(2)} USDC`;
        quote = `Swapping USDC → ETH`;
    }

    // Status / Badge Logic
    const isCalculating = raffle.state === 1;
    const isSoldOut = raffle.participants >= raffle.maxTickets;
    const isTimeUp = raffle.endsIn === "0h 0m";

    // Manual Draw visibility
    const showManualDraw = raffle.state === 0 && isTimeUp && raffle.participants > 0;

    const isClosed = raffle.state !== 0 || isSoldOut;

    let badgeText = "Open";
    let badgeClass = "bg-green-500/10 text-green-500 border-green-500/20";

    if (isCalculating) {
        badgeText = "Calculating";
        badgeClass = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 animate-pulse";
    } else if (isSoldOut) {
        badgeText = "Sold Out";
        badgeClass = "bg-red-500/10 text-red-500 border-red-500/20";
    } else if (isTimeUp) {
        badgeText = "Awaiting Draw";
        badgeClass = "bg-orange-500/10 text-orange-500 border-orange-500/20";
    } else if (raffle.endsIn === "Draw on Sell-Out") {
        // Special badge for untimed raffles?
        badgeText = "Untimed";
        badgeClass = "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }

    // Button Logic
    let buttonText = quantity > 1 ? `Buy ${quantity} Tickets` : "Buy Ticket";
    if (selectedAsset !== "ETH") buttonText = "Swap & Buy";

    let isButtonDisabled = isClosed;

    if (isCalculating) {
        buttonText = "Draw in Progress";
    } else if (isSoldOut) {
        buttonText = "Sold Out";
    } else if (raffle.state !== 0) {
        buttonText = "Closed";
    }

    const handleClick = async () => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            if (selectedAsset === "ETH") {
                await onBuy(raffle.id, raffle.rawEntranceFee, quantity);
            } else {
                // Zap doesn't support bulk yet in UI, or maybe it does? 
                // For now, let's keep Zap as single ticket or warn.
                // Assuming Zap contract needs update or loop. 
                // Let's force quantity 1 for Zap for now or just pass fee.
                // Actually, if we swap enough for X tickets, we need to call buyTickets on Zap?
                // The current Zap contract calls `joinRaffle` which probably calls `buyTicket`.
                // Let's stick to ETH for Bulk for this iteration.
                if (quantity > 1) {
                    toast.error("Bulk buy only supported with ETH for now");
                    return;
                }
                await onZap(raffle.id, raffle.entranceFee);
            }
        } catch (e) {
            console.error("Buy logic error:", e);
        } finally {
            setIsProcessing(false);
        }
    };


    return (
        <Card className="hover:shadow-lg transition-all border-primary/10 bg-card/50 backdrop-blur-sm group relative">

            {/* Archive Button */}
            <div className="absolute top-4 right-4 z-10 flex gap-1">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={(e) => { e.preventDefault(); setShowInspector(!showInspector); }}
                                className={`transition-colors p-1 ${showInspector ? "text-blue-400" : "text-muted-foreground/30 hover:text-blue-400"}`}
                            >
                                <Info className="w-4 h-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Toggle Inspector</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={(e) => { e.preventDefault(); onArchive(raffle.id); }}
                                className="text-muted-foreground/30 hover:text-red-500 transition-colors p-1"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Archive Raffle</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            <CardHeader>
                <CardTitle className="flex justify-between items-start pr-16">
                    <span className="truncate w-3/4" title={raffle.id}>Raffle #{raffle.id.slice(0, 6)}</span>
                    <span className={`text-xs font-normal px-2.5 py-0.5 rounded-full uppercase tracking-wide border ${badgeClass}`}>
                        {badgeText}
                    </span>
                </CardTitle>
                <CardDescription className="font-mono text-xs">{raffle.id}</CardDescription>

            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground flex items-center">
                            <Trophy className="w-4 h-4 mr-2" /> Prize Pool
                        </span>
                        <span className="font-bold text-lg">{raffle.prize} ETH</span>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span className="flex items-center">
                                {/* <Timer className="w-3 h-3 mr-1" />  Timer Hidden */}
                                {raffle.endsIn === "Draw on Sell-Out" ? "Draw on Sell-Out" : ""}
                            </span>
                            <span className="flex items-center">
                                <Coins className="w-3 h-3 mr-1" />
                                {raffle.maxTickets > 1_000_000_000 ? `${raffle.participants} Sold` : `${raffle.participants} / ${raffle.maxTickets} Sold`}
                            </span>
                        </div>
                        {raffle.maxTickets <= 1_000_000_000 && (
                            <Progress value={(raffle.participants / raffle.maxTickets) * 100} className="h-2" />
                        )}
                    </div>

                    <div className="pt-2">
                        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Pay with</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setSelectedAsset("ETH")}
                                className={`flex items-center justify-center p-2 rounded-md border text-sm transition-all
                                    ${selectedAsset === "ETH"
                                        ? "bg-primary/10 border-primary text-primary font-medium"
                                        : "hover:bg-muted border-transparent"
                                    }`}
                            >
                                <img src="https://cryptologos.cc/logos/ethereum-eth-logo.png?v=025" className="w-4 h-4 mr-2" alt="ETH" />
                                ETH
                            </button>
                            <button
                                onClick={() => setSelectedAsset("USDC")}
                                className={`flex items-center justify-center p-2 rounded-md border text-sm transition-all
                                    ${selectedAsset === "USDC"
                                        ? "bg-blue-500/10 border-blue-500 text-blue-500 font-medium"
                                        : "hover:bg-muted border-transparent"
                                    }`}
                            >
                                <img src="https://cryptologos.cc/logos/usd-coin-usdc-logo.png?v=025" className="w-4 h-4 mr-2" alt="USDC" />
                                USDC
                            </button>
                        </div>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-between pt-2">
                        <span className="text-xs font-medium text-muted-foreground">Quantity</span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                disabled={quantity <= 1 || isClosed}
                            >
                                <span className="text-xs">-</span>
                            </Button>

                            <Input
                                type="number"
                                value={quantity}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (!isNaN(val)) {
                                        // Cap at 9999 or Remaining
                                        const remaining = raffle.maxTickets - raffle.participants;
                                        setQuantity(Math.max(1, Math.min(val, 9999, remaining)));
                                    } else if (e.target.value === "") {
                                        // Allow empty momentarily or set to 1? 
                                        // Set to 1 to be safe for now, or use a separate string state for perfect input UX.
                                        // Simple approach: set to 1 if invalid/empty
                                        setQuantity(1);
                                    }
                                }}
                                className="h-8 w-16 text-center text-sm p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                disabled={isClosed}
                            />

                            <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => {
                                    const remaining = raffle.maxTickets - raffle.participants;
                                    setQuantity(Math.min(9999, remaining, quantity + 1));
                                }}
                                disabled={isClosed}
                            >
                                <span className="text-xs">+</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* INSPECTOR */}
                {showInspector && <ContractInspector address={raffle.id} provider={provider} />}

            </CardContent>
            <CardFooter className="flex flex-col gap-2 border-t pt-6 bg-muted/10">
                <div className="flex justify-between items-center w-full">
                    <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                            {quantity > 1 ? "Total Cost" : "Entry Fee"}
                        </span>
                        <div className="text-lg font-bold">{displayCost}</div>
                        {selectedAsset === "USDC" && <span className="text-[10px] text-muted-foreground">{quote}</span>}
                    </div>
                    <Button
                        size="lg"
                        onClick={handleClick}
                        disabled={isButtonDisabled || isProcessing || (selectedAsset === "USDC" && prices.eth === 0)}
                        className={`min-w-[140px] shadow-sm ${isCalculating ? "opacity-90" : ""}`}
                    >
                        {isProcessing ? "Processing..." : buttonText}
                    </Button>
                </div>

                {/* BUTTONS */}
                {/* Emergency Manual Draw Button: Only if Owner AND Calculating */}
                {isOwner && isCalculating && (
                    <Button
                        variant="destructive"
                        size="sm"
                        className="w-full mt-2 animate-in fade-in slide-in-from-top-1 bg-red-600 hover:bg-red-700"
                        onClick={() => onEmergencyDraw(raffle.id)}
                    >
                        <Timer className="w-4 h-4 mr-2" />
                        Admin: Emergency Draw
                    </Button>
                )}

                {/* Standard Manual Draw Button */}
                {showManualDraw && (
                    <Button
                        variant="destructive"
                        size="sm"
                        className="w-full mt-2 animate-in fade-in slide-in-from-top-1"
                        onClick={() => onManualDraw(raffle.id)}
                    >
                        <Timer className="w-4 h-4 mr-2" />
                        Force Draw (Dev Only)
                    </Button>
                )}
            </CardFooter>
            {
                isSoldOut && !isCalculating && (
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center z-20 text-center p-4 animate-in fade-in duration-500">
                        <Timer className="w-10 h-10 text-primary mb-2 animate-spin-slow" />
                        <h3 className="font-bold text-lg">Generating New Raffle...</h3>
                        <p className="text-sm text-muted-foreground">This raffle is full. Please wait.</p>
                    </div>
                )
            }
        </Card>
    );
}
