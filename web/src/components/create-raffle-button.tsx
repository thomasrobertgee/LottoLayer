"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWeb3 } from "@/lib/web3-provider";
import { parseEther, Contract, ZeroAddress, getAddress } from "ethers";
import LottoFactoryABI from "@/lib/abis/LottoFactory.json";
import { LOTTO_FACTORY_ADDRESS } from "@/lib/constants";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function CreateRaffleButton() {
    const { signer, isConnected, connectWallet } = useWeb3();
    const [isLoading, setIsLoading] = useState(false);

    const handleCreateRaffle = async () => {
        if (!isConnected || !signer) {
            connectWallet();
            return;
        }

        try {
            setIsLoading(true);
            const factory = new Contract(getAddress(LOTTO_FACTORY_ADDRESS), LottoFactoryABI.abi, signer);

            // Params: ticketPrice, maxTickets, duration, rewardToken, numWinners
            // Updated: 0.0001 ETH, 3 tickets, 1 hour (3600s), Native ETH, 3 Winners
            const ticketPrice = parseEther("0.0001");
            const maxTickets = 3;
            const duration = 3600;
            const rewardToken = ZeroAddress;
            const numWinners = 3;

            const tx = await factory.createRaffle(ticketPrice, maxTickets, duration, rewardToken, numWinners);
            toast.info("Transaction sent...", { description: `Tx Hash: ${tx.hash}` });

            await tx.wait();
            toast.success("Raffle Created Successfully!");

        } catch (error: any) {
            console.error(error);
            toast.error("Failed to create raffle", { description: error.message || "Unknown error" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button onClick={handleCreateRaffle} disabled={isLoading}>
            {isLoading ? "Creating..." : <><Plus className="mr-2 h-4 w-4" /> Create Test Raffle</>}
        </Button>
    );
}
