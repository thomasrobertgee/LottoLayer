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
import { Navbar } from "@/components/navbar";
import { CreateRaffleButton } from "@/components/create-raffle-button";



import { RaffleList } from "@/components/raffle-list";
import { WinnerHistoryTable } from "@/components/winner-dashboard";


export default function Home() {








  return (

    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

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
