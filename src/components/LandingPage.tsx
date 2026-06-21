import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cpu, 
  Wallet, 
  Terminal, 
  ArrowRight, 
  Database, 
  Lock, 
  ShieldCheck, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  RefreshCw, 
  HelpCircle,
  ChevronDown
} from 'lucide-react';

// Type definitions for the wallet picker & connector
interface LandingPageProps {
  walletConnected: boolean;
  walletAddress: string;
  wallets: any[];
  isConnecting: boolean;
  showWalletPicker: boolean;
  setShowWalletPicker: (show: boolean) => void;
  handleConnectWallet: (wallet: any) => void;
  handleDisconnect: () => void;
  onEnterApp: () => void;
}

// "How it works" data structure
interface ProcessStep {
  step: number;
  title: string;
  shortDesc: string;
  fullDesc: string;
  badge: string;
  badgeColor: string;
  dataTitle: string;
  payload: any;
}

const PROCESS_STEPS: ProcessStep[] = [
  {
    step: 1,
    title: "Configure B2B Policies",
    shortDesc: "Admin sets guidelines & refund caps in the control node.",
    fullDesc: "B2B compliance starts by defining rules on the ledger dashboard. These instructions constrain the AI agent's actions, such as imposing a hard $50 maximum refund limit.",
    badge: "Policy Setup",
    badgeColor: "bg-neo-pink",
    dataTitle: "active_policy.json",
    payload: {
      nodeId: "traceai-node-main-01",
      agentName: "KIRO",
      constraints: {
        enforceRefundLimit: true,
        maxRefundAmountUsd: 50,
        doubleConfirmationRequired: ["account_deletion", "data_purge"],
        enforceWalrusAuditLog: true
      },
      systemInstructions: "Personality: Supportive and concise. Constraints: Maximum refund allowed is $50. Never approve exceptions..."
    }
  },
  {
    step: 2,
    title: "AI Response Verification",
    shortDesc: "Customer support chats are run through the policy guardrail engine.",
    fullDesc: "When a customer submits a request, the LLM support model evaluates the input and checks it against active policy rules. A step-by-step reasoning trace is generated.",
    badge: "Guardrail Check",
    badgeColor: "bg-neo-blue text-white",
    dataTitle: "ai_inference_log.json",
    payload: {
      timestamp: 1782103522000,
      userQuery: "I want a $500 refund for my subscription.",
      policyCheck: {
        intentDetected: "refund_request",
        requestedAmountUsd: 500,
        activeLimitUsd: 50,
        complianceCleared: false,
        resolution: "REFUND_CAP_APPLIED"
      },
      reasoningTrace: [
        "1. Extract refund amount: $500.",
        "2. Query active threshold: $50 limit.",
        "3. Limit exceeded. Cap applied.",
        "4. Enforce B2B refund policy explanation."
      ]
    }
  },
  {
    step: 3,
    title: "Walrus Storage Upload",
    shortDesc: "Complete conversation transcripts are sharded and archived.",
    fullDesc: "Once the transaction details are compiled, the full transcript and compliance reasoning are uploaded to the Walrus decentralized network. This outputs a global cryptographic blob ID.",
    badge: "Walrus Storage",
    badgeColor: "bg-neo-green",
    dataTitle: "walrus_blob_payload.json",
    payload: {
      version: "walrus-v1",
      blobId: "blob_sim_8z3K9921bXccE872a31B903E",
      contentSize: 1048,
      epochsCertified: 1,
      encrypted: false,
      integrityDigest: "0x8fa928172cda8801dff72836261ac2e6988887c1236fb62ba1e9882a17cb09b"
    }
  },
  {
    step: 4,
    title: "On-Chain SUI Commitment",
    shortDesc: "Anchoring Walrus Blob ID & SHA-256 hash to SUI testnet.",
    fullDesc: "The client signs a transaction that calls the SUI Move contract. The contract mints a permanent AuditRecord object on-chain containing the transcript hash, proving it existed in this exact form.",
    badge: "Sui Ledger",
    badgeColor: "bg-neo-yellow",
    dataTitle: "sui_move_transaction.json",
    payload: {
      suiPackage: "0xe83ee2ad95984f94e2f062fc...",
      module: "audit_ledger",
      function: "log_audit",
      txArguments: {
        ticketId: "TKT-8902",
        customerName: "Alex Mercer",
        walrusBlobId: "blob_sim_8z3K9921bXccE872a31B903E",
        sha256Hash: "0x8fa928172cda8801dff72836261ac2e6988887c1236fb62ba1e9882a17cb09b",
        timestamp: 1782103525000
      }
    }
  },
  {
    step: 5,
    title: "Tamper-Proof Verification",
    shortDesc: "Auditors verify audit trails using the Verification Explorer.",
    fullDesc: "Auditors verify any interaction in seconds. The explorer pulls the on-chain Sui record, fetches the transcript from Walrus, hashes it, and verifies it matches the Sui anchor.",
    badge: "Auditor Console",
    badgeColor: "bg-neo-orange text-white",
    dataTitle: "audit_verification_receipt.json",
    payload: {
      verificationStatus: "SUCCESS",
      onChainHash: "0x8fa928172cda8801dff72836261ac2e6988887c1236fb62ba1e9882a17cb09b",
      recalculatedHash: "0x8fa928172cda8801dff72836261ac2e6988887c1236fb62ba1e9882a17cb09b",
      tamperDetected: false,
      suiTxConfirmed: true,
      blockIndex: 489023
    }
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({
  walletConnected,
  walletAddress,
  wallets,
  isConnecting,
  showWalletPicker,
  setShowWalletPicker,
  handleConnectWallet,
  handleDisconnect,
  onEnterApp
}) => {
  // Landing Page Interactive States
  const [activeStep, setActiveStep] = useState<number>(1);
  const [sandboxAmount, setSandboxAmount] = useState<string>("500");
  const [sandboxPreset, setSandboxPreset] = useState<string>("refund");
  const [sandboxLog, setSandboxLog] = useState<string[]>([]);
  const [sandboxState, setSandboxState] = useState<'idle' | 'running' | 'done'>('idle');
  const [sandboxOutput, setSandboxOutput] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Accordion list open states
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({
    0: true,
    1: false,
    2: false
  });

  const toggleFaq = (index: number) => {
    setFaqOpen(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Run the sandbox simulation
  const runSandbox = () => {
    setSandboxState('running');
    setSandboxLog([]);
    setSandboxOutput(null);

    const amountNum = parseInt(sandboxAmount) || 0;
    const policyLimit = 50;

    const logMessages = [
      `[1/5] 🔍 Parsing user sandbox query...`,
      `[2/5] 🤖 AI Model loaded active policy: "Max refund cap of $${policyLimit}."`,
      `[3/5] ⚙️ Running compliance check...`,
    ];

    let delay = 0;
    logMessages.forEach((msg, i) => {
      setTimeout(() => {
        setSandboxLog(prev => [...prev, msg]);
      }, delay);
      delay += 500;
    });

    setTimeout(() => {
      const isCompliant = amountNum <= policyLimit;
      const finalMsg = isCompliant
        ? `[4/5] ✅ Request approved. Refund of $${amountNum} complies with limits.`
        : `[4/5] ❌ Guardrails triggered! Request of $${amountNum} exceeds cap of $${policyLimit}. Cap limit ($${policyLimit}) enforced.`;
      
      setSandboxLog(prev => [...prev, finalMsg]);
    }, delay);
    delay += 600;

    setTimeout(() => {
      setSandboxLog(prev => [...prev, `[5/5] 💾 Simulating cryptographic audit record creation...`]);
    }, delay);
    delay += 500;

    setTimeout(() => {
      // Mock generated Walrus + SUI structure
      const resolvedStatus = amountNum > policyLimit ? "denied" : "resolved";
      const userHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
      const fakeBlobId = "blob_sim_" + Array.from({length: 24}, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random()*62)]).join('');
      
      const payload = {
        auditLog: {
          ticketId: `TKT-${Math.floor(1000 + Math.random()*9000)}`,
          customer: "Sandbox Auditor",
          issue: "Subscription Refund Demo",
          amount: amountNum,
          policyLimit: policyLimit,
          enforcedStatus: resolvedStatus,
          sha256Digest: userHash,
          walrusProof: {
            blobId: fakeBlobId,
            timestamp: Date.now(),
            integrityVerified: true
          }
        }
      };

      setSandboxOutput(payload);
      setSandboxState('done');
    }, delay);
  };

  const setPreset = (preset: string) => {
    setSandboxPreset(preset);
    if (preset === 'refund') {
      setSandboxAmount("500");
    } else if (preset === 'cancel') {
      setSandboxAmount("0");
    }
  };

  return (
    <div className="space-y-16 py-4">
      
      {/* 1. HERO SECTION */}
      <section className="relative text-neo-black grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white border-4 border-neo-black p-8 md:p-12 shadow-neo-lg overflow-hidden">
        {/* Massive Watermark */}
        <div className="absolute right-0 top-0 text-neo-black opacity-[0.03] font-black select-none pointer-events-none text-[12rem] leading-none font-mono">
          LEDGER
        </div>

        <div className="lg:col-span-7 space-y-6 z-10 text-left">
          <span className="bg-neo-pink text-neo-black text-xs font-black px-3.5 py-2 uppercase border-2 border-neo-black tracking-widest inline-block shadow-neo-sm">
            ✦ Decentralised Cryptographic Audits ✦
          </span>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none font-mono">
            TRACE<span className="text-neo-pink">//</span>AI SECURE AUDITING
          </h1>
          <p className="text-base md:text-lg font-bold leading-relaxed max-w-xl text-gray-700">
            Secure client communications with cryptographic certainty. Enforce real-time AI compliance constraints, shard transcript data onto the <strong>Walrus Protocol</strong>, and anchor hashes to the <strong>Sui Blockchain</strong>.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            {walletConnected ? (
              <>
                <button
                  onClick={onEnterApp}
                  className="neo-btn neo-btn-pink text-sm py-4 px-8 shadow-neo-sm font-black tracking-wider micro-shake"
                >
                  <Play size={16} className="stroke-[3]" />
                  LAUNCH CONSOLE
                </button>
                <button
                  onClick={handleDisconnect}
                  className="neo-btn text-sm py-4 px-6 shadow-neo-sm font-black tracking-wider"
                >
                  DISCONNECT WALLET
                </button>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowWalletPicker(!showWalletPicker)}
                  disabled={isConnecting}
                  className="neo-btn neo-btn-yellow text-sm py-4 px-8 shadow-neo-sm font-black tracking-wider flex items-center gap-2 micro-shake"
                >
                  <Wallet size={16} />
                  {isConnecting ? "CONNECTING..." : "CONNECT WALLET TO ENTER"}
                  <ChevronDown size={14} />
                </button>

                {showWalletPicker && (
                  <div className="absolute top-full left-0 mt-3 w-72 bg-white border-4 border-neo-black shadow-neo-lg z-50 text-left">
                    <div className="p-3 bg-neo-yellow border-b-3 border-neo-black flex justify-between items-center font-mono">
                      <span className="font-black text-xs uppercase">SELECT SUI WALLET</span>
                      <button onClick={() => setShowWalletPicker(false)} className="font-black hover:opacity-75">✕</button>
                    </div>

                    {wallets.length === 0 ? (
                      <div className="p-4 space-y-3 font-mono text-xs font-bold">
                        <p className="text-gray-600">No Sui Wallet extension found. Install one below:</p>
                        <a
                          href="https://chromewebstore.google.com/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-center bg-neo-blue text-white uppercase py-2 border-2 border-neo-black shadow-neo-sm"
                        >
                          SUI WALLET →
                        </a>
                      </div>
                    ) : (
                      <div className="p-2 space-y-1">
                        {wallets.map((wallet) => (
                          <button
                            key={wallet.name}
                            onClick={() => handleConnectWallet(wallet)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-neo-bg border-2 border-transparent hover:border-neo-black transition-all text-left cursor-pointer"
                          >
                            {wallet.icon && (
                              <img src={wallet.icon} alt={wallet.name} className="w-6 h-6 border-2 border-neo-black" />
                            )}
                            <div>
                              <div className="font-black text-xs uppercase">{wallet.name}</div>
                              <div className="text-[9px] font-black text-gray-500 uppercase">CLICK TO LOG IN</div>
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

        {/* Hero Interactive Statistics Widget */}
        <div className="lg:col-span-5 bg-neo-bg border-4 border-neo-black shadow-neo-lg p-6 space-y-4 font-mono text-xs font-bold text-left relative">
          <div className="flex items-center justify-between border-b-2 border-neo-black pb-2 select-none">
            <span className="text-neo-pink font-black">✦ DEPLOYMENT MATRIX</span>
            <span className="bg-neo-black text-white px-2 py-0.5 text-[10px]">MAINNET-READY</span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center bg-white p-2 border-2 border-neo-black">
              <span>SUI WALLET:</span>
              <span className={`px-2 py-0.5 border text-[10px] ${walletConnected ? 'bg-neo-green text-neo-black' : 'bg-neo-orange text-white'}`}>
                {walletConnected ? `${walletAddress.slice(0, 6)}...` : 'DISCONNECTED'}
              </span>
            </div>
            <div className="flex justify-between items-center bg-white p-2 border-2 border-neo-black">
              <span>WALRUS PROTOCOL STATE:</span>
              <span className="text-neo-green bg-neo-black px-2 py-0.5 text-[10px]">ACTIVE SHARDS</span>
            </div>
            <div className="flex justify-between items-center bg-white p-2 border-2 border-neo-black">
              <span>MUTABILITY COEFFICIENT:</span>
              <span className="text-neo-blue bg-white border border-neo-black px-2 py-0.5 text-[10px]">0.00% (IMMUTABLE)</span>
            </div>
          </div>

          <div className="bg-white p-3 border-2 border-neo-black text-[10px] text-gray-600 leading-normal">
            &gt; traceai-node-3094 init success.<br />
            &gt; connecting testnet aggregator shards... done.<br />
            &gt; blockchain verification layer: status OK.
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS INTERACTIVE SLIDER */}
      <section className="space-y-6 text-left">
        <div className="border-b-4 border-neo-black pb-2">
          <h2 className="text-2xl md:text-3xl font-black uppercase font-mono tracking-tight flex items-center gap-3">
            <Layers className="stroke-[3] text-neo-blue" />
            HOW TRACEAI CRYPTOGRAPHIC AUDITING WORKS
          </h2>
          <p className="text-xs uppercase font-mono font-bold text-gray-500 mt-1">
            Five interactive cryptographic layers ensuring zero support log manipulation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Step Selectors (Left 5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {PROCESS_STEPS.map((step) => {
              const isActive = activeStep === step.step;
              return (
                <button
                  key={step.step}
                  onClick={() => setActiveStep(step.step)}
                  className={`w-full text-left p-4 border-3 border-neo-black rounded-none flex items-center justify-between transition-all duration-100 ${
                    isActive 
                      ? 'bg-neo-black text-white shadow-none translate-x-[2px] translate-y-[2px]' 
                      : 'bg-white text-neo-black shadow-neo-sm hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-neo-md'
                  }`}
                >
                  <div className="space-y-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-black text-xs px-2 py-0.5 border ${isActive ? 'bg-white text-neo-black border-white' : 'bg-neo-black text-white border-neo-black'}`}>
                        0{step.step}
                      </span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 ${isActive ? 'bg-neo-pink text-neo-black' : step.badgeColor}`}>
                        {step.badge}
                      </span>
                    </div>
                    <div className="font-mono text-sm font-black uppercase tracking-tight">
                      {step.title}
                    </div>
                  </div>
                  <ArrowRight size={18} className={`stroke-[3] ${isActive ? 'text-neo-pink rotate-0' : 'text-gray-400 -rotate-45'} transition-all`} />
                </button>
              );
            })}
          </div>

          {/* Interactive display panel (Right 7 cols) */}
          <div className="lg:col-span-7 bg-white border-4 border-neo-black shadow-neo-lg flex flex-col h-[460px] overflow-hidden">
            <AnimatePresence mode="wait">
              {PROCESS_STEPS.map((step) => {
                if (step.step !== activeStep) return null;
                const formattedJSON = JSON.stringify(step.payload, null, 2);

                return (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col h-full"
                  >
                    {/* Header */}
                    <div className="bg-neo-black text-white p-4 flex justify-between items-center select-none">
                      <div className="flex items-center gap-2">
                        <span className="bg-neo-pink text-neo-black font-mono font-black text-xs px-2 py-0.5 border border-neo-black">
                          LAYER 0{step.step}
                        </span>
                        <span className="font-mono font-black text-sm uppercase text-neo-yellow">
                          {step.badge} Payload
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-mono font-bold text-gray-400">
                        {step.dataTitle}
                      </span>
                    </div>

                    {/* Content split in 2 vertical halves or stack */}
                    <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 divide-y-4 md:divide-y-0 md:divide-x-4 divide-neo-black bg-white no-scrollbar">
                      
                      {/* Left: Explanation */}
                      <div className="p-6 space-y-4 text-left">
                        <h3 className="font-mono text-lg font-black uppercase text-neo-black border-b-2 border-neo-black pb-2">
                          {step.title}
                        </h3>
                        <p className="font-bold text-xs text-gray-700 leading-relaxed">
                          {step.fullDesc}
                        </p>
                        <div className="bg-neo-bg p-3 border-2 border-neo-black font-mono text-[10px] text-neo-black font-bold">
                          ✦ Integration Method: RPC Query Verification.
                        </div>
                      </div>

                      {/* Right: Code Block payload */}
                      <div className="p-6 bg-neo-bg flex flex-col justify-between h-full font-mono text-[11px] leading-relaxed relative">
                        <div className="flex justify-between items-center mb-2 pb-1 border-b border-gray-300">
                          <span className="text-[9px] font-black text-gray-500 uppercase flex items-center gap-1">
                            <Terminal size={10} /> JSON Schema
                          </span>
                          <button
                            onClick={() => handleCopyCode(formattedJSON)}
                            className="bg-white border border-neo-black px-2 py-0.5 font-bold uppercase text-[9px] hover:bg-neo-yellow active:translate-y-0.5 transition-all"
                          >
                            {copied ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        
                        <pre className="flex-1 overflow-auto text-left font-semibold text-gray-800 p-2.5 bg-white border border-gray-300 max-h-64 no-scrollbar">
                          {formattedJSON}
                        </pre>
                      </div>

                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* 3. LIVE SANDBOX SIMULATOR */}
      <section className="bg-white border-4 border-neo-black p-8 shadow-neo-lg text-left relative overflow-hidden">
        {/* Neon light border or glow */}
        <div className="absolute right-0 bottom-[-30px] text-neo-black opacity-[0.03] font-black select-none pointer-events-none text-9xl leading-none font-mono">
          TEST
        </div>

        <div className="border-b-4 border-neo-black pb-3 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-black uppercase font-mono tracking-tight flex items-center gap-3">
              <Cpu className="stroke-[3] text-neo-pink animate-pulse" />
              INTELLIGENT COMPLIANCE SANDBOX
            </h2>
            <p className="text-xs uppercase font-mono font-bold text-gray-500 mt-1">
              Verify compliance ledger logic inside a local testing harness without connecting your wallet.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setPreset('refund')}
              className={`px-3 py-1.5 border-2 border-neo-black text-xs font-black uppercase transition-all ${
                sandboxPreset === 'refund' ? 'bg-neo-pink text-neo-black shadow-none' : 'bg-white hover:bg-neo-bg shadow-neo-sm'
              }`}
            >
              Refund Limits
            </button>
            <button
              onClick={() => setPreset('cancel')}
              className={`px-3 py-1.5 border-2 border-neo-black text-xs font-black uppercase transition-all ${
                sandboxPreset === 'cancel' ? 'bg-neo-pink text-neo-black shadow-none' : 'bg-white hover:bg-neo-bg shadow-neo-sm'
              }`}
            >
              Account Deactivation
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Simulator Inputs (Left 5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {sandboxPreset === 'refund' ? (
              <div className="space-y-3 text-left">
                <label className="block text-sm font-black uppercase tracking-wide">
                  Simulate Refund Request ($USD)
                </label>
                <div className="text-xs font-mono font-bold bg-neo-yellow/30 p-3 border-2 border-neo-black text-neo-black mb-3">
                  System Guardrail Constraint: Refunds Cap = **$50**.
                </div>
                <div className="flex gap-3">
                  <input
                    type="number"
                    value={sandboxAmount}
                    onChange={(e) => setSandboxAmount(e.target.value)}
                    className="flex-1 p-3.5 border-3 border-neo-black font-black text-lg focus:outline-none focus:border-neo-blue bg-neo-bg text-neo-black rounded-none"
                    placeholder="Enter amount..."
                  />
                  <button
                    onClick={runSandbox}
                    disabled={sandboxState === 'running'}
                    className="neo-btn neo-btn-pink shadow-neo-sm text-sm px-6 font-black uppercase cursor-pointer"
                  >
                    Run Test
                  </button>
                </div>
                <div className="flex gap-2 pt-1 font-mono text-[10px] text-gray-500 font-bold">
                  <span>Presets:</span>
                  <button onClick={() => setSandboxAmount("500")} className="underline hover:text-neo-pink">$500 (Fail)</button>
                  <span>|</span>
                  <button onClick={() => setSandboxAmount("30")} className="underline hover:text-neo-pink">$30 (Pass)</button>
                  <span>|</span>
                  <button onClick={() => setSandboxAmount("50")} className="underline hover:text-neo-pink">$50 (Limit)</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-left">
                <label className="block text-sm font-black uppercase tracking-wide">
                  Simulate Account Cancellation
                </label>
                <div className="text-xs font-mono font-bold bg-neo-yellow/30 p-3 border-2 border-neo-black text-neo-black">
                  Constraint: Account deletions require double confirmation warning.
                </div>
                <button
                  onClick={runSandbox}
                  disabled={sandboxState === 'running'}
                  className="w-full neo-btn neo-btn-pink shadow-neo-sm text-sm py-4 font-black uppercase cursor-pointer"
                >
                  Test Cancellation Warning Check
                </button>
              </div>
            )}

            {/* Simulation terminal logs */}
            <div className="bg-[#0b0b0b] border-3 border-neo-black text-neo-green font-mono text-xs p-4 min-h-[160px] space-y-2 text-left shadow-inner">
              <div className="text-[10px] border-b border-neo-green/20 pb-1 uppercase tracking-wider text-neo-green/50">
                Guardrail Console Logs
              </div>
              {sandboxLog.length === 0 && (
                <div className="text-neo-green/40 italic mt-4">
                  Select parameters and click "Run Test" to populate simulation traces.
                </div>
              )}
              {sandboxLog.map((log, index) => (
                <div key={index} className="leading-relaxed">
                  &gt; {log}
                </div>
              ))}
              {sandboxState === 'running' && (
                <div className="text-neo-green animate-pulse">
                  &gt; compiling cryptographics proofs... [LOADING]
                </div>
              )}
            </div>
          </div>

          {/* Simulator Outputs (Right 7 cols) */}
          <div className="lg:col-span-7 bg-neo-bg border-4 border-neo-black p-6 flex flex-col justify-between h-[390px] overflow-hidden relative shadow-inner">
            <div className="flex justify-between items-center border-b border-gray-300 pb-2 mb-3">
              <span className="font-mono text-xs font-black text-neo-black flex items-center gap-1">
                <Database size={14} /> Audit Trail Certificate Output
              </span>
              {sandboxOutput && (
                <span className="font-mono text-[9px] font-black bg-neo-green text-neo-black px-2 py-0.5 border border-neo-black">
                  SUCCESSFULLY COMPILED
                </span>
              )}
            </div>

            <div className="flex-1 overflow-auto text-left font-mono text-[11px] bg-white border border-gray-300 p-4 max-h-[300px] leading-relaxed no-scrollbar select-text">
              {sandboxOutput ? (
                <pre className="font-semibold text-gray-800">
                  {JSON.stringify(sandboxOutput, null, 2)}
                </pre>
              ) : (
                <div className="h-full flex flex-col justify-center items-center text-center text-gray-500 font-bold uppercase py-12">
                  <Terminal size={32} className="text-neo-black mb-3 stroke-[2]" />
                  Awaiting compliance run completion.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4. PROTOCOL INTEGRATION HIGHLIGHTS (Asymmetric Grid) */}
      <section className="space-y-6 text-left">
        <div className="border-b-4 border-neo-black pb-2">
          <h2 className="text-2xl md:text-3xl font-black uppercase font-mono tracking-tight">
            INTEGRATED CORE PROTOCOLS
          </h2>
          <p className="text-xs uppercase font-mono font-bold text-gray-500 mt-1">
            TraceAI utilizes production-ready decentralized protocols to anchor security.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Walrus */}
          <div className="bg-neo-pink text-neo-black border-4 border-neo-black shadow-neo-md p-6 relative overflow-hidden group hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-lg transition-all">
            <div className="absolute right-2 top-[-10px] text-neo-black opacity-10 font-black text-7xl select-none pointer-events-none leading-none font-mono">
              01
            </div>
            <div className="relative z-10 space-y-4 flex flex-col justify-between h-full">
              <div className="bg-white border-2 border-neo-black px-2 py-0.5 self-start shadow-neo-sm">
                <Database size={16} className="stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase font-mono tracking-tight mb-2">Walrus Storage</h3>
                <p className="text-xs font-bold leading-relaxed text-neo-black/85">
                  Erasure codes and shards heavy support conversation payloads across decentralized nodes, providing highly affordable, permanent content archiving.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: SUI Blockchain */}
          <div className="bg-neo-blue text-white border-4 border-neo-black shadow-neo-md p-6 relative overflow-hidden group hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-lg transition-all">
            <div className="absolute right-2 top-[-10px] text-white opacity-15 font-black text-7xl select-none pointer-events-none leading-none font-mono">
              02
            </div>
            <div className="relative z-10 space-y-4 flex flex-col justify-between h-full">
              <div className="bg-white text-neo-black border-2 border-neo-black px-2 py-0.5 self-start shadow-neo-sm">
                <Layers size={16} className="stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase font-mono tracking-tight mb-2 text-white drop-shadow-[1.5px_1.5px_0px_#000000]">Sui Blockchain</h3>
                <p className="text-xs font-bold leading-relaxed text-blue-100/90">
                  Mints immutable auditing objects (`AuditRecord`) on-chain. Provides secure timestamps, cryptographic sign-offs, and explorer verification.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Guardrail Engine */}
          <div className="bg-neo-yellow text-neo-black border-4 border-neo-black shadow-neo-md p-6 relative overflow-hidden group hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-lg transition-all">
            <div className="absolute right-2 top-[-10px] text-neo-black opacity-10 font-black text-7xl select-none pointer-events-none leading-none font-mono">
              03
            </div>
            <div className="relative z-10 space-y-4 flex flex-col justify-between h-full">
              <div className="bg-white border-2 border-neo-black px-2 py-0.5 self-start shadow-neo-sm">
                <Cpu size={16} className="stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase font-mono tracking-tight mb-2">Policy Guardrails</h3>
                <p className="text-xs font-bold leading-relaxed text-neo-black/85">
                  Restricts LLM inferences in real-time. System parameters enforce caps, warning notifications, and route escalations autonomously based on audited code limits.
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: SHA-256 Chains */}
          <div className="bg-neo-green text-neo-black border-4 border-neo-black shadow-neo-md p-6 relative overflow-hidden group hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-lg transition-all">
            <div className="absolute right-2 top-[-10px] text-neo-black opacity-10 font-black text-7xl select-none pointer-events-none leading-none font-mono">
              04
            </div>
            <div className="relative z-10 space-y-4 flex flex-col justify-between h-full">
              <div className="bg-white border-2 border-neo-black px-2 py-0.5 self-start shadow-neo-sm">
                <Lock size={16} className="stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase font-mono tracking-tight mb-2">SHA-256 Security</h3>
                <p className="text-xs font-bold leading-relaxed text-neo-black/85">
                  Protects audits against post-closure modification. Comparing the recalculated digest to the on-chain Sui registration immediately reveals any tampering.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE FAQ / ACCORDION SECTION */}
      <section className="bg-white border-4 border-neo-black p-8 shadow-neo-lg text-left">
        <div className="border-b-4 border-neo-black pb-2 mb-6">
          <h2 className="text-2xl md:text-3xl font-black uppercase font-mono tracking-tight flex items-center gap-3">
            <HelpCircle className="stroke-[3] text-neo-pink" />
            PROTOCOL FREQUENTLY ASKED QUESTIONS
          </h2>
        </div>

        <div className="space-y-4">
          {/* FAQ 1 */}
          <div className="border-3 border-neo-black bg-neo-bg">
            <button
              onClick={() => toggleFaq(0)}
              className="w-full flex justify-between items-center p-4 font-mono font-black text-sm uppercase tracking-tight text-neo-black text-left cursor-pointer"
            >
              <span>How does TraceAI prevent customer support API key theft?</span>
              <ChevronDown size={18} className={`stroke-[3] transition-transform ${faqOpen[0] ? 'rotate-180' : 'rotate-0'}`} />
            </button>
            <AnimatePresence initial={false}>
              {faqOpen[0] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 border-t-2 border-neo-black bg-white font-semibold text-xs leading-relaxed text-gray-700">
                    TraceAI uses a secure server-side development/production proxy. Customer queries are relayed from the client browser to the node server (Vite middleware), which injects the OpenRouter credentials and communicates with the LLM API. The private API keys never leave the server-side environment, preventing client-side scraping.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* FAQ 2 */}
          <div className="border-3 border-neo-black bg-neo-bg">
            <button
              onClick={() => toggleFaq(1)}
              className="w-full flex justify-between items-center p-4 font-mono font-black text-sm uppercase tracking-tight text-neo-black text-left cursor-pointer"
            >
              <span>What happens if the Walrus testnet aggregator is temporarily unreachable?</span>
              <ChevronDown size={18} className={`stroke-[3] transition-transform ${faqOpen[1] ? 'rotate-180' : 'rotate-0'}`} />
            </button>
            <AnimatePresence initial={false}>
              {faqOpen[1] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 border-t-2 border-neo-black bg-white font-semibold text-xs leading-relaxed text-gray-700">
                    If the Walrus publisher nodes fail to respond, the TraceAI SDK triggers a simulated fallback mechanism, saving the cryptographic logs inside secure local storage namespaces. Auditors can still verify the locally saved audits against the on-chain SHA-256 transaction registry.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* FAQ 3 */}
          <div className="border-3 border-neo-black bg-neo-bg">
            <button
              onClick={() => toggleFaq(2)}
              className="w-full flex justify-between items-center p-4 font-mono font-black text-sm uppercase tracking-tight text-neo-black text-left cursor-pointer"
            >
              <span>Can B2B companies edit logs stored on the Sui blockchain?</span>
              <ChevronDown size={18} className={`stroke-[3] transition-transform ${faqOpen[2] ? 'rotate-180' : 'rotate-0'}`} />
            </button>
            <AnimatePresence initial={false}>
              {faqOpen[2] && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 border-t-2 border-neo-black bg-white font-semibold text-xs leading-relaxed text-gray-700">
                    No. The `AuditRecord` objects are stored on SUI Testnet as owned or shared smart contract structures. Once signed and submitted, the object properties cannot be modified. Any attempt to update the corresponding Walrus blob content will break the SHA-256 integrity hash verification check, alerting clients and auditors immediately.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

    </div>
  );
};
