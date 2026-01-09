"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Ticket, Timer, Trophy, Wallet, Plus, LogOut } from "lucide-react";
import { CreateRaffleButton } from "@/components/create-raffle-button";
import { useWeb3 } from "@/lib/web3-provider";
import { CHAIN_ID } from "@/lib/constants";



import { RaffleList } from "@/components/raffle-list";
import { WinnerHistoryTable } from "@/components/winner-dashboard";


export default function Home() {





  const { isConnected, account, connectWallet, chainId, switchNetwork, balance } = useWeb3();
  const isWrongNetwork = isConnected && chainId !== CHAIN_ID;


  return (

    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navbar */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter">
            <Ticket className="w-8 h-8 text-primary" />
            <span>LottoLayer</span>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium">
            <a href="#" className="hover:text-primary transition-colors">
              How it Works
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Provable Fairness
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Stats
            </a>
          </nav>
          {isConnected ? (
            <div className="flex items-center gap-4">
              {isWrongNetwork ? (
                <Button variant="destructive" onClick={switchNetwork} size="sm">
                  Switch to Base Sepolia
                </Button>
              ) : (
                <>
                  <div className="text-sm font-medium mr-2">
                    {balance && <span>{balance} ETH</span>}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {account?.slice(0, 6)}...{account?.slice(-4)}
                  </div>
                  <Button variant="outline" size="sm">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          ) : (
            <Button onClick={connectWallet}>
              <Wallet className="mr-2 h-4 w-4" /> Connect Wallet
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-24 md:py-32 bg-gradient-to-b from-background to-muted/20">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              Decentralized <span className="text-primary">Micro-Raffles</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
              Transparent, provably fair, and instant. Experience the future of on-chain lotteries powered by Base Sepolia and Chainlink VRF.
            </p>
            <div className="flex justify-center gap-4">
              <Button size="lg" className="h-12 px-8 text-lg">
                Start Playing
              </Button>
              <CreateRaffleButton />
            </div>
          </div>
        </section>

        {/* Active Raffles Grid */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-bold tracking-tight">Active Raffles</h2>
              <Button variant="ghost" className="text-primary hover:text-primary/90">
                View All &rarr;
              </Button>
            </div>

            <RaffleList />
            <WinnerHistoryTable />
          </div>
        </section>

      </main>

      <footer className="border-t py-12 bg-muted/10">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 LottoLayer. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
