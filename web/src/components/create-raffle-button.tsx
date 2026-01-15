"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWeb3 } from "@/lib/web3-provider";
import { parseEther, Contract, ZeroAddress, getAddress } from "ethers";
import LottoFactoryABI from "@/lib/abis/LottoFactory.json";
import { LOTTO_FACTORY_ADDRESS } from "@/lib/constants";
import { toast } from "sonner";
import { Plus, Ticket, Users, Timer, Trophy } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateRaffleButton() {
    const { signer, isConnected, connectWallet } = useWeb3();
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false);

    // Form States
    const [raffleType, setRaffleType] = useState<"capped" | "timed">("capped");
    const [ticketPrice, setTicketPrice] = useState("0.0001");
    const [maxTickets, setMaxTickets] = useState("5");
    const [durationMinutes, setDurationMinutes] = useState("120");
    const [numWinners, setNumWinners] = useState("1");

    const handleCreateRaffle = async () => {
        if (!isConnected || !signer) {
            connectWallet();
            return;
        }

        try {
            setIsLoading(true);
            const factory = new Contract(getAddress(LOTTO_FACTORY_ADDRESS), LottoFactoryABI.abi, signer);

            const priceWei = parseEther(ticketPrice);
            let max: bigint;
            let durationSec = parseInt(durationMinutes) * 60;
            const winners = parseInt(numWinners);

            // Logic Adjustment based on Type
            if (raffleType === "capped") {
                max = BigInt(maxTickets);
                durationSec = 0; // Force no timer
            } else {
                // Force effectively unlimited tickets (MaxUint256)
                max = 2n ** 256n - 1n;
            }

            // Basic Validation
            if (raffleType === "capped" && winners >= max) {
                toast.error("Invalid Configuration", { description: "Winners cannot exceed max tickets." });
                setIsLoading(false);
                return;
            }

            // Params: ticketPrice, maxTickets, duration, rewardToken, numWinners
            const tx = await factory.createRaffle(
                priceWei,
                max,
                durationSec, // 0 = Sell-out only
                ZeroAddress, // Native ETH
                winners
            );

            toast.info("Transaction sent...", { description: `Tx Hash: ${tx.hash}` });

            await tx.wait();
            toast.success("Raffle Created Successfully!");
            setOpen(false);

        } catch (error: any) {
            console.error(error);
            toast.error("Failed to create raffle", { description: error.message || "Unknown error" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Create Custom Raffle
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Raffle</DialogTitle>
                    <DialogDescription>
                        Set the parameters for your new on-chain raffle.
                    </DialogDescription>
                </DialogHeader>
                {/* Type Selection */}
                <div className="flex gap-2 mb-4 p-1 bg-muted rounded-lg">
                    <Button
                        variant={raffleType === "capped" ? "default" : "ghost"}
                        className="flex-1 rounded-md"
                        onClick={() => setRaffleType("capped")}
                    >
                        <Ticket className="w-4 h-4 mr-2" />
                        Capped (Sell-Out)
                    </Button>
                    <Button
                        variant={raffleType === "timed" ? "default" : "ghost"}
                        className="flex-1 rounded-md"
                        onClick={() => setRaffleType("timed")}
                    >
                        <Timer className="w-4 h-4 mr-2" />
                        Timed (Expiry)
                    </Button>
                </div>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="price" className="text-right">
                            Ticket Price
                        </Label>
                        <div className="col-span-3 relative">
                            <Input
                                id="price"
                                type="number"
                                step="0.00001"
                                value={ticketPrice}
                                onChange={(e) => setTicketPrice(e.target.value)}
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">ETH</span>
                        </div>
                    </div>

                    {/* Max Tickets Input */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="max" className="text-right">
                            Max Tickets
                        </Label>
                        <Input
                            id="max"
                            type="number"
                            value={raffleType === 'timed' ? "" : maxTickets}
                            placeholder={raffleType === 'timed' ? "Unlimited" : "5"}
                            onChange={(e) => setMaxTickets(e.target.value)}
                            className="col-span-3"
                            disabled={raffleType === 'timed'}
                        />
                    </div>

                    {/* Duration Input */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="duration" className="text-right">
                            Duration
                        </Label>
                        <div className="col-span-3 relative">
                            <Input
                                id="duration"
                                type="number"
                                value={raffleType === 'capped' ? "" : durationMinutes}
                                placeholder={raffleType === 'capped' ? "No Timer" : "120"}
                                onChange={(e) => setDurationMinutes(e.target.value)}
                                disabled={raffleType === 'capped'}
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">Min</span>
                        </div>
                    </div>

                    {/* Winners Input */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="winners" className="text-right">
                            Winners
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="winners"
                                type="number"
                                value={numWinners}
                                onChange={(e) => setNumWinners(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">
                                {parseInt(numWinners) > 1
                                    ? (parseInt(numWinners) === 3
                                        ? "Split: 60% / 30% / 5% (5% House)"
                                        : "Split: Equal Distribution")
                                    : "Winner takes 95%"}
                            </p>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleCreateRaffle} disabled={isLoading} className="w-full">
                        {isLoading ? "Creating on-chain..." : "Create Raffle"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
