"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/lib/web3-provider";
import { ethers, Contract } from "ethers";
import { LOTTO_FACTORY_ADDRESS, RPC_URL, CHAIN_ID } from "@/lib/constants";
import LottoFactoryABI from "@/lib/abis/LottoFactory.json";
import RaffleABI from "@/lib/abis/Raffle.json";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WinnerData {
    raffleAddress: string;
    winner: string;
    amount: string;
    symbol: string;
    timestamp: number;
}

export function WinnerDashboard() {
    const { provider } = useWeb3();
    const [winners, setWinners] = useState<WinnerData[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchWinners = async () => {
            if (!LOTTO_FACTORY_ADDRESS) return;
            setLoading(true);
            try {
                // Determine which provider to use for reading
                const readProvider = (provider && (await provider.getNetwork()).chainId === BigInt(CHAIN_ID))
                    ? provider
                    : new ethers.JsonRpcProvider(RPC_URL);

                const factory = new Contract(ethers.getAddress(LOTTO_FACTORY_ADDRESS), LottoFactoryABI.abi, readProvider);
                const raffleAddresses = await factory.getRaffles();


                const winnerPromises = raffleAddresses.map(async (address: string) => {
                    const raffle = new Contract(address, RaffleABI.abi, readProvider);
                    const recentWinner = await raffle.getRecentWinner();


                    if (recentWinner === ethers.ZeroAddress) return null;

                    // Get Reward details
                    const rewardToken = await raffle.getRewardToken();
                    let symbol = "ETH";
                    let decimals = 18;

                    if (rewardToken !== ethers.ZeroAddress) {
                        try {
                            const tokenContract = new Contract(rewardToken, ["function symbol() view returns (string)", "function decimals() view returns (uint8)"], readProvider);
                            const [sym, dec] = await Promise.all([tokenContract.symbol(), tokenContract.decimals()]);
                            symbol = sym;
                            decimals = dec;
                        } catch (e) {
                            symbol = "Token";
                        }
                    }

                    // Get Amount from events
                    // Filter "WinnerPicked" logic
                    const filter = raffle.filters.WinnerPicked();
                    // Query last 10000 blocks or from beginning? 
                    // Base Sepolia is fast, maybe we just query a range or 'fromBlock: 0' if manageable.
                    // For safety/performance, let's try getting the last event.
                    const events = await raffle.queryFilter(filter, -50000); // Look back 50k blocks approx

                    if (events.length === 0) return null;

                    const lastEvent = events[events.length - 1] as any;
                    const amount = lastEvent.args ? lastEvent.args[1] : BigInt(0);

                    // Block data for timestamp
                    const block = await readProvider.getBlock(lastEvent.blockNumber);

                    return {
                        raffleAddress: address,
                        winner: recentWinner,
                        amount: ethers.formatUnits(amount, decimals),
                        symbol: symbol,
                        timestamp: block ? block.timestamp : Date.now() / 1000
                    };
                });

                const results = await Promise.all(winnerPromises);
                const validWinners = results.filter((w): w is WinnerData => w !== null);

                // Sort by timestamp desc
                validWinners.sort((a, b) => b.timestamp - a.timestamp);

                setWinners(validWinners);

            } catch (error) {
                console.error("Failed to fetch winners", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWinners();
    }, [provider]);

    if (loading && winners.length === 0) return <div className="text-center py-8 opacity-50">Loading Winners...</div>;
    if (winners.length === 0) {
        return (
            <div className="mt-16 text-center space-y-4 py-12 bg-muted/5 rounded-xl border border-dashed border-primary/20">
                <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                <div className="space-y-1">
                    <h3 className="text-xl font-bold text-muted-foreground">No winners yet</h3>
                    <p className="text-muted-foreground/80">
                        First draw happening soon! Join a raffle to be our first winner.
                    </p>
                </div>
            </div>
        );
    }


    return (
        <div className="mt-16 space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-center bg-gradient-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
                <Trophy className="text-yellow-500 w-6 h-6" /> Recent Winners
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {winners.map((win, idx) => (
                    <WinnerCard key={`${win.raffleAddress}-${idx}`} data={win} index={idx} />
                ))}
            </div>
        </div>
    );
}

function WinnerCard({ data, index }: { data: WinnerData, index: number }) {
    const [revealed, setRevealed] = useState(false);

    let badge = null;
    if (index === 0) badge = <span className="absolute top-2 right-2 bg-yellow-500 text-black font-bold text-xs px-2 py-1 rounded-full shadow-lg border border-yellow-300 z-20">1st Place 🥇</span>;
    if (index === 1) badge = <span className="absolute top-2 right-2 bg-gray-300 text-black font-bold text-xs px-2 py-1 rounded-full shadow-lg border border-gray-100 z-20">2nd Place 🥈</span>;
    if (index === 2) badge = <span className="absolute top-2 right-2 bg-orange-700 text-white font-bold text-xs px-2 py-1 rounded-full shadow-lg border border-orange-500 z-20">3rd Place 🥉</span>;

    return (
        <Card className="bg-gradient-to-br from-black/40 to-black/20 border-yellow-500/20 overflow-hidden relative group">
            <div className="absolute inset-0 bg-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            {badge}


            <CardContent className="p-6 text-center space-y-4 relative z-10 min-h-[200px] flex flex-col justify-center items-center">
                <CardTitle className="text-sm font-light text-muted-foreground uppercase tracking-widest mb-2">
                    Raffle {data.raffleAddress.slice(0, 6)}...
                </CardTitle>

                <AnimatePresence mode="wait">
                    {!revealed ? (
                        <motion.div
                            key="hidden"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                            transition={{ duration: 0.3 }}
                        >
                            <Gift className="w-16 h-16 text-yellow-500/50 mx-auto mb-4 animate-bounce" />
                            <Button
                                onClick={() => setRevealed(true)}
                                variant="outline"
                                className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 hover:text-yellow-400 font-bold tracking-wide"
                            >
                                Reveal Winner
                            </Button>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="revealed"
                            initial={{ opacity: 0, scale: 0.5, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ type: "spring", bounce: 0.4 }}
                            className="space-y-4"
                        >
                            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                                <Trophy className="w-8 h-8 text-black" />
                            </div>

                            <div className="space-y-1">
                                <p className="text-2xl font-bold text-white tracking-tight">
                                    {parseFloat(data.amount).toFixed(4)} {data.symbol}
                                </p>
                                <p className="text-xs font-mono text-yellow-500/80 bg-yellow-500/10 px-2 py-1 rounded-full">
                                    {data.winner.slice(0, 6)}...{data.winner.slice(-4)}
                                </p>
                            </div>

                            <p className="text-[10px] text-muted-foreground">
                                Won {getTimeAgo(data.timestamp)}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}

function getTimeAgo(timestamp: number) {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);
    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 }
    ];

    for (const i of intervals) {
        const count = Math.floor(seconds / i.seconds);
        if (count >= 1) return `${count} ${i.label}${count !== 1 ? 's' : ''} ago`;
    }
    return 'just now';
}
