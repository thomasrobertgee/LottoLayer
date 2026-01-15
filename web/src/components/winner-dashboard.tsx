
"use client";

import { useEffect, useState } from "react";
import { useWeb3 } from "@/lib/web3-provider";
import { ethers, Contract } from "ethers";
import { LOTTO_FACTORY_ADDRESS, RPC_URL, CHAIN_ID, BLOCK_EXPLORER_URL } from "@/lib/constants";
import LottoFactoryABI from "@/lib/abis/LottoFactory.json";
import RaffleABI from "@/lib/abis/Raffle.json";
import { Trophy, ExternalLink, Copy, CheckCircle } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface WinnerData {
    raffleAddress: string;
    winner: string;
    amount: string;
    symbol: string;
    timestamp: number;
    txHash: string;
    ticketsSold: number;
}

interface WinnerHistoryTableProps {
    limit?: number;
    showTitle?: boolean;
}

export function WinnerHistoryTable({ limit = 10, showTitle = true }: WinnerHistoryTableProps) {
    const { provider } = useWeb3();
    const [winners, setWinners] = useState<WinnerData[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchWinners = async () => {
            if (!LOTTO_FACTORY_ADDRESS) return;
            if (winners.length === 0) setLoading(true);

            try {
                const readProvider = (provider && (await provider.getNetwork()).chainId === BigInt(CHAIN_ID))
                    ? provider
                    : new ethers.JsonRpcProvider(RPC_URL);

                const factory = new Contract(ethers.getAddress(LOTTO_FACTORY_ADDRESS), LottoFactoryABI.abi, readProvider);
                const filter = factory.filters.WinnerPicked();
                const events = await factory.queryFilter(filter, -50000);

                if (events.length === 0) {
                    setWinners([]);
                    setLoading(false);
                    return;
                }

                // Newest first
                const sortedEvents = events.reverse().slice(0, limit);

                const winnerPromises = sortedEvents.map(async (event: any) => {
                    const { raffle, winner, amount } = event.args;
                    let blockTimestamp = Date.now() / 1000;

                    try {
                        const block = await event.getBlock();
                        if (block) blockTimestamp = block.timestamp;
                    } catch (e) { console.warn("Block fetch failed", e); }

                    // Fetch tickets sold (total players)
                    let ticketsSold = 0;
                    try {
                        const r = new Contract(raffle, RaffleABI.abi, readProvider);
                        // getNumPlayers might be reset to 0? 
                        // Wait, fulfillRandomWords resets players to 0. 
                        // So we can't get it from contract state after the fact.
                        // But we can get it from the `RaffleEnter` logs?
                        // Or just Assume MAX tickets if it triggered? 
                        // Or `balance / price`?
                        // We have `amount` (winners pot).
                        // WinnersPot = 95% of Total.
                        // Total = Amount / 0.95.
                        // Tickets = Total / Price.
                        // Let's fetch Entrance Fee.
                        const fee = await r.getEntranceFee();
                        const pot = BigInt(amount);
                        const totalCollected = (pot * BigInt(100)) / BigInt(95);
                        ticketsSold = Number(totalCollected / fee);
                    } catch (e) {
                        // Fallback
                    }

                    return {
                        raffleAddress: raffle,
                        winner: winner,
                        amount: ethers.formatEther(amount),
                        symbol: "ETH",
                        timestamp: blockTimestamp,
                        txHash: event.transactionHash,
                        ticketsSold: ticketsSold
                    };
                });

                const results = await Promise.all(winnerPromises);
                setWinners(results);

            } catch (error) {
                console.error("Failed to fetch winners", error);
            } finally {
                setLoading(false);
            }
        };

        fetchWinners();
        const interval = setInterval(fetchWinners, 15000);
        return () => clearInterval(interval);
    }, [provider]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    };

    if (loading && winners.length === 0) return <div className="text-center py-8 opacity-50 font-mono">Syncing Registry...</div>;

    if (winners.length === 0) {
        return (
            <div className="text-center py-12 bg-muted/5 rounded-xl border border-dashed border-primary/20 mt-16">
                <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent winners found.</p>
            </div>
        );
    }

    return (
        <div className="mt-16 space-y-4">
            {showTitle && (
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent flex items-center gap-2">
                        <Trophy className="text-yellow-500 w-5 h-5" /> Recent Winners
                    </h2>
                    <Badge variant="outline" className="font-mono text-xs">Verified On-Chain</Badge>
                </div>
            )}

            <div className="rounded-md border bg-card/50 backdrop-blur-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-b border-primary/10">
                                <TableHead className="w-[150px] whitespace-nowrap">Date</TableHead>
                                <TableHead className="whitespace-nowrap">Raffle ID</TableHead>
                                <TableHead className="whitespace-nowrap">Winner</TableHead>
                                <TableHead className="text-right whitespace-nowrap">Prize (ETH)</TableHead>
                                <TableHead className="text-center whitespace-nowrap">Tickets</TableHead>
                                <TableHead className="text-center whitespace-nowrap">Status</TableHead>
                                <TableHead className="text-right whitespace-nowrap">Proof</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {winners.map((row, idx) => (
                                <TableRow key={`${row.raffleAddress}-${idx}`} className="hover:bg-muted/50 transition-colors border-b border-primary/5">
                                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                                        {new Date(row.timestamp * 1000).toLocaleString('en-GB', {
                                            day: '2-digit', month: '2-digit', year: '2-digit',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-blue-400">
                                                {row.raffleAddress.slice(0, 6)}...{row.raffleAddress.slice(-4)}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-4 w-4 text-muted-foreground/50 hover:text-white"
                                                onClick={() => copyToClipboard(row.raffleAddress)}
                                            >
                                                <Copy className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
                                            <span className="font-mono text-xs font-medium">
                                                {row.winner.slice(0, 6)}...{row.winner.slice(-4)}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-yellow-500 whitespace-nowrap">
                                        {parseFloat(row.amount).toFixed(4)}
                                    </TableCell>
                                    <TableCell className="text-center text-xs text-muted-foreground whitespace-nowrap">
                                        {row.ticketsSold}
                                    </TableCell>
                                    <TableCell className="text-center whitespace-nowrap">
                                        <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] uppercase font-bold tracking-wider">
                                            Paid
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right whitespace-nowrap">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <a
                                                        href={`${BLOCK_EXPLORER_URL}/tx/${row.txHash}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-white/10 transition-colors text-blue-400"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>View Transaction</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
            {limit <= 10 && showTitle && (
                <div className="flex justify-center pt-2">
                    <a href="/results">
                        <Button variant="outline" size="sm">View More History &rarr;</Button>
                    </a>
                </div>
            )
            }
        </div >
    );
}
