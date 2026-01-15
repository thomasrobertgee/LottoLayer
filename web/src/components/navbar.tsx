"use client";

import { useWeb3 } from "@/lib/web3-provider";
import { Button } from "@/components/ui/button";
import { Ticket, LogOut, Wallet } from "lucide-react";
import { CHAIN_ID } from "@/lib/constants";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar() {
    const { isConnected, account, connectWallet, chainId, switchNetwork, balance } = useWeb3();
    const isWrongNetwork = isConnected && chainId !== CHAIN_ID;
    const pathname = usePathname();

    const navLinks = [
        { name: "Active Raffles", href: "/" },
        { name: "Results", href: "/results" },
        { name: "How it Works", href: "/how-it-works" },
        { name: "Provable Fairness", href: "/provable-fairness" },
        { name: "Stats", href: "/stats" },
    ];

    return (
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter hover:opacity-80 transition-opacity">
                    <Link href="/" className="flex items-center gap-2">
                        <Ticket className="w-8 h-8 text-primary" />
                        <span>LottoLayer</span>
                    </Link>
                </div>

                <nav className="hidden md:flex gap-6 text-sm font-medium">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`transition-colors hover:text-primary ${pathname === link.href ? "text-primary font-bold" : "text-muted-foreground"
                                }`}
                        >
                            {link.name}
                        </Link>
                    ))}
                </nav>

                {isConnected ? (
                    <div className="flex items-center gap-4">
                        {isWrongNetwork ? (
                            <Button variant="destructive" onClick={switchNetwork} size="sm">
                                Switch to Base Sepolia
                            </Button>
                        ) : (
                            <>
                                <div className="text-sm font-medium mr-2 hidden sm:block">
                                    {balance && <span>{balance} ETH</span>}
                                </div>
                                <div className="text-sm font-medium text-muted-foreground">
                                    {account?.slice(0, 6)}...{account?.slice(-4)}
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => {/* Disconnect logic if needed */ }}>
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
    );
}
