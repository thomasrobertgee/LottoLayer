"use client";

import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Coins, Award } from "lucide-react";

export default function StatsPage() {
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <Navbar />

            <main className="flex-1 py-12 md:py-24">
                <div className="container mx-auto px-4 max-w-6xl">
                    <h1 className="text-4xl font-extrabold tracking-tight mb-12">Protocol Statistics</h1>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                                <Coins className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">128.4 ETH</div>
                                <p className="text-xs text-muted-foreground">+12% from last month</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Raffles Completed</CardTitle>
                                <Award className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">1,492</div>
                                <p className="text-xs text-muted-foreground">+42 this week</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Players</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">8,234</div>
                                <p className="text-xs text-muted-foreground">+120 new players</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Active Raffles</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">24</div>
                                <p className="text-xs text-muted-foreground">Currently running</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="rounded-xl border bg-card/50 text-card-foreground shadow p-12 text-center text-muted-foreground border-dashed">
                        Charts and detailed analytics coming soon...
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
