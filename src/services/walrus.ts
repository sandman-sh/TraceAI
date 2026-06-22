export interface WalrusProof {
  blobId: string;
  timestamp: number;
  systemPrompt: string;
  reasoning: string[];
  digest?: string;
  isSimulated: boolean;
  maxRefund?: number;
  enforceWalrus?: boolean;
}

export interface TicketLog {
  id: string;
  customerName: string;
  issueType: string;
  status: 'resolved' | 'denied' | 'escalated';
  transcript: { sender: 'User' | 'TraceAI Support' | 'KIRO'; text: string; timestamp: number }[];
  proof?: WalrusProof;
}

const LOCAL_STORAGE_TICKETS_KEY = 'traceai_tickets';
const LOCAL_STORAGE_SETTINGS_KEY = 'traceai_settings';

// Default mock tickets to populate the dashboard on first load
const DEFAULT_TICKETS: TicketLog[] = [
  {
    id: "TKT-8902",
    customerName: "Alex Mercer",
    issueType: "Refund Request",
    status: "denied",
    transcript: [
      { sender: "User", text: "Hi, I purchased the enterprise tier yesterday but my team needs to cancel. Can I get a full refund of $500?", timestamp: Date.now() - 3600000 * 2 },
      { sender: "TraceAI Support", text: "Hello Alex. I understand you would like a refund of $500 for the enterprise tier cancelation. Let me check the refund policy.", timestamp: Date.now() - 3600000 * 1.9 },
      { sender: "TraceAI Support", text: "According to our business guidelines, we cannot issue refunds exceeding $50. Therefore, I must deny the $500 refund request. However, I can issue a maximum partial refund of $50.", timestamp: Date.now() - 3600000 * 1.8 }
    ],
    proof: {
      blobId: "blob_walrus_testnet_7x9A8872bFccE910a51A504B",
      timestamp: Date.now() - 3600000 * 1.8,
      systemPrompt: "Personality: Professional customer assistant. Core constraints: Maximum refund allowed is $50. Never approve exceptions. Deny higher requests and offer $50.",
      reasoning: [
        "1. Parse refund request amount: $500.",
        "2. Compare request ($500) against max refund limit constraint ($50).",
        "3. Constraint check failed: $500 exceeds $50 limit.",
        "4. Construct denial explanation and offer maximum allowed offset ($50).",
        "5. Compile audit trail and commit payload hash to Sui blockchain."
      ],
      digest: "0x8fa928172cda8801dff72836261ac2e69888876c1236fb62ba1e9882a17cb09b",
      isSimulated: true
    }
  },
  {
    id: "TKT-8903",
    customerName: "Sarah Connor",
    issueType: "Account Deactivation",
    status: "resolved",
    transcript: [
      { sender: "User", text: "I need to close my account. I don't use it anymore.", timestamp: Date.now() - 7200000 },
      { sender: "TraceAI Support", text: "I can help with account deactivation. To confirm, closing your account will delete all configured agent states. Do you wish to proceed?", timestamp: Date.now() - 7100000 },
      { sender: "User", text: "Yes, please proceed.", timestamp: Date.now() - 7000000 },
      { sender: "TraceAI Support", text: "Your account deactivation request has been successfully processed. An confirmation email has been sent.", timestamp: Date.now() - 6900000 }
    ],
    proof: {
      blobId: "blob_walrus_testnet_1z2Y9983bAddD882b43A901F",
      timestamp: Date.now() - 6900000,
      systemPrompt: "Personality: Supportive and concise. Constraints: Account deletions require double confirmation. Advise user of loss of agent state.",
      reasoning: [
        "1. Parse intent: Account deletion.",
        "2. Check constraints: Double confirmation required. Warning about loss of agent state required.",
        "3. User response: Confirmed.",
        "4. Trigger deactivation API mock and log final verification blob."
      ],
      digest: "0x78ea3391cbda8f02ecf82245b61ac1c7888887b41981fb21ba2e3381a17cb992",
      isSimulated: true
    }
  }
];

export interface SystemSettings {
  systemPrompt: string;
  enforceWalrus: boolean;
  maxRefund: number;
  openRouterApiKey?: string;
  openRouterModel?: string;
}

export const SUI_CONTRACT_CONFIG = {
  packageId: import.meta.env.VITE_SUI_PACKAGE_ID || "0xe83ee2ad95984f94e2f062fc73796282c81895c49606d35a4f8f8ab55118b70b",
  moduleName: "audit_ledger",
  functionName: "log_audit",
};

const DEFAULT_SETTINGS: SystemSettings = {
  systemPrompt: "You are KIRO, a personalized B2B customer support agent. Address the customer by name if known. When responding, you must analyze and reference their past interactions retrieved from Walrus secured memory context if they are relevant to their current query. Rules:\n- Maximum refund limit is $50.\n- Under no circumstances exceed $50.\n- Always explain the limit to the customer clearly.\n- Offer maximum refund of $50 as alternative.",
  enforceWalrus: true,
  maxRefund: 50,
  openRouterApiKey: import.meta.env.VITE_OPENROUTER_API_KEY || "",
  openRouterModel: import.meta.env.VITE_OPENROUTER_MODEL || "openrouter/free",
};

export const getStoredSettings = (): SystemSettings => {
  const stored = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { return DEFAULT_SETTINGS; }
  }
  return DEFAULT_SETTINGS;
};

export const saveStoredSettings = (settings: SystemSettings) => {
  localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settings));
};

export const getStoredTickets = (): TicketLog[] => {
  const stored = localStorage.getItem(LOCAL_STORAGE_TICKETS_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch { return DEFAULT_TICKETS; }
  }
  localStorage.setItem(LOCAL_STORAGE_TICKETS_KEY, JSON.stringify(DEFAULT_TICKETS));
  return DEFAULT_TICKETS;
};

export const saveTicket = (ticket: TicketLog) => {
  const tickets = getStoredTickets();
  const index = tickets.findIndex(t => t.id === ticket.id);
  if (index >= 0) {
    tickets[index] = ticket;
  } else {
    tickets.unshift(ticket);
  }
  localStorage.setItem(LOCAL_STORAGE_TICKETS_KEY, JSON.stringify(tickets));
};

// Publisher: /api/walrus-publisher/v1/blobs?epochs=1
// Aggregator: /api/walrus-aggregator/v1/blobs/<blobId>

export const publishToWalrus = async (
  payload: Omit<WalrusProof, 'blobId' | 'digest' | 'isSimulated'>
): Promise<{ blobId: string; digest: string; isSimulated: boolean; size: number }> => {
  const jsonString = JSON.stringify(payload);
  const blobSize = new Blob([jsonString]).size;
  
  try {
    const response = await fetch('/api/walrus-publisher/v1/blobs?epochs=1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonString,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    let blobId = '';
    let digest = '0x' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
    
    if (data.newlyCreated) {
      blobId = data.newlyCreated.blobObject.blobId;
    } else if (data.alreadyCertified) {
      blobId = data.alreadyCertified.blobId;
      if (data.alreadyCertified.event?.txDigest) {
        digest = data.alreadyCertified.event.txDigest;
      }
    } else {
      throw new Error('Unknown response format');
    }
    
    return {
      blobId,
      digest,
      isSimulated: false,
      size: blobSize
    };
  } catch (error) {
    console.warn('Walrus Testnet Publisher failed, falling back to simulation:', error);
    
    // Simulate blobId by base64-encoding a portion of a random Sui hash
    const fakeBlobId = 'blob_sim_' + Array.from({length: 24}, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random()*62)]).join('');
    const fakeDigest = '0x' + Array.from({length: 64}, () => '0123456789abcdef'[Math.floor(Math.random()*16)]).join('');
    
    return {
      blobId: fakeBlobId,
      digest: fakeDigest,
      isSimulated: true,
      size: blobSize
    };
  }
};

export const fetchBlobFromWalrus = async (blobId: string): Promise<unknown> => {
  if (blobId.startsWith('blob_sim_')) {
    // Simulated fallback from local storage
    const tickets = getStoredTickets();
    const match = tickets.find(t => t.proof?.blobId === blobId);
    if (match && match.proof) {
      return {
        timestamp: match.proof.timestamp,
        systemPrompt: match.proof.systemPrompt,
        reasoning: match.proof.reasoning
      };
    }
    throw new Error('Simulated Blob not found');
  }

  try {
    const response = await fetch(`/api/walrus-aggregator/v1/blobs/${blobId}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch from Walrus aggregator for blob ${blobId}:`, error);
    // Try to search local storage as fallback
    const tickets = getStoredTickets();
    const match = tickets.find(t => t.proof?.blobId === blobId);
    if (match && match.proof) {
      return {
        timestamp: match.proof.timestamp,
        systemPrompt: match.proof.systemPrompt,
        reasoning: match.proof.reasoning
      };
    }
    throw error;
  }
};

export const calculateSHA256 = async (str: string): Promise<string> => {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return '0x' + hashHex;
};
