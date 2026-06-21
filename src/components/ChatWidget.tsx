import React, { useState, useEffect, useRef } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { getStoredSettings, saveTicket, publishToWalrus, SUI_CONTRACT_CONFIG, calculateSHA256, getStoredTickets } from '../services/walrus';
import type { TicketLog } from '../services/walrus';
import { Mic, Send, HardDriveUpload, Check, ShieldCheck, RefreshCw, Cpu, Wallet } from 'lucide-react';

interface ChatWidgetProps {
  onTicketLogged: () => void;
  walletConnected: boolean;
  walletAddress: string;
  signAndExecuteTransaction: (args: { transaction: Transaction }) => Promise<{ digest: string }>;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ onTicketLogged, walletConnected, walletAddress, signAndExecuteTransaction }) => {
  const [messages, setMessages] = useState<{ sender: 'User' | 'TraceAI Support' | 'KIRO'; text: string; timestamp: number }[]>(() => [
    {
      sender: 'KIRO',
      text: 'Hello. I am KIRO, your personalized AI support agent. How can I assist you with your business account today?',
      timestamp: Date.now()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'publishing' | 'sui_nft' | 'completed'>('idle');
  const [uploadedBlobId, setUploadedBlobId] = useState('');
  const [uploadedDigest, setUploadedDigest] = useState('');
  const [reasoningSteps, setReasoningSteps] = useState<string[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(prev => prev + (prev ? ' ' : '') + transcript);
      };

      rec.onerror = (err: any) => {
        console.error("Speech recognition error:", err);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const generateAIResponse = async (userMsg: string) => {
    setIsTyping(true);
    const settings = getStoredSettings();
    
    try {
      // Retrieve past tickets (Walrus Memory)
      const pastTickets = getStoredTickets();
      let memoryContext = "No past interactions recorded in Walrus memory.";
      if (pastTickets.length > 0) {
        memoryContext = pastTickets
          .slice(0, 5) // Last 5 tickets
          .map(t => {
            const dateStr = new Date(t.proof?.timestamp || 0).toLocaleDateString();
            return `- Ticket ${t.id} (${dateStr}): Issue: "${t.issueType}", Status: "${t.status}". Final response given was: "${t.transcript[t.transcript.length - 1]?.text || ''}"`;
          })
          .join('\n');
      }

      const fullSystemPrompt = `${settings.systemPrompt}\n\n[WALRUS SECURED MEMORY CONTEXT]\nHere are the customer's past audited interactions retrieved from Walrus decentralized storage:\n${memoryContext}\nUse this history to personalize your response, reference previous issues if relevant, and avoid asking for information they have already provided.`;

      // Prepare context messages for the backend proxy
      const apiMessages = [
        { role: "system", content: fullSystemPrompt },
        ...messages.map(m => ({
          role: m.sender === 'User' ? 'user' : 'assistant',
          content: m.text
        })),
        { role: "user", content: userMsg }
      ];

      const steps: string[] = [];
      steps.push("1. Parse user message intent and keywords.");
      steps.push(`2. Querying Walrus memory context database (found ${pastTickets.length} past records).`);
      steps.push(`3. Evaluating system guidelines and Walrus memory via backend AI proxy...`);

      // Call our server-side proxy instead of OpenRouter directly
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
          model: settings.openRouterModel || undefined
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.message || `API error: ${response.statusText}`);
      }

      const responseText = data.choices?.[0]?.message?.content || "No response received.";
      
      // Evaluate compliance parameters for steps log
      const cleanMsg = userMsg.toLowerCase();
      const refundMatch = userMsg.match(/\$?([0-9]+)/);
      const isRefundRequest = cleanMsg.includes('refund') || cleanMsg.includes('money back') || cleanMsg.includes('reimburse');
      
      if (isRefundRequest) {
        const requestedAmount = refundMatch ? parseInt(refundMatch[1], 10) : 500;
        steps.push(`4. Refund intent detected. Amount: $${requestedAmount}. Checked against limit of $${settings.maxRefund}.`);
        if (requestedAmount > settings.maxRefund) {
          steps.push("5. Policy enforcement activated: refund denied / cap offered.");
        } else {
          steps.push("5. Policy enforcement cleared: refund is within active guidelines.");
        }
      } else {
        steps.push("4. General support query processed under B2B guardrail guidelines.");
      }
      
      setReasoningSteps(prev => [...prev, ...steps]);
      setMessages(prev => [
        ...prev,
        { sender: 'KIRO', text: responseText, timestamp: Date.now() }
      ]);
    } catch (error) {
      console.error("AI response error:", error);
      
      // Fallback: if no API key configured, use local simulation
      const cleanMsg = userMsg.toLowerCase();
      const isRefundRequest = cleanMsg.includes('refund') || cleanMsg.includes('money back');
      
      const fallbackText = isRefundRequest
        ? `I understand you are requesting a refund. However, under our active company refund policies, the maximum allowance we can issue is $${settings.maxRefund}. I have gone ahead and processed a partial refund of $${settings.maxRefund} for your account.`
        : `I've logged your request. Our support team is reviewing it. Is there anything else I can assist you with?`;
      
      const steps = [
        "1. Parse user message intent.",
        `2. ⚠️ Backend proxy error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        "3. Falling back to local compliance rule engine.",
        `4. Active refund limit: $${settings.maxRefund}.`,
        "5. Formulated local response."
      ];

      setReasoningSteps(prev => [...prev, ...steps]);
      setMessages(prev => [
        ...prev,
        { sender: 'KIRO', text: fallbackText, timestamp: Date.now() }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText;
    setMessages(prev => [
      ...prev,
      { sender: 'User', text: userText, timestamp: Date.now() }
    ]);
    setInputText('');
    generateAIResponse(userText);
  };

  const triggerRefundDemo = () => {
    setInputText("Hi, I cancelled my enterprise subscription today. I would like to request a full refund of my $500 payment.");
  };

  const handleMicDown = () => {
    if (recognitionRef.current) {
      setIsRecording(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Speech recognition start failed:", e);
      }
    } else {
      setIsRecording(true);
    }
  };

  const handleMicUp = () => {
    if (isRecording) {
      setIsRecording(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.error("Speech recognition stop failed:", e);
        }
      } else {
        setInputText("I need to request a refund for $500 since the app is not working for my team.");
      }
    }
  };

  const handleSaveAndAudit = async () => {
    if (messages.length <= 1) return;
    
    // Check wallet connection before allowing blockchain audit
    if (!walletConnected) {
      alert("Please connect your Sui Wallet first (using the button in the header) to submit the audit logs on-chain.");
      return;
    }

    setUploadStatus('publishing');
    
    const settings = getStoredSettings();
    const ticketId = 'TKT-' + Math.floor(1000 + Math.random() * 9000);
    
    // 1. Prepare data for Walrus
    const proofPayload = {
      timestamp: Date.now(),
      systemPrompt: settings.systemPrompt,
      reasoning: reasoningSteps.length > 0 ? reasoningSteps : [
        "1. Standard text conversation initiated.",
        "2. Parse general support parameters.",
        "3. Session ended by user request.",
        "4. Compile and hash session metadata."
      ]
    };

    // 2. Publish to Walrus Testnet (or fallback)
    const result = await publishToWalrus(proofPayload);
    
    setUploadStatus('sui_nft');
    
    try {
      // Compile metadata for the Sui contract
      const isRefundTicket = messages.some(m => m.text.toLowerCase().includes('refund'));
      const isDenied = messages.some(m => m.text.includes('deny') || m.text.includes('policies, the maximum refund'));
      const ticketStatus = isDenied ? 'denied' : 'resolved';
      const issueType = isRefundTicket ? "Refund Request" : "General Support";
      
      const textToHash = JSON.stringify({
        transcript: messages,
        systemPrompt: proofPayload.systemPrompt
      });
      const userHash = await calculateSHA256(textToHash);

      // Build Sui Transaction using @mysten/sui SDK
      const tx = new Transaction();
      
      tx.moveCall({
        target: `${SUI_CONTRACT_CONFIG.packageId}::${SUI_CONTRACT_CONFIG.moduleName}::${SUI_CONTRACT_CONFIG.functionName}`,
        arguments: [
          tx.pure.string(ticketId),
          tx.pure.string(walletAddress || "Anonymous User"),
          tx.pure.string(issueType),
          tx.pure.string(ticketStatus),
          tx.pure.string(result.blobId),
          tx.pure.string(userHash),
          tx.pure.u64(proofPayload.timestamp)
        ],
      });

      // Use dapp-kit signAndExecuteTransaction hook (works with any Wallet Standard wallet)
      const res = await signAndExecuteTransaction({
        transaction: tx,
      });

      if (!res || !res.digest) {
        throw new Error("Failed to sign or execute transaction on Sui.");
      }

      setUploadedBlobId(result.blobId);
      setUploadedDigest(res.digest);
      setUploadStatus('completed');

      // 3. Save Ticket locally with real digest
      const ticket: TicketLog = {
        id: ticketId,
        customerName: "Anonymous User",
        issueType: issueType,
        status: ticketStatus,
        transcript: messages,
        proof: {
          blobId: result.blobId,
          timestamp: proofPayload.timestamp,
          systemPrompt: proofPayload.systemPrompt,
          reasoning: proofPayload.reasoning,
          digest: res.digest,
          isSimulated: false
        }
      };

      saveTicket(ticket);
      onTicketLogged();

    } catch (error) {
      console.error("On-chain Sui transaction failed:", error);
      alert("Failed to submit transaction to Sui Wallet: " + (error instanceof Error ? error.message : String(error)));
      setUploadStatus('idle');
    }
  };

  const handleReset = () => {
    setMessages([
      {
        sender: 'KIRO',
        text: 'Hello. I am KIRO, your personalized AI support agent. How can I assist you with your business account today?',
        timestamp: Date.now()
      }
    ]);
    setReasoningSteps([]);
    setInputText('');
    setUploadStatus('idle');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Left panel: Quick Demo controller */}
      <div className="bg-white border-4 border-neo-black shadow-neo-lg p-6 space-y-6">
        <h3 className="text-xl font-black uppercase tracking-tight border-b-4 border-neo-black pb-3 bg-neo-yellow -mx-6 -mt-6 p-4 font-mono flex items-center gap-2 select-none">
          <Cpu className="stroke-[3]" size={20} /> DEMO INSTRUCTIONS
        </h3>
        
        <div className="space-y-4 text-sm font-bold leading-relaxed">
          <p>
            This console lets you test the customer-facing AI agent. The decisions will actively respect compliance rules configured in the B2B Dashboard.
          </p>
          
          <div className="bg-neo-bg p-4 border-3 border-neo-black shadow-neo-sm space-y-2">
            <span className="font-black text-[10px] uppercase bg-neo-black text-white px-2.5 py-1 inline-block border border-neo-black font-mono">
              ✦ Refund Test Scenario
            </span>
            <p className="text-xs text-gray-700 leading-normal">
              Inject a simulated support ticket asking for a refund that exceeds the active limit.
            </p>
            <button
              onClick={triggerRefundDemo}
              className="w-full bg-white hover:bg-neo-pink text-neo-black border-3 border-neo-black py-2.5 px-3 font-black text-xs uppercase transition-all rounded-none shadow-neo-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
            >
              Load $500 Refund Query
            </button>
          </div>

          <div className="bg-neo-bg p-4 border-3 border-neo-black shadow-neo-sm space-y-2">
            <span className="font-black text-[10px] uppercase bg-neo-black text-white px-2.5 py-1 inline-block border border-neo-black font-mono">
              ✦ Voice Simulation
            </span>
            <p className="text-xs text-gray-700 leading-normal">
              Click and hold the circular microphone button in the input console to trigger speech recognition simulation.
            </p>
          </div>
        </div>
      </div>

      {/* Main chat column */}
      <div className="lg:col-span-2">
        {uploadStatus !== 'idle' ? (
          <div className="bg-white border-4 border-neo-black shadow-neo-lg p-8 min-h-[500px] flex flex-col justify-center items-center text-center space-y-6">
            
            {uploadStatus === 'publishing' && (
              <>
                <div className="w-20 h-20 border-4 border-neo-black border-t-neo-pink animate-spin rounded-none bg-neo-yellow shadow-neo-md flex items-center justify-center">
                  <HardDriveUpload className="stroke-[3] text-neo-black" size={36} />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-wide font-mono">
                  PUBLISHING AUDIT BLOB TO WALRUS
                </h3>
                <p className="max-w-md font-mono text-xs text-gray-600 font-bold">
                  Splitting session transcript into erasure coding fragments and broadcasting to storage nodes...
                </p>
              </>
            )}

            {uploadStatus === 'sui_nft' && (
              <>
                <div className="relative w-24 h-24 bg-neo-blue border-4 border-neo-black flex items-center justify-center shadow-neo-lg animate-pulse">
                  <ShieldCheck className="text-white stroke-[3]" size={48} />
                </div>
                <h3 className="text-2xl font-black uppercase tracking-wide font-mono">
                  PROMPTING WALLET FOR SUI SIGNATURE
                </h3>
                <p className="max-w-md font-mono text-xs text-gray-600 font-bold">
                  Please approve the signature request in your browser wallet extension to commit this audit record on-chain...
                </p>
              </>
            )}

            {uploadStatus === 'completed' && (
              <div className="space-y-6 w-full max-w-xl">
                <div className="w-16 h-16 bg-neo-green border-4 border-neo-black mx-auto flex items-center justify-center shadow-neo-md text-neo-black">
                  <Check className="stroke-[3]" size={32} />
                </div>
                <h3 className="text-3xl font-black uppercase tracking-tight font-mono">
                  AUDIT LEDGER SECURED
                </h3>
                
                <div className="border-3 border-neo-black text-left font-mono text-xs p-4 bg-neo-bg space-y-3 shadow-inner">
                  <div>
                    <span className="font-black uppercase text-neo-pink bg-neo-black text-white px-1.5 py-0.5 border border-neo-black">Walrus Blob ID:</span>
                    <div className="text-neo-black select-all break-all mt-2 p-2 bg-white border border-gray-300 font-semibold">{uploadedBlobId}</div>
                  </div>
                  <div className="pt-2 border-t-2 border-neo-black">
                    <span className="font-black uppercase text-neo-blue text-white bg-neo-black px-1.5 py-0.5 border border-neo-black">Sui Tx Digest:</span>
                    <div className="text-neo-black select-all break-all mt-2 p-2 bg-white border border-gray-300 font-semibold">{uploadedDigest}</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                  <button
                    onClick={handleReset}
                    className="neo-btn neo-btn-pink font-black text-sm shadow-neo-sm"
                  >
                    <RefreshCw size={16} className="stroke-[2.5]" /> START NEW SESSION
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white border-4 border-neo-black shadow-neo-lg flex flex-col h-[600px]">
            
            {/* Chat header */}
            <div className="border-b-4 border-neo-black p-4 bg-neo-pink text-neo-black flex justify-between items-center select-none">
              <div>
                <h3 className="font-black uppercase tracking-tight text-lg font-mono">
                  TraceAI LIVE SESSION
                </h3>
                <span className="text-xs uppercase font-black text-neo-black/75 font-mono">
                  ✦ Connected: {walletConnected ? `Wallet (${walletAddress.slice(0, 6)}...)` : "None"} ✦
                </span>
              </div>
              
              {walletConnected ? (
                <button
                  onClick={handleSaveAndAudit}
                  disabled={messages.length <= 1}
                  className={`py-2 px-5 border-3 border-neo-black font-black uppercase tracking-wider text-xs shadow-neo-sm rounded-none bg-white text-neo-black transition-all ${
                    messages.length <= 1 
                      ? 'opacity-40 cursor-not-allowed shadow-none translate-x-0.5 translate-y-0.5' 
                      : 'hover:bg-neo-yellow hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-md active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer'
                  }`}
                >
                  COMMIT AUDIT LOGS
                </button>
              ) : (
                <div className="flex items-center gap-1.5 font-mono text-[10px] font-black bg-white px-2.5 py-1.5 border-2 border-neo-black shadow-neo-sm text-neo-black">
                  <Wallet size={12} /> CONNECT WALLET TO COMMIT
                </div>
              )}
            </div>

            {/* Chat message board */}
            <div className="flex-1 overflow-y-auto p-6 bg-neo-bg space-y-5 no-scrollbar">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.sender === 'User' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-4 border-3 border-neo-black shadow-neo-sm rounded-none ${
                      msg.sender === 'User'
                        ? 'bg-neo-yellow text-neo-black font-bold'
                        : 'bg-white text-neo-black border-l-8 border-l-neo-blue'
                    }`}
                  >
                    <div className="text-[10px] font-black uppercase tracking-widest mb-1.5 opacity-60 font-mono">
                      {msg.sender}
                    </div>
                    <div className="text-sm font-bold whitespace-pre-line leading-relaxed">
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 border-3 border-neo-black shadow-neo-sm rounded-none flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 bg-neo-pink border border-neo-black animate-bounce" style={{ animationDelay: '0s' }} />
                    <span className="w-2.5 h-2.5 bg-neo-blue border border-neo-black animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="w-2.5 h-2.5 bg-neo-yellow border border-neo-black animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Recording wave bar display */}
            {isRecording && (
              <div className="bg-white border-t-3 border-neo-black p-3.5 flex justify-center items-center gap-1 bg-neo-pink/15">
                <span className="text-xs uppercase font-black tracking-wider mr-3 font-mono">Recording Voice Input:</span>
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
                <span className="wave-bar"></span>
              </div>
            )}

            {/* Chat inputs */}
            <form onSubmit={handleSend} className="border-t-4 border-neo-black p-4 flex gap-4 bg-white">
              {/* Mic hold-to-talk button */}
              <button
                type="button"
                onMouseDown={handleMicDown}
                onMouseUp={handleMicUp}
                onMouseLeave={() => isRecording && setIsRecording(false)}
                onTouchStart={handleMicDown}
                onTouchEnd={handleMicUp}
                className={`w-14 h-14 rounded-full border-4 border-neo-black flex items-center justify-center shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer transition-all duration-75 select-none ${
                  isRecording ? 'bg-neo-pink text-neo-black scale-105 animate-pulse' : 'bg-neo-blue text-white hover:bg-opacity-95'
                }`}
                title="Hold to speak"
              >
                <Mic size={24} className="stroke-[2.5]" />
              </button>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isRecording ? "Listening..." : "Write message..."}
                disabled={isRecording}
                className="flex-1 px-4 border-3 border-neo-black font-bold text-sm focus:outline-none focus:border-neo-pink bg-neo-bg text-neo-black rounded-none shadow-inner"
              />

              <button
                type="submit"
                className="w-14 h-14 border-3 border-neo-black bg-neo-yellow hover:bg-opacity-90 flex items-center justify-center shadow-neo-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none rounded-none cursor-pointer"
              >
                <Send size={20} className="stroke-[3]" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
