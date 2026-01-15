"use client";

import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { ExternalLink, ShieldCheck, Lock, Eye } from "lucide-react";

export default function ProvableFairnessPage() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <Navbar />

            <main className="flex-1 py-12 md:py-24">
                <div className="container mx-auto px-4 max-w-3xl text-center">
                    <ShieldCheck className="w-16 h-16 text-primary mx-auto mb-6" />
                    <h1 className="text-4xl font-extrabold tracking-tight mb-6">Provable Fairness</h1>
                    <p className="text-xl text-muted-foreground mb-12">
                        We don't trust. We verify. LottoLayer uses industry-standard cryptography to guarantee fairness.
                    </p>

                    <div className="space-y-12 text-left">
                        <section>
                            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                <Lock className="w-6 h-6 text-primary" /> Chainlink VRF
                            </h3>
                            <div className="prose dark:prose-invert max-w-none text-muted-foreground">
                                <p>
                                    All winner selections are determined by <strong className="text-foreground">Chainlink VRF (Verifiable Random Function)</strong>.
                                    VRF generates a random number and a cryptographic proof of how that number was determined.
                                    The smart contract will only accept the random number input if it has a valid cryptographic proof,
                                    and the cryptographic proof can only be generated if the VRF process is tamper-proof.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                <Eye className="w-6 h-6 text-primary" /> On-Chain Transparency
                            </h3>
                            <div className="prose dark:prose-invert max-w-none text-muted-foreground">
                                <p>
                                    Every ticket purchase, draw trigger, and payout is recorded on the Base Sepolia blockchain.
                                    Anyone can inspect the smart contract code and verify the transactions in real-time.
                                    State changes are immutable and visible to the public.
                                </p>
                            </div>
                        </section>

                        <div className="bg-muted/10 border border-primary/20 rounded-lg p-8 text-center mt-12">
                            <h4 className="text-lg font-bold mb-2">Verify for yourself</h4>
                            <p className="text-sm text-muted-foreground mb-6">
                                Check our verified contracts on BaseScan.
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <Button variant="outline" className="gap-2">
                                    Factory Contract <ExternalLink className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" className="gap-2">
                                    Raffle Contract <ExternalLink className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
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
