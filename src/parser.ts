export interface AntigravityPayload {
  agent_state: string;
  conversation_id: string;
  context_window?: {
    used_percentage: number;
    total_input_tokens: number;
    current_usage?: {
      cache_read_input_tokens: number;
    };
  };
  quota?: {
    "gemini-weekly"?: { remaining_fraction: number };
    "gemini-5h"?: { remaining_fraction: number };
    "3p-weekly"?: { remaining_fraction: number };
  };
  subagents?: Array<{ name: string; role: string; status: string }>;
  task_count?: number;
  sandbox?: { enabled: boolean };
  model?: { display_name: string };
  workspace?: { project_dir: string };
  exceeds_200k_tokens?: boolean;
  version?: string;
  email?: string;
  plan_tier?: string;
  terminal_width?: number;
  session_id?: string;
  cwd?: string;
}

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SubagentInfo {
  name: string;
  role: string;
  status: string;
}

export interface ParsedMetrics {
  agentState: string;
  contextUsage: number;
  totalInputTokens: number;
  cacheTokens: number;
  exceeds200k: boolean;
  quotaWeekly: number;
  quotaWeeklyResetSeconds: number;
  quota5h: number;
  quota5hResetSeconds: number;
  quotaType: string;
  subagents: SubagentInfo[];
  taskCount: number;
  sessionName: string;
  model: string;
  workspace: string;
  isSandboxed: boolean;
  terminalWidth: number;
  version: string;
  email: string;
  planTier: string;
  skipPermissions: boolean;
}

export async function parseStream(stream: NodeJS.ReadableStream): Promise<ParsedMetrics> {
  let data = '';
  let bytesRead = 0;
  const MAX_PAYLOAD_BYTES = 500 * 1024; // 500 KB limit
  
  for await (const chunk of stream) {
    data += chunk;
    bytesRead += chunk.length;
    if (bytesRead > MAX_PAYLOAD_BYTES) {
      throw new Error('Payload exceeded maximum size limit');
    }
  }

  if (!data.trim()) throw new Error('Empty or invalid payload');

  let parsed: Partial<AntigravityPayload>;
  try {
    parsed = JSON.parse(data) as Partial<AntigravityPayload>;
  } catch (e) {
    throw new Error('Failed to parse JSON');
  }

  if (!parsed || typeof parsed !== 'object') throw new Error('Missing required metrics in payload');

  const getQuotaObj = (key: string) => {
    const q = parsed.quota && parsed.quota[key];
    if (!q) return { percent: 0, resetSeconds: 0 };
    return {
      percent: Math.round((1 - (q.remaining_fraction || 0)) * 100),
      resetSeconds: q.reset_in_seconds || 0
    };
  };

  const sessName = parsed.session_id ? parsed.session_id.substring(0, 6) : 'Unknown';
  let modelName = parsed.model?.display_name || 'Unknown Model';
  if (modelName.length > 25) modelName = modelName.substring(0, 22) + '...';
  let workspaceName = parsed.cwd ? path.basename(parsed.cwd) : 'Unknown Workspace';

  const isGemini = modelName.toLowerCase().includes('gemini');
  const qWeeklyObj = isGemini ? getQuotaObj('gemini-weekly') : getQuotaObj('3p-weekly');
  const q5hObj = isGemini ? getQuotaObj('gemini-5h') : getQuotaObj('3p-5h');

  const widthFile = path.join(os.homedir(), '.gemini', 'hud_width.cache');
  let oldWidth = 80;
  
  try {
    if (fs.existsSync(widthFile)) {
      oldWidth = parseInt(fs.readFileSync(widthFile, 'utf8')) || 80;
    }
  } catch(e) {
    // Silently ignore cache read errors to prevent console output from corrupting the HUD layout
  }
  
  let termWidth = oldWidth;

  if (parsed.terminal_width && parsed.terminal_width > 0) {
    const newWidth = parsed.terminal_width;
    // Hysteresis filter: Ignore micro-fluctuations (< 5 columns) caused by UI padding bugs
    if (Math.abs(newWidth - oldWidth) > 5) {
      termWidth = newWidth;
      try { 
        if (!fs.existsSync(path.dirname(widthFile))) {
          fs.mkdirSync(path.dirname(widthFile), { recursive: true });
        }
        fs.writeFileSync(widthFile, termWidth.toString(), { mode: 0o600 }); 
      } catch(e) {
        // Silently ignore cache write errors
      }
    }
  }

  return {
    agentState: (parsed.agent_state || 'UNKNOWN').toUpperCase(),
    contextUsage: Math.round(parsed.context_window?.used_percentage || 0),
    totalInputTokens: parsed.context_window?.total_input_tokens || 0,
    cacheTokens: parsed.context_window?.current_usage?.cache_read_input_tokens || 0,
    exceeds200k: !!parsed.exceeds_200k_tokens,
    quotaWeekly: qWeeklyObj.percent,
    quotaWeeklyResetSeconds: qWeeklyObj.resetSeconds,
    quota5h: q5hObj.percent,
    quota5hResetSeconds: q5hObj.resetSeconds,
    quotaType: isGemini ? 'Gemini' : '3rd-Party',
    subagents: (parsed.subagents || []).filter((s: any) => s.status !== 'completed'),
    taskCount: parsed.task_count || 0,
    sessionName: sessName,
    model: modelName,
    workspace: workspaceName,
    isSandboxed: !!parsed.sandbox?.enabled,
    version: parsed.version || 'unknown',
    email: parsed.email || 'unknown',
    planTier: parsed.plan_tier || 'Unknown Tier',
    terminalWidth: termWidth,
    skipPermissions: process.env.AGY_SKIP_PERMISSIONS === 'true'
  };
}
