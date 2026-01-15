"use client";

import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Ticket, Trophy, RefreshCw } from "lucide-react";

export default function HowItWorksPage() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <Navbar />

            <main className="flex-1 py-12 md:py-24">
                <div className="container mx-auto px-4 max-w-4xl">
                    <h1 className="text-4xl font-extrabold tracking-tight mb-6 text-center">How LottoLayer Works</h1>
                    <p className="text-xl text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
                        A truly decentralized lottery protocol where every step is automated and verified on-chain.
                    </p>

                    <div className="grid gap-8 md:grid-cols-2">
                        <Card className="border-primary/10 bg-card/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                                        <Ticket className="w-6 h-6" />
                                    </div>
                                    1. Buy Tickets
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-muted-foreground">
                                Purchase tickets using ETH or USDC. Funds are held securely in the Raffle Smart Contract. Each ticket is assigned a unique range of IDs based on your entry.
                            </CardContent>
                        </Card>

                        <Card className="border-primary/10 bg-card/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                                        <RefreshCw className="w-6 h-6" />
                                    </div>
                                    2. Instant Draw
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-muted-foreground">
                                Once the tickets sell out (or the timer expires), Chainlink Automation instantly triggers the draw. There is no manual intervention required.
                            </CardContent>
                        </Card>

                        <Card className="border-primary/10 bg-card/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    3. Provably Fair
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-muted-foreground">
                                Chainlink VRF (Verifiable Random Function) generates a random number on-chain. This ensures the winner selection is tamper-proof and mathematically random.
                            </CardContent>
                        </Card>

                        <Card className="border-primary/10 bg-card/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3">
                                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                                        <Trophy className="w-6 h-6" />
                                    </div>
                                    4. Auto-Payout
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-muted-foreground">
                                The winner receives their prize automatically in the same transaction that finalizes the draw. The active raffle resets, and a new round begins immediately.
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            <footer className="border-t py-12 bg-muted/10">
                <div className="container mx-auto px-4 text-center text-muted-foreground">
                    <p>&copy; 2024 LottoLayer. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
