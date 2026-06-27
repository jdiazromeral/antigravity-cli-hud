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
  artifacts?: any[];
}

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as cp from 'child_process';

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
  gitBranches: { name: string, branch: string }[];
  artifactCount: number;
  conversationId?: string;
  artifacts?: string[];
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

  const conversationId = parsed.conversation_id || parsed.session_id;

  const getQuotaObj = (key: string) => {
    const q = parsed.quota && parsed.quota[key as keyof typeof parsed.quota];
    if (!q) return { percent: 0, resetSeconds: 0 };
    return {
      percent: Math.round((1 - (q.remaining_fraction || 0)) * 100),
      resetSeconds: q.reset_in_seconds || 0
    };
  };

  const sessName = parsed.session_id ? parsed.session_id.substring(0, 6) : 'Unknown';
  let modelName = parsed.model?.display_name || 'Unknown Model';
  if (modelName.length > 25) modelName = modelName.substring(0, 22) + '...';

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

  let gitBranches: {name: string, branch: string}[] = [];

  if (parsed.cwd) {
    const gitCacheFile = path.join(os.homedir(), '.gemini', 'hud_git.cache');
    let useCache = false;

    try {
      if (fs.existsSync(gitCacheFile)) {
        const cacheRaw = fs.readFileSync(gitCacheFile, 'utf8');
        const cacheData = JSON.parse(cacheRaw);
        // Use cache if it's less than 2 seconds old and cwd matches
        if (cacheData.cwd === parsed.cwd && (Date.now() - cacheData.timestamp) < 2000) {
          gitBranches = cacheData.gitBranches || [];
          useCache = true;
        }
      }
    } catch(e) {}

    if (!useCache) {
      try {
        let targetDir = parsed.cwd;
        // Check if current dir is a git repo
        try {
          cp.execSync('git rev-parse --is-inside-work-tree', { cwd: targetDir, stdio: 'ignore', timeout: 50 });
          // If it is, just use it
          const b = cp.execSync('git rev-parse --abbrev-ref HEAD', { cwd: targetDir, stdio: 'pipe', timeout: 50 }).toString().trim();
          const gitCommonDir = cp.execSync('git rev-parse --git-common-dir', { cwd: targetDir, stdio: 'pipe', timeout: 50 }).toString().trim();
          if (gitCommonDir) {
            const r = path.basename(path.dirname(path.resolve(targetDir, gitCommonDir)));
            gitBranches.push({ name: r, branch: b });
          }
        } catch (e) {
          // If not inside a git repo, determine active subdirectories
          const activeRepos: string[] = [];
          
          // 1. Session-based Explicit Targeting (AI-driven)
          if (conversationId) {
             const sessionContextFile = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'brain', conversationId, 'hud_context.json');
             if (fs.existsSync(sessionContextFile)) {
                try {
                  const targetDirs = JSON.parse(fs.readFileSync(sessionContextFile, 'utf8'));
                  if (Array.isArray(targetDirs)) {
                     for (const d of targetDirs) {
                       const p = path.join(targetDir, d);
                       if (fs.existsSync(path.join(p, '.git'))) activeRepos.push(p);
                     }
                  }
                } catch(err) {}
             }
          }

          // 2. Fallback: Auto-Detect dirty Git trees
          if (activeRepos.length === 0) {
            const dirs = fs.readdirSync(targetDir, { withFileTypes: true }).filter((d: any) => d.isDirectory() && !d.name.startsWith('.'));
            const now = Date.now();
            
            for (const d of dirs) {
              const p = path.join(targetDir, d.name);
              
              if (d.name === 'lab' || d.name === 'worktrees') {
                try {
                  const subDirs = fs.readdirSync(p, { withFileTypes: true }).filter((sd: any) => sd.isDirectory() && !sd.name.startsWith('.'));
                  for (const sd of subDirs) {
                    const subP = path.join(p, sd.name);
                    const subGitDir = path.join(subP, '.git');
                    if (fs.existsSync(subGitDir)) {
                      try {
                        const stat = fs.statSync(subGitDir).mtimeMs;
                        if (now - stat < 60 * 60 * 1000) { 
                          activeRepos.push(subP);
                          continue;
                        }
                        const status = cp.execSync('git status --porcelain', { cwd: subP, stdio: 'pipe', timeout: 100 }).toString().trim();
                        if (status.length > 0) {
                          activeRepos.push(subP);
                        }
                      } catch(err) {}
                    }
                  }
                } catch(e) {}
                continue;
              }

              const gitDir = path.join(p, '.git');
              if (fs.existsSync(gitDir)) {
                try {
                  const stat = fs.statSync(gitDir).mtimeMs;
                  if (now - stat < 60 * 60 * 1000) { 
                    activeRepos.push(p);
                    continue;
                  }
                  
                  const status = cp.execSync('git status --porcelain', { cwd: p, stdio: 'pipe', timeout: 100 }).toString().trim();
                  if (status.length > 0) {
                    activeRepos.push(p);
                  }
                } catch (err) {}
              }
            }
          }

          if (activeRepos.length > 0) {
            for (const p of activeRepos) {
               try {
                 const b = cp.execSync('git rev-parse --abbrev-ref HEAD', { cwd: p, stdio: 'pipe', timeout: 50 }).toString().trim();
                 const cDir = cp.execSync('git rev-parse --git-common-dir', { cwd: p, stdio: 'pipe', timeout: 50 }).toString().trim();
                 const r = path.basename(path.dirname(path.resolve(p, cDir)));
                 gitBranches.push({ name: r, branch: b });
               } catch(err) {}
            }
          }
        }
      } catch (e) {
        gitBranches = [];
      }

      // Write to cache safely
      try {
        fs.writeFileSync(gitCacheFile, JSON.stringify({
          cwd: parsed.cwd,
          gitBranches,
          timestamp: Date.now()
        }), { mode: 0o600 });
      } catch (e) {}
    }
  }
  
  let workspaceName = parsed.cwd ? path.basename(parsed.cwd) : 'Unknown Workspace';

  const artifactCount = typeof parsed.artifact_count === 'number' ? parsed.artifact_count : 0;
  
  let artifactList: string[] = [];
  if (conversationId) {
    const brainDir = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'brain', conversationId);
    if (fs.existsSync(brainDir)) {
      try {
        const files = fs.readdirSync(brainDir, { withFileTypes: true });
        for (const f of files) {
          if (f.isFile() && f.name.endsWith('.md')) {
             artifactList.push(f.name);
          }
        }
      } catch(e) {}
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
    skipPermissions: process.env.AGY_SKIP_PERMISSIONS === 'true',
    gitBranches,
    artifactCount,
    conversationId,
    artifacts: artifactList
  };
}
