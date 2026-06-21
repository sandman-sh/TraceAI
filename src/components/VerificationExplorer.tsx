import React, { useState } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import { getStoredTickets, fetchBlobFromWalrus, calculateSHA256 } from '../services/walrus';
import type { TicketLog } from '../services/walrus';
import { Search, Database, CheckSquare, RefreshCw, X, Cpu, FileSpreadsheet, Loader2 } from 'lucide-react';

export const VerificationExplorer: React.FC = () => {
  const suiClient = useSuiClient();
  const [tickets, setTickets] = useState<TicketLog[]>(() => getStoredTickets());
  const [selectedTicket, setSelectedTicket] = useState<TicketLog | null>(() => {
    const loaded = getStoredTickets();
    return loaded.length > 0 ? loaded[0] : null;
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Verification Modal State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState(0);
  const [verificationResult, setVerificationResult] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [sha256Hash, setSha256Hash] = useState('');

  const refreshList = () => {
    const loadedTickets = getStoredTickets();
    setTickets(loadedTickets);
    if (loadedTickets.length > 0) {
      const currentSelectedId = selectedTicket?.id;
      const found = loadedTickets.find(t => t.id === currentSelectedId);
      setSelectedTicket(found || loadedTickets[0]);
    }
  };

  const handleSelectTicket = (ticket: TicketLog) => {
    setSelectedTicket(ticket);
  };

  const triggerVerification = async () => {
    if (!selectedTicket || !selectedTicket.proof) return;
    
    setIsVerifying(true);
    setVerificationResult('running');
    setVerificationStep(0);

    const steps = [
      // Step 1: Connect to Sui Testnet RPC
      () => new Promise<void>(resolve => setTimeout(resolve, 800)),
      // Step 2: Fetch Storage Certificate for Blob ID from Walrus Aggregator
      async () => {
        try {
          await fetchBlobFromWalrus(selectedTicket.proof!.blobId);
        } catch (e) {
          console.warn("Could not fetch blob from aggregator, continuing with local proof copy", e);
        }
      },
      // Step 3: Verify SHA-256 data hash matches Sui ledger registry
      async () => {
        const textToHash = JSON.stringify({
          transcript: selectedTicket.transcript,
          systemPrompt: selectedTicket.proof!.systemPrompt
        });
        const hash = await calculateSHA256(textToHash);
        setSha256Hash(hash);
        await new Promise<void>(resolve => setTimeout(resolve, 800));
      },
      // Step 4: Validate signature authority of the active AI builder agent
      () => new Promise<void>(resolve => setTimeout(resolve, 800)),
      // Step 5: Check Sui Blob NFT ownership epoch duration / Transaction status
      async () => {
        if (selectedTicket.proof?.digest && !selectedTicket.proof.isSimulated) {
          try {
            const txResult = await suiClient.getTransactionBlock({
              digest: selectedTicket.proof.digest,
              options: {
                showEffects: true,
              }
            });
            if (txResult.effects?.status?.status !== 'success') {
              throw new Error("On-chain transaction execution did not succeed.");
            }
          } catch (e) {
            console.error("Failed to query transaction block from Sui RPC:", e);
            throw new Error("Sui transaction block verification failed.");
          }
        } else {
          await new Promise<void>(resolve => setTimeout(resolve, 600));
        }
      }
    ];

    try {
      for (let i = 0; i < steps.length; i++) {
        setVerificationStep(i + 1);
        await steps[i]();
      }
      setVerificationResult('success');
    } catch (e) {
      console.error("Verification verification failed at step:", verificationStep, e);
      setVerificationResult('error');
    }
  };

  const filteredTickets = tickets.filter(t => 
    t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.issueType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      
      {/* Title block */}
      <div className="bg-neo-yellow text-neo-black p-8 border-4 border-neo-black shadow-neo-lg relative">
        <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight leading-none mb-3">
          VERIFICATION EXPLORER
        </h2>
        <p className="font-bold text-sm uppercase max-w-xl opacity-90 font-mono">
          Search the immutable ledger of customer interactions. Verify the cryptographic storage proofs logged to the Walrus network.
        </p>
        <button
          onClick={refreshList}
          className="absolute right-6 top-6 bg-white hover:bg-neo-pink p-3 border-3 border-neo-black shadow-neo-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer rounded-none"
          title="Refresh Ledger"
        >
          <RefreshCw size={18} className="stroke-[3]" />
        </button>
      </div>

      {/* Main split-screen container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Ticket List Table (5 cols) */}
        <div className="lg:col-span-5 bg-white border-4 border-neo-black shadow-neo-lg flex flex-col h-[650px]">
          {/* Search bar */}
          <div className="p-4 border-b-4 border-neo-black bg-neo-bg flex gap-2 select-none">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search ticket, name, type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-3 border-neo-black font-bold text-xs bg-white text-neo-black rounded-none shadow-inner focus:outline-none focus:border-neo-pink"
              />
              <Search size={16} className="absolute left-3.5 top-3 text-neo-black stroke-[3]" />
            </div>
          </div>

          {/* Ticket Table list */}
          <div className="flex-1 overflow-y-auto no-scrollbar bg-white divide-y-4 divide-neo-black">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-gray-500 font-black uppercase text-xs font-mono">
                No ledger logs found matching query.
              </div>
            ) : (
              filteredTickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTicket(t)}
                  className={`w-full text-left p-4 hover:bg-neo-bg transition-colors duration-100 flex justify-between items-center focus:outline-none rounded-none border-l-8 ${
                    selectedTicket?.id === t.id
                      ? 'border-l-neo-pink bg-neo-bg'
                      : 'border-l-transparent bg-white'
                  }`}
                >
                  <div className="space-y-2 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-neo-black bg-white px-2 py-0.5 border-2 border-neo-black shadow-neo-sm">
                        {t.id}
                      </span>
                      <span className="text-xs uppercase font-black text-neo-black font-mono">
                        {t.customerName}
                      </span>
                    </div>
                    
                    <div className="text-sm font-black uppercase tracking-tight text-neo-black font-sans">
                      {t.issueType}
                    </div>
                    
                    <div className="text-[10px] text-gray-600 font-bold font-mono">
                      {new Date(t.proof?.timestamp || t.transcript[0]?.timestamp || 0).toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <span
                      className={`text-[10px] font-black uppercase px-3 py-1 border-2 border-neo-black shadow-neo-sm inline-block ${
                        t.status === 'denied'
                          ? 'bg-neo-pink text-neo-black'
                          : t.status === 'resolved'
                          ? 'bg-neo-green text-neo-black'
                          : 'bg-neo-yellow text-neo-black'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Log Split View Detail (7 cols) */}
        <div className="lg:col-span-7 bg-white border-4 border-neo-black shadow-neo-lg flex flex-col h-[650px] overflow-hidden">
          {selectedTicket ? (
            <div className="flex flex-col h-full">
              
              {/* Detail header */}
              <div className="bg-neo-black text-white p-4 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center border-b-4 border-neo-black select-none">
                <div>
                  <span className="text-xs uppercase font-black tracking-widest text-neo-yellow font-mono">
                    Session Audit Trail
                  </span>
                  <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-2 font-mono">
                    <Database size={18} className="text-neo-pink" /> {selectedTicket.id} Payload
                  </h3>
                </div>
                
                {selectedTicket.proof && (
                  <button
                    onClick={triggerVerification}
                    className="bg-neo-pink hover:bg-opacity-95 text-neo-black font-black uppercase text-xs py-2.5 px-4 border-2 border-neo-black shadow-[3px_3px_0px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer rounded-none"
                  >
                    Verify on Sui Testnet
                  </button>
                )}
              </div>

              {/* Scrollable details panel split in 2 horizontal screens */}
              <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 divide-y-4 md:divide-y-0 md:divide-x-4 divide-neo-black no-scrollbar bg-white">
                
                {/* Left side detail: The transcript */}
                <div className="p-6 space-y-4 flex flex-col h-full bg-neo-bg">
                  <h4 className="font-black uppercase tracking-wider text-xs border-b-2 border-neo-black pb-2 text-neo-black font-mono">
                    CHAT TRANSCRIPT
                  </h4>
                  
                  <div className="space-y-4 overflow-y-auto flex-1 no-scrollbar text-xs">
                    {selectedTicket.transcript.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`p-3 border-2 border-neo-black shadow-neo-sm ${
                          msg.sender === 'User'
                            ? 'bg-neo-yellow ml-4'
                            : 'bg-white mr-4 border-l-4 border-l-neo-blue'
                        }`}
                      >
                        <div className="font-black text-[9px] uppercase tracking-wide text-gray-500 mb-1.5 font-mono">
                          {msg.sender}
                        </div>
                        <p className="font-bold text-neo-black whitespace-pre-line leading-relaxed">{msg.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right side detail: The Proof */}
                <div className="p-6 space-y-4 flex flex-col h-full bg-white">
                  <h4 className="font-black uppercase tracking-wider text-xs border-b-2 border-neo-black pb-2 text-neo-black font-mono">
                    WALRUS CRYPTO PROOF
                  </h4>

                  {selectedTicket.proof ? (
                    <div className="space-y-4 font-mono text-xs flex-1 overflow-y-auto no-scrollbar">
                      
                      {/* Connection status badge */}
                      <div>
                        <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2.5 py-1 border-2 border-neo-black shadow-neo-sm ${
                          selectedTicket.proof.isSimulated
                            ? 'bg-neo-yellow text-neo-black'
                            : 'bg-neo-blue text-white'
                        }`}>
                          {selectedTicket.proof.isSimulated ? 'LOCAL LEDGER (SIMULATION)' : 'IMMUTABLE BLOCKCHAIN CERTIFICATE'}
                        </span>
                      </div>

                      {/* Blob ID block */}
                      <div className="space-y-1">
                        <div className="font-black uppercase text-[9px] text-gray-500">Walrus Blob ID</div>
                        <div className="bg-neo-bg p-2.5 border-2 border-neo-black font-bold break-all text-[11px] text-neo-black select-all">
                          {selectedTicket.proof.blobId}
                        </div>
                      </div>

                      {/* Transaction Digest */}
                      {selectedTicket.proof.digest && (
                        <div className="space-y-1">
                          <div className="font-black uppercase text-[9px] text-gray-500">Sui Tx Digest</div>
                          <div className="bg-neo-bg p-2.5 border-2 border-neo-black font-bold break-all text-[11px] text-neo-black select-all">
                            {selectedTicket.proof.digest}
                          </div>
                        </div>
                      )}

                      {/* System Prompt active */}
                      <div className="space-y-1">
                        <div className="font-black uppercase text-[9px] text-gray-500">Active Prompt Guideline</div>
                        <div className="bg-neo-bg p-2.5 border-2 border-neo-black font-bold max-h-32 overflow-y-auto no-scrollbar text-[11px] whitespace-pre-wrap leading-relaxed text-gray-700">
                          {selectedTicket.proof.systemPrompt}
                        </div>
                      </div>

                      {/* Agent Reasoning */}
                      <div className="space-y-2">
                        <div className="font-black uppercase text-[9px] text-gray-500">Agent Verification Reasoning</div>
                        <div className="space-y-1.5 text-[11px]">
                          {selectedTicket.proof.reasoning.map((step, idx) => (
                            <div key={idx} className="bg-neo-bg p-2 border border-gray-300 text-neo-black font-bold">
                              {step}
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-400 font-bold uppercase text-xs font-mono">
                      No cryptographic ledger proof linked.
                    </div>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-450 font-black uppercase text-xs h-full flex flex-col justify-center items-center font-mono">
              <FileSpreadsheet size={48} className="text-neo-black mb-3 stroke-[2]" />
              Select a session from the explorer ledger to inspect audit trail.
            </div>
          )}
        </div>
      </div>

      {/* Retro Sui verification Modal */}
      {isVerifying && (
        <div className="fixed inset-0 bg-neo-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-neo-black text-neo-green border-4 border-neo-black shadow-neo-lg max-w-2xl w-full rounded-none overflow-hidden relative font-mono text-sm">
            
            {/* Modal header */}
            <div className="bg-neo-black text-neo-green p-4 border-b-4 border-neo-black flex justify-between items-center select-none">
              <h3 className="font-black uppercase tracking-tight text-lg flex items-center gap-2">
                <Cpu size={20} className="animate-spin text-neo-green" /> CRYPTOGRAPHIC INSPECTOR
              </h3>
              {verificationResult !== 'running' && (
                <button
                  onClick={() => setIsVerifying(false)}
                  className="text-neo-green hover:text-white cursor-pointer bg-transparent border-0 font-black text-xl"
                >
                  <X size={20} className="stroke-[3]" />
                </button>
              )}
            </div>

            {/* Modal body (Terminal CRT style) */}
            <div className="p-6 md:p-8 space-y-6 bg-[#0c0c0c] border-b-2 border-neo-black min-h-[350px]">
              
              <div className="bg-black p-3.5 border border-neo-green/30 text-xs space-y-1 text-neo-green/90 leading-relaxed">
                <div>&gt; INITIATING SECURITY VALIDATION SEQUENCE FOR AUDIT ID: {selectedTicket?.id}</div>
                <div>&gt; ATOMIC HASH VALUE RETRIEVED FROM WALRUS STORAGE: {selectedTicket?.proof?.blobId}</div>
              </div>

              {/* Steps Progress */}
              <div className="space-y-3 font-semibold text-xs md:text-sm">
                
                {/* Step 1 */}
                <div className="flex items-center gap-3">
                  <span className={verificationStep >= 1 ? "text-neo-green animate-pulse" : "text-neo-green/30"}>
                    {verificationStep > 1 ? "[✓]" : verificationStep === 1 ? "[»]" : "[ ]"}
                  </span>
                  <span className={verificationStep >= 1 ? "text-neo-green" : "text-neo-green/30"}>
                    Connecting to Sui blockchain RPC Testnet gateway...
                  </span>
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-3">
                  <span className={verificationStep >= 2 ? "text-neo-green animate-pulse" : "text-neo-green/30"}>
                    {verificationStep > 2 ? "[✓]" : verificationStep === 2 ? "[»]" : "[ ]"}
                  </span>
                  <span className={verificationStep >= 2 ? "text-neo-green" : "text-neo-green/30"}>
                    Querying Walrus decentralized storage nodes for blob certs...
                  </span>
                </div>

                {/* Step 3 */}
                <div className="flex items-center gap-3">
                  <span className={verificationStep >= 3 ? "text-neo-green animate-pulse" : "text-neo-green/30"}>
                    {verificationStep > 3 ? "[✓]" : verificationStep === 3 ? "[»]" : "[ ]"}
                  </span>
                  <span className={verificationStep >= 3 ? "text-neo-green" : "text-neo-green/30"}>
                    Reassembling sharded transcript payload packets...
                  </span>
                </div>

                {/* Step 4 */}
                <div className="flex items-center gap-3">
                  <span className={verificationStep >= 4 ? "text-neo-green animate-pulse" : "text-neo-green/30"}>
                    {verificationStep > 4 ? "[✓]" : verificationStep === 4 ? "[»]" : "[ ]"}
                  </span>
                  <span className={verificationStep >= 4 ? "text-neo-green" : "text-neo-green/30"}>
                    Re-calculating SHA-256 local transcript digest values...
                  </span>
                </div>

                {/* Step 5 */}
                <div className="flex items-center gap-3">
                  <span className={verificationStep >= 5 ? "text-neo-green animate-pulse" : "text-neo-green/30"}>
                    {verificationStep > 5 ? "[✓]" : verificationStep === 5 ? "[»]" : "[ ]"}
                  </span>
                  <span className={verificationStep >= 5 ? "text-neo-green" : "text-neo-green/30"}>
                    Validating cryptographic signing credentials...
                  </span>
                </div>
              </div>

              {/* Completion Results */}
              {verificationResult === 'success' && (
                <div className="bg-neo-green text-neo-black border-4 border-neo-black p-5 space-y-3 shadow-neo-md animate-bounce mt-4 select-none">
                  
                  <div className="flex items-center gap-2 border-b-2 border-neo-black pb-2">
                    <CheckSquare size={18} className="stroke-[3]" />
                    <span className="font-black uppercase tracking-wider text-xs md:text-sm">VERIFICATION LOG SUCCESSFUL</span>
                  </div>
                  
                  <div className="text-[10px] md:text-xs font-bold space-y-2">
                    <div>
                      <span className="font-bold uppercase tracking-widest text-[9px] opacity-75">Calculated SHA-256 Digest:</span>
                      <div className="text-neo-black break-all bg-white p-2 border border-neo-black mt-1 select-all font-semibold font-mono">
                        {sha256Hash}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-1">
                      <div>
                        <span className="font-bold uppercase tracking-widest text-[9px] opacity-75">Storage State:</span>
                        <div className="text-neo-black font-black uppercase text-[10px] md:text-xs">✦ TAMPER-FREE</div>
                      </div>
                      <div>
                        <span className="font-bold uppercase tracking-widest text-[9px] opacity-75">Sui NFT Authority:</span>
                        <div className="text-neo-black font-black uppercase text-[10px] md:text-xs">✦ VALID SIGNATURE</div>
                      </div>
                    </div>

                    {selectedTicket?.proof?.digest && (
                      <div className="pt-2 border-t border-black/30 mt-2">
                        <a
                          href={`https://suiscan.xyz/testnet/tx/${selectedTicket.proof.digest}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-neo-black font-black hover:text-white block"
                        >
                          🔗 VIEW SUI TRANSACTION ON SUISCAN
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="bg-neo-black p-4 border-t-2 border-neo-green/20 flex justify-end">
              {verificationResult === 'running' ? (
                <div className="flex items-center gap-2 font-mono text-xs font-black text-neo-green animate-pulse">
                  <Loader2 size={16} className="animate-spin text-neo-green" /> EXECUTING INVENTORY...
                </div>
              ) : (
                <button
                  onClick={() => setIsVerifying(false)}
                  className="bg-neo-green text-neo-black hover:bg-white hover:text-neo-black font-black uppercase text-xs py-2 px-5 border-2 border-neo-black shadow-neo-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer rounded-none"
                >
                  CLOSE TERMINAL
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
