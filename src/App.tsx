import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrentAccount, useDisconnectWallet, useConnectWallet, useWallets, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { ChatWidget } from './components/ChatWidget';
import { VerificationExplorer } from './components/VerificationExplorer';
import { Cpu, Eye, Settings, Terminal, ShieldAlert, Wallet, ChevronDown, X, ArrowLeft } from 'lucide-react';

type Tab = 'dashboard' | 'chat' | 'explorer';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [reloadKey, setReloadKey] = useState(0);
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [inApp, setInApp] = useState(false);

  // --- dapp-kit Wallet Hooks ---
  const wallets = useWallets();
  const currentAccount = useCurrentAccount();
  const { mutate: connectWallet, isPending: isConnecting } = useConnectWallet();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  // Derived state
  const walletConnected = !!currentAccount;
  const walletAddress = currentAccount?.address ?? '';

  // API config status (from server)
  const [apiStatus, setApiStatus] = useState<{ hasApiKey: boolean; model: string } | null>(null);

  useEffect(() => {
    fetch('/api/config/status')
      .then(r => r.json())
      .then(data => setApiStatus(data))
      .catch(() => setApiStatus(null));
  }, [reloadKey]);

  // Automatically push user into App once wallet connects
  useEffect(() => {
    if (walletConnected) {
      setInApp(true);
    } else {
      setInApp(false);
    }
  }, [walletConnected]);

  const handleConnectWallet = (wallet: ReturnType<typeof useWallets>[number]) => {
    connectWallet(
      { wallet },
      {
        onSuccess: () => {
          setShowWalletPicker(false);
          setInApp(true);
        },
        onError: (err) => {
          console.error("Wallet connection failed:", err);
          alert("Failed to connect wallet: " + (err instanceof Error ? err.message : String(err)));
        }
      }
    );
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setInApp(false);
  };

  const handleSettingsChange = () => {
    setReloadKey((prev) => prev + 1);
  };

  const pageVariants = {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 20 } },
    exit: { opacity: 0, y: -20, scale: 0.98, transition: { duration: 0.1 } }
  };

  const marqueeText = "✦ TRACEAI DECISION ENGINE ACTIVE ✦ IMMUTABLE AUDIT TRAIL ✦ SUI TESTNET: CONNECTED ✦ WALRUS SHARDED STORAGE: DEPLOYED ✦ CRYPTOGRAPHIC SIGNATURE CERTIFICATE ✦ AUTOMATIC GUARDRAILS ON ✦ ";

  return (
    <div className="min-h-screen bg-neo-bg text-neo-black flex flex-col font-sans">
      
      {/* Top Banner Marquee Ticker */}
      <div className="marquee-container neo-border-thick border-t-0 border-x-0">
        <div className="marquee-content">
          <span>{marqueeText}</span>
          <span>{marqueeText}</span>
          <span>{marqueeText}</span>
        </div>
      </div>

      {/* Main Header */}
      <header className="border-b-4 border-neo-black bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Logo & Brand Identity */}
          <div 
            className="flex items-center gap-3 group cursor-pointer select-none"
            onClick={() => setInApp(false)}
            title="Click to go to Home Landing Page"
          >
            <div className="bg-neo-pink p-2.5 border-3 border-neo-black shadow-neo-sm transform group-hover:rotate-12 transition-transform duration-200 flex items-center justify-center select-none">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="28" height="28" fill="#FFDE4D" stroke="#000000" strokeWidth="3" />
                <circle cx="16" cy="16" r="8" fill="#3E8BFF" stroke="#000000" strokeWidth="2.5" />
                <path d="M16 11L18 15H22L19 17L20 21L16 19L12 21L13 17L10 15H14L16 11Z" fill="#000000" />
              </svg>
            </div>
            <div>
              <div className="text-3xl font-black uppercase tracking-tighter leading-none flex items-center font-mono">
                TRACE<span className="text-neo-pink">//</span><span className="bg-neo-yellow px-2 py-0.5 border-3 border-neo-black ml-1 shadow-neo-sm font-sans">AI</span>
              </div>
              <div className="text-[10px] uppercase font-black tracking-widest text-gray-500 mt-1 font-mono flex items-center gap-1">
                <Terminal size={10} /> Cryptographic Support Auditing
              </div>
            </div>
          </div>

          {/* Network Health & Wallet Connection */}
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs font-bold">
            <div className="flex items-center gap-2 bg-neo-green px-3 py-2 border-3 border-neo-black shadow-neo-sm">
              <span className="w-3 h-3 rounded-full inline-block neon-active-led" />
              SUI TESTNET CONNECTED
            </div>

            {/* API Status Indicator */}
            {apiStatus && (
              <div className={`flex items-center gap-2 px-3 py-2 border-3 border-neo-black shadow-neo-sm ${apiStatus.hasApiKey ? 'bg-neo-green' : 'bg-neo-orange text-white'}`}>
                <span className={`w-2 h-2 rounded-full inline-block ${apiStatus.hasApiKey ? 'bg-green-800' : 'bg-red-800 animate-pulse'}`} />
                {apiStatus.hasApiKey ? 'AI: ONLINE' : 'AI: NO KEY'}
              </div>
            )}
            
            {walletConnected ? (
              <button
                onClick={handleDisconnect}
                className="bg-neo-pink text-neo-black px-3 py-2 border-3 border-neo-black shadow-neo-sm cursor-pointer hover:bg-white transition-colors flex items-center gap-2"
                title="Click to disconnect"
              >
                <Wallet size={14} />
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowWalletPicker(!showWalletPicker)}
                  disabled={isConnecting}
                  className="bg-neo-yellow text-neo-black px-3 py-2 border-3 border-neo-black shadow-neo-sm cursor-pointer hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-2"
                >
                  <Wallet size={14} />
                  {isConnecting ? "CONNECTING..." : "CONNECT WALLET"}
                  <ChevronDown size={12} />
                </button>

                {/* Wallet Picker Dropdown */}
                {showWalletPicker && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-white border-4 border-neo-black shadow-neo-lg z-50">
                    <div className="flex items-center justify-between p-3 border-b-3 border-neo-black bg-neo-yellow">
                      <span className="font-black text-xs uppercase tracking-wider">SELECT WALLET</span>
                      <button onClick={() => setShowWalletPicker(false)} className="cursor-pointer hover:opacity-70">
                        <X size={16} />
                      </button>
                    </div>
                    
                    {wallets.length === 0 ? (
                      <div className="p-4 space-y-3">
                        <p className="text-xs font-bold text-gray-600">
                          No Sui wallets detected. Install one of these extensions:
                        </p>
                        <a
                          href="https://chromewebstore.google.com/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full text-center bg-neo-blue text-white font-black text-xs uppercase py-2.5 px-3 border-3 border-neo-black shadow-neo-sm hover:shadow-neo-md hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer"
                        >
                          INSTALL SUI WALLET →
                        </a>
                        <a
                          href="https://chromewebstore.google.com/detail/suiet-sui-wallet/khpkpbbcccdmmclmpigdgddabeilkdpd"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full text-center bg-white text-neo-black font-black text-xs uppercase py-2.5 px-3 border-3 border-neo-black shadow-neo-sm hover:shadow-neo-md hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all cursor-pointer"
                        >
                          INSTALL SUIET →
                        </a>
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {wallets.map((wallet) => (
                          <button
                            key={wallet.name}
                            onClick={() => handleConnectWallet(wallet)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-neo-bg border-2 border-transparent hover:border-neo-black transition-all cursor-pointer text-left"
                          >
                            {wallet.icon && (
                              <img 
                                src={wallet.icon} 
                                alt={wallet.name} 
                                className="w-8 h-8 border-2 border-neo-black"
                              />
                            )}
                            <div>
                              <div className="font-black text-sm uppercase">{wallet.name}</div>
                              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                CLICK TO CONNECT
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-8 space-y-8">
        
        {!inApp ? (
          <LandingPage
            walletConnected={walletConnected}
            walletAddress={walletAddress}
            wallets={wallets}
            isConnecting={isConnecting}
            showWalletPicker={showWalletPicker}
            setShowWalletPicker={setShowWalletPicker}
            handleConnectWallet={handleConnectWallet}
            handleDisconnect={handleDisconnect}
            onEnterApp={() => setInApp(true)}
          />
        ) : (
          <>
            {/* Top Navigation Panel with a Back to Home button */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <button
                onClick={() => setInApp(false)}
                className="bg-white hover:bg-neo-bg text-neo-black py-2.5 px-4 border-3 border-neo-black font-black uppercase text-xs shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-neo-md active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft size={14} className="stroke-[3]" /> Back to Homepage
              </button>

              <div className="text-xs font-mono font-bold bg-neo-yellow/20 px-3 py-2 border-2 border-neo-black">
                CONSOLE SECURITY CONTEXT: ACTIVE
              </div>
            </div>

            {/* Navigation Selector Tabs */}
            <nav className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
              
              {/* Tab 1: Dashboard */}
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-4 px-6 font-black uppercase tracking-wider text-sm flex items-center justify-center gap-3 border-3 border-neo-black transition-all cursor-pointer rounded-none focus:outline-none ${
                  activeTab === 'dashboard'
                    ? 'bg-neo-pink text-neo-black shadow-none translate-x-[3px] translate-y-[3px]'
                    : 'bg-white text-neo-black shadow-neo-sm hover:shadow-neo-md hover:-translate-x-0.5 hover:-translate-y-0.5 hover:rotate-1'
                }`}
              >
                <Settings size={20} className="stroke-[3]" />
                B2B Admin Dashboard
              </button>

              {/* Tab 2: Chat Widget */}
              <button
                onClick={() => setActiveTab('chat')}
                className={`py-4 px-6 font-black uppercase tracking-wider text-sm flex items-center justify-center gap-3 border-3 border-neo-black transition-all cursor-pointer rounded-none focus:outline-none ${
                  activeTab === 'chat'
                    ? 'bg-neo-blue text-white shadow-none translate-x-[3px] translate-y-[3px]'
                    : 'bg-white text-neo-black shadow-neo-sm hover:shadow-neo-md hover:-translate-x-0.5 hover:-translate-y-0.5 hover:-rotate-1'
                }`}
              >
                <Cpu size={20} className="stroke-[3]" />
                Customer Chat Widget
              </button>

              {/* Tab 3: Verification Explorer */}
              <button
                onClick={() => setActiveTab('explorer')}
                className={`py-4 px-6 font-black uppercase tracking-wider text-sm flex items-center justify-center gap-3 border-3 border-neo-black transition-all cursor-pointer rounded-none focus:outline-none ${
                  activeTab === 'explorer'
                    ? 'bg-neo-yellow text-neo-black shadow-none translate-x-[3px] translate-y-[3px]'
                    : 'bg-white text-neo-black shadow-neo-sm hover:shadow-neo-md hover:-translate-x-0.5 hover:-translate-y-0.5 hover:rotate-1'
                }`}
              >
                <Eye size={20} className="stroke-[3]" />
                Verification Explorer
              </button>

            </nav>

            {/* Tab Panel Views */}
            <div className="relative min-h-[500px]">
              <AnimatePresence mode="wait">
                {activeTab === 'dashboard' && (
                  <motion.div
                    key="dashboard"
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <Dashboard onSettingsChange={handleSettingsChange} />
                  </motion.div>
                )}

                {activeTab === 'chat' && (
                  <motion.div
                    key={`chat-${reloadKey}`}
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <ChatWidget 
                      onTicketLogged={handleSettingsChange} 
                      walletConnected={walletConnected}
                      walletAddress={walletAddress}
                      signAndExecuteTransaction={signAndExecuteTransaction}
                    />
                  </motion.div>
                )}

                {activeTab === 'explorer' && (
                  <motion.div
                    key={`explorer-${reloadKey}`}
                    variants={pageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    <VerificationExplorer />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}

      </main>

      {/* Footer Block */}
      <footer className="border-t-4 border-neo-black bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-xs font-mono">
          <div className="space-y-3">
            <div className="font-black text-sm uppercase text-neo-black bg-neo-pink inline-block px-2 py-0.5 border-2 border-neo-black shadow-neo-sm">
              TraceAI Decider Node
            </div>
            <p className="text-gray-700 font-bold leading-relaxed">
              Verifiable B2B customer support agent interactions. Automatically logs compliance parameters to the sharded Walrus storage network.
            </p>
          </div>

          <div className="space-y-3">
            <div className="font-black text-sm uppercase text-neo-black bg-neo-blue text-white inline-block px-2 py-0.5 border-2 border-neo-black shadow-neo-sm">
              Integrated Protocols
            </div>
            <ul className="text-gray-700 font-bold space-y-1.5">
              <li className="flex items-center gap-1.5">✦ Walrus Protocol Storage Sharding</li>
              <li className="flex items-center gap-1.5">✦ Sui Blockchain Verification Ledger</li>
              <li className="flex items-center gap-1.5">✦ SHA-256 Authenticity Signature Chains</li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="font-black text-sm uppercase text-neo-black bg-neo-yellow inline-block px-2 py-0.5 border-2 border-neo-black shadow-neo-sm">
              Node Parameters
            </div>
            <p className="text-gray-700 font-bold leading-relaxed">
              Aggregator: Aggregator Testnet Node<br />
              Publisher: Publisher Testnet Node<br />
              Environment: Sui Testnet Network
            </p>
          </div>
        </div>
        
        {/* Footer legal ticker */}
        <div className="bg-neo-black text-white py-3.5 text-center text-[10px] font-mono tracking-widest uppercase border-t-2 border-neo-black flex items-center justify-center gap-2">
          <ShieldAlert size={14} className="text-neo-yellow" />
          © {new Date().getFullYear()} TraceAI // Premium Cryptographic Auditing Ledger System
        </div>
      </footer>
    </div>
  );
}

export default App;
