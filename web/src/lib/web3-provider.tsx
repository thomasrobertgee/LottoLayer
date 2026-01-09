"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { BrowserProvider, JsonRpcSigner, ethers, Eip1193Provider } from "ethers";
import { CHAIN_ID, CHAIN_ID_HEX, RPC_URL, BLOCK_EXPLORER_URL } from "./constants";

declare global {
    interface Window {
        ethereum?: Eip1193Provider & {
            on: (event: string, callback: (...args: any[]) => void) => void;
            removeListener: (event: string, callback: (...args: any[]) => void) => void;
            request: (args: { method: string; params?: any[] }) => Promise<any>;
        };
    }
}

interface Web3ContextType {
    provider: BrowserProvider | null;
    signer: JsonRpcSigner | null;
    account: string | null;
    chainId: number | null;
    balance: string | null;
    connectWallet: () => Promise<void>;
    switchNetwork: () => Promise<void>;
    isConnected: boolean;
}

const Web3Context = createContext<Web3ContextType>({
    provider: null,
    signer: null,
    account: null,
    chainId: null,
    balance: null,
    connectWallet: async () => { },
    switchNetwork: async () => { },
    isConnected: false,
});

export const Web3Provider = ({ children }: { children: ReactNode }) => {
    const [provider, setProvider] = useState<BrowserProvider | null>(null);
    const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
    const [account, setAccount] = useState<string | null>(null);
    const [chainId, setChainId] = useState<number | null>(null);
    const [balance, setBalance] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    const updateBalance = async (provider: BrowserProvider, account: string) => {
        try {
            const balanceWei = await provider.getBalance(account);
            const balanceEth = ethers.formatEther(balanceWei);
            // Format to 4 decimal places
            const formatted = parseFloat(balanceEth).toFixed(4);
            setBalance(formatted);
        } catch (error) {
            console.error("Failed to fetch balance", error);
        }
    };


    // Initialize provider and events
    useEffect(() => {
        if (typeof window !== "undefined" && window.ethereum) {
            const _provider = new ethers.BrowserProvider(window.ethereum);
            setProvider(_provider);

            const updateState = async () => {
                const accounts = await _provider.listAccounts();
                const network = await _provider.getNetwork();
                setChainId(Number(network.chainId));

                if (accounts.length > 0) {
                    const _signer = await _provider.getSigner();
                    setSigner(_signer);
                    setAccount(accounts[0].address);
                    setIsConnected(true);
                    updateBalance(_provider, accounts[0].address);
                } else {
                    setSigner(null);
                    setAccount(null);
                    setBalance(null);
                    setIsConnected(false);
                }
            };

            updateState();

            // Listeners
            const handleAccountsChanged = (accounts: string[]) => {
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                    _provider.getSigner().then(setSigner);
                    setIsConnected(true);
                    updateBalance(_provider, accounts[0]);
                } else {
                    setAccount(null);
                    setSigner(null);
                    setBalance(null);
                    setIsConnected(false);
                }
            };

            const handleChainChanged = (_chainId: string) => {
                // chainId returned by event is hex string
                setChainId(parseInt(_chainId, 16));
                // Provide recommends reloading on chain change, but we can just update state if handled correctly
                window.location.reload();
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);

            // Setup block listener for live balance updates
            _provider.on("block", () => {
                if (account) {
                    updateBalance(_provider, account);
                }
            });

            return () => {
                if (window.ethereum && window.ethereum.removeListener) {
                    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                    window.ethereum.removeListener('chainChanged', handleChainChanged);
                }
                _provider.removeAllListeners("block");
            }
        }
    }, [account]); // Added account to dependency array to ensure block listener uses current account

    const connectWallet = async () => {
        if (!window.ethereum || !provider) {
            alert("Please install MetaMask!");
            return;
        }
        try {
            // Prompt connection
            await provider.send("eth_requestAccounts", []);
            const _signer = await provider.getSigner();
            setSigner(_signer);
            const address = await _signer.getAddress();
            const network = await provider.getNetwork();

            setAccount(address);
            setChainId(Number(network.chainId));
            setIsConnected(true);
            updateBalance(provider, address);
        } catch (error) {
            console.error("Connection failed", error);
        }
    };

    const switchNetwork = async () => {
        if (!provider) return;

        try {
            await provider.send("wallet_switchEthereumChain", [{ chainId: CHAIN_ID_HEX }]);
        } catch (switchError: any) {
            // This error code (4902) indicates that the chain has not been added to MetaMask.
            if (switchError.code === 4902) {
                try {
                    await provider.send("wallet_addEthereumChain", [
                        {
                            chainId: CHAIN_ID_HEX,
                            chainName: "Base Sepolia",
                            rpcUrls: [RPC_URL],
                            blockExplorerUrls: [BLOCK_EXPLORER_URL],
                            nativeCurrency: {
                                name: "ETH",
                                symbol: "ETH",
                                decimals: 18,
                            },
                        },
                    ]);
                } catch (addError) {
                    console.error("Failed to add network", addError);
                }
            } else {
                console.error("Failed to switch network", switchError);
            }
        }
    };

    return (
        <Web3Context.Provider value={{ provider, signer, account, chainId, balance, connectWallet, switchNetwork, isConnected }}>
            {children}
        </Web3Context.Provider>
    );
};

export const useWeb3 = () => useContext(Web3Context);
