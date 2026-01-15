"use client";

import { Navbar } from "@/components/navbar";
import { WinnerHistoryTable } from "@/components/winner-dashboard";

export default function ResultsPage() {

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <Navbar />

            <main className="flex-1 py-12">
                <div className="container mx-auto px-4 text-center max-w-5xl">
                    <h1 className="text-3xl font-bold tracking-tight mb-8">Raffle Results History</h1>
                    <p className="text-muted-foreground mb-12">A complete transparency log of all closed raffles and payouts.</p>

                    {/* Reuse Winner Dashboard Table but unrestricted */}
                    <WinnerHistoryTable limit={100} showTitle={false} />
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
