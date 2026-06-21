import React, { useState } from 'react';
import { getStoredSettings, saveStoredSettings, getStoredTickets } from '../services/walrus';
import type { SystemSettings } from '../services/walrus';
import { Save, AlertCircle, ShieldAlert, Cpu, HardDrive, FileText, CheckCircle2 } from 'lucide-react';

interface DashboardProps {
  onSettingsChange: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSettingsChange }) => {
  const [settings, setSettings] = useState<SystemSettings>(() => getStoredSettings());
  
  const [totalTickets] = useState(() => getStoredTickets().length);
  const [storageUsed] = useState(() => {
    const tickets = getStoredTickets();
    let totalBytes = 0;
    tickets.forEach(ticket => {
      if (ticket.proof) {
        // Approximate byte size based on character count of JSON representation
        totalBytes += ticket.proof.isSimulated ? 850 : 1200;
      }
    });
    return parseFloat((totalBytes / 1024).toFixed(2)); // KB
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredSettings(settings);
    onSettingsChange();
    setToastMsg('SYSTEM SETTINGS COMMITTED TO LOCAL DEPLOYMENT');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handlePromptChange = (val: string) => {
    // Attempt to extract refund limit from prompt if the user writes one
    let maxRef = settings.maxRefund;
    const refundMatch = val.match(/refund[^\n]*\$([0-9]+)/i);
    if (refundMatch && refundMatch[1]) {
      maxRef = parseInt(refundMatch[1], 10);
    }
    setSettings({ ...settings, systemPrompt: val, maxRefund: maxRef });
  };

  return (
    <div className="space-y-8 relative">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-neo-yellow text-neo-black border-4 border-neo-black p-5 shadow-neo-lg font-black flex items-center gap-3 animate-bounce">
          <CheckCircle2 size={24} className="stroke-[3] text-neo-black" />
          <span className="font-mono text-sm tracking-tight">{toastMsg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-neo-blue text-white p-8 border-4 border-neo-black shadow-neo-lg relative overflow-hidden">
        {/* Massive Bold Background Text */}
        <div className="absolute right-0 bottom-[-20px] text-neo-black opacity-15 font-black select-none pointer-events-none text-8xl md:text-9xl leading-none font-mono">
          CONTROL
        </div>
        
        <div className="relative z-10 space-y-4">
          <span className="bg-neo-pink text-neo-black text-xs font-black px-3 py-1.5 uppercase border-2 border-neo-black tracking-widest inline-block shadow-neo-sm transform -rotate-1">
            ✦ Sui Blockchain Secured ✦
          </span>
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-none drop-shadow-[2px_2px_0px_#000000]">
            TraceAI CONTROL UNIT
          </h1>
          <p className="max-w-2xl text-base md:text-lg font-bold text-blue-50 leading-relaxed font-mono">
            Define customer agent personality guidelines, enforce cryptographic verification, and track decentralised audit logs.
          </p>
        </div>
      </div>

      {/* Grid Layout - Asymmetric */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Settings Editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border-4 border-neo-black shadow-neo-lg p-6 md:p-8">
            
            <div className="border-b-4 border-neo-black pb-4 mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3 font-mono">
                <Cpu className="stroke-[3] text-neo-pink" /> AGENT CONFIGURATION
              </h2>
              <span className="text-xs font-black bg-neo-black text-white px-3 py-1 uppercase tracking-wider font-mono">
                Active Node: v1.0.0
              </span>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              
              {/* System Prompt TextArea */}
              <div className="space-y-2">
                <label className="block text-lg font-black uppercase tracking-wide">
                  System Prompt & Guardrails
                </label>
                <div className="text-xs text-neo-black mb-2 font-mono bg-neo-yellow/30 p-3 border-2 border-neo-black font-bold">
                  Rule Trigger Example: "Maximum refund is $50. Never exceed $50."
                </div>
                <textarea
                  className="w-full h-64 p-4 border-3 border-neo-black font-mono text-sm focus:outline-none focus:ring-0 focus:border-neo-pink focus:bg-white bg-neo-bg text-neo-black rounded-none resize-none shadow-inner"
                  value={settings.systemPrompt}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  placeholder="Define your support agent guidelines here..."
                  required
                />
              </div>

              {/* Settings Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Max Refund Threshold */}
                <div className="space-y-3">
                  <label className="block text-md font-black uppercase tracking-wide">
                    Max Refund Limit ($USD)
                  </label>
                  <input
                    type="number"
                    className="w-full p-3.5 border-3 border-neo-black font-black text-lg focus:outline-none focus:border-neo-blue bg-white text-neo-black rounded-none"
                    value={settings.maxRefund}
                    onChange={(e) => setSettings({ ...settings, maxRefund: parseInt(e.target.value) || 0 })}
                    min="0"
                    required
                  />
                  <p className="text-xs text-gray-600 font-bold font-mono">
                    ✦ Automatically parsed and enforced by AI guardrails.
                  </p>
                </div>

                {/* Walrus Audit Logging Toggle */}
                <div className="space-y-3 flex flex-col justify-between">
                  <div>
                    <label className="block text-md font-black uppercase tracking-wide">
                      Walrus Audit Logging
                    </label>
                    <p className="text-xs text-gray-600 font-bold font-mono mt-1">
                      Immutably commit transcripts to the Walrus Testnet.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 mt-2">
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, enforceWalrus: !settings.enforceWalrus })}
                      className={`relative w-20 h-10 border-3 border-neo-black transition-colors duration-150 focus:outline-none rounded-none cursor-pointer ${
                        settings.enforceWalrus ? 'bg-neo-green' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 bottom-0.5 w-8 border-3 border-neo-black bg-white transition-all duration-150 ${
                          settings.enforceWalrus ? 'left-[42px]' : 'left-0.5'
                        }`}
                      />
                    </button>
                    <span className="font-black text-sm uppercase font-mono bg-neo-black text-white px-2 py-0.5 border border-neo-black">
                      {settings.enforceWalrus ? 'ENFORCED' : 'BYPASSED'}
                    </span>
                  </div>
                </div>

              </div>

              {/* Submit Button */}
              <div className="pt-6 border-t-3 border-neo-black flex justify-end">
                <button
                  type="submit"
                  className="neo-btn neo-btn-pink text-md py-3 px-8 shadow-neo-sm font-black tracking-wider micro-shake"
                >
                  <Save size={20} className="stroke-[3]" />
                  COMMIT CHANGES
                </button>
              </div>

            </form>
          </div>
        </div>

        {/* Right Column: Metrics Overview & Status Info */}
        <div className="space-y-8">
          
          {/* Metric 1: Total Support Tickets */}
          <div className="bg-neo-pink text-neo-black border-4 border-neo-black shadow-neo-lg p-6 relative overflow-hidden group hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-lg transition-all">
            <div className="absolute right-2 top-[-10px] text-neo-black opacity-10 font-black text-8xl select-none pointer-events-none leading-none font-mono">
              01
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
              <div className="flex items-center gap-2 font-black uppercase text-xs tracking-widest bg-white border-2 border-neo-black px-2 py-0.5 self-start shadow-neo-sm">
                <FileText size={14} className="stroke-[2.5]" /> Total Audits Logged
              </div>
              <div>
                <div className="text-6xl font-black tracking-tighter leading-none mb-1 font-mono">
                  {totalTickets}
                </div>
                <div className="text-xs uppercase font-black tracking-wide text-neo-black/75 font-mono">
                  Sessions committed to ledger
                </div>
              </div>
            </div>
          </div>

          {/* Metric 2: Storage Used */}
          <div className="bg-neo-yellow text-neo-black border-4 border-neo-black shadow-neo-lg p-6 relative overflow-hidden group hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-lg transition-all">
            <div className="absolute right-2 top-[-10px] text-neo-black opacity-10 font-black text-8xl select-none pointer-events-none leading-none font-mono">
              02
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
              <div className="flex items-center gap-2 font-black uppercase text-xs tracking-widest bg-white border-2 border-neo-black px-2 py-0.5 self-start shadow-neo-sm">
                <HardDrive size={14} className="stroke-[2.5]" /> Decentralised Space
              </div>
              <div>
                <div className="text-6xl font-black tracking-tighter leading-none mb-1 font-mono">
                  {storageUsed} <span className="text-2xl font-black">KB</span>
                </div>
                <div className="text-xs uppercase font-black tracking-wide text-neo-black/75 font-mono">
                  Walrus storage usage index
                </div>
              </div>
            </div>
          </div>

          {/* Metric 3: Active Agent Status */}
          <div className="bg-neo-orange text-white border-4 border-neo-black shadow-neo-lg p-6 relative overflow-hidden group hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-lg transition-all">
            <div className="absolute right-2 top-[-10px] text-white opacity-15 font-black text-8xl select-none pointer-events-none leading-none font-mono">
              03
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
              <div className="flex items-center gap-2 font-black uppercase text-xs tracking-widest bg-white text-neo-black border-2 border-neo-black px-2 py-0.5 self-start shadow-neo-sm">
                <ShieldAlert size={14} className="stroke-[2.5]" /> Decider Guardrails
              </div>
              <div>
                <div className="text-3xl font-black uppercase tracking-tight leading-none mb-1 font-mono drop-shadow-[1.5px_1.5px_0px_#000000]">
                  LIMIT: ${settings.maxRefund}
                </div>
                <div className="text-[10px] uppercase font-black text-orange-100 flex items-center gap-2 mt-3 font-mono bg-neo-black/35 px-2 py-1 self-start border border-neo-black inline-block">
                  <span className="w-2.5 h-2.5 bg-neo-green border border-neo-black inline-block animate-ping rounded-full" />
                  {settings.enforceWalrus ? 'Walrus Auditing: ONLINE' : 'Audit Logs: BYPASSED'}
                </div>
              </div>
            </div>
          </div>

          {/* Node Health Status */}
          <div className="bg-white border-4 border-neo-black p-6 space-y-4 shadow-neo-md">
            <h3 className="text-md font-black uppercase tracking-wider border-b-3 border-neo-black pb-2 flex items-center gap-2 font-mono">
              <AlertCircle size={18} className="stroke-[3] text-neo-blue" /> NETWORK INTEGRITY
            </h3>
            <div className="space-y-3 font-mono text-xs font-bold">
              <div className="flex justify-between items-center bg-neo-bg p-2 border-2 border-neo-black">
                <span>Sui Network Connection:</span>
                <span className="text-neo-blue font-black uppercase bg-white border border-neo-black px-1.5 py-0.5">SUI_TESTNET</span>
              </div>
              <div className="flex justify-between items-center bg-neo-bg p-2 border-2 border-neo-black">
                <span>Walrus Node Status:</span>
                <span className="text-neo-green font-black uppercase bg-white border border-neo-black px-1.5 py-0.5">ONLINE</span>
              </div>
              <div className="flex justify-between items-center bg-neo-bg p-2 border-2 border-neo-black">
                <span>Contract ID:</span>
                <span className="text-gray-600 font-semibold select-all">0x2da8...271f</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
