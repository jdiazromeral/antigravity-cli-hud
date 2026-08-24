export interface AntigravityPayload {
  agent_state: string;
  conversation_id?: string | undefined;
  context_window?: {
    used_percentage: number;
    total_input_tokens: number;
    context_window_size?: number | undefined;
    current_usage?: {
      cache_read_input_tokens: number;
    } | undefined;
  } | undefined;
  quota?: {
    "gemini-weekly"?: { remaining_fraction: number; reset_in_seconds?: number | undefined } | undefined;
    "gemini-5h"?: { remaining_fraction: number; reset_in_seconds?: number | undefined } | undefined;
    "3p-weekly"?: { remaining_fraction: number; reset_in_seconds?: number | undefined } | undefined;
    "3p-5h"?: { remaining_fraction: number; reset_in_seconds?: number | undefined } | undefined;
  } | undefined;
  subagents?: Array<{ name: string; role: string; status: string; depth?: number | undefined; conversation_id?: string | undefined; log_uri?: string | undefined }> | undefined;
  tool_info?: {
    name: string;
    summary?: string | undefined;
    status?: string | undefined;
    query?: string | undefined;
    action?: string | undefined;
    taskId?: string | undefined;
    task_id?: string | undefined;
  } | undefined;
  task_count?: number | undefined;
  sandbox?: { enabled: boolean } | undefined;
  model?: { display_name: string } | undefined;
  workspace?: { project_dir: string } | undefined;
  exceeds_200k_tokens?: boolean | undefined;
  version?: string | undefined;
  email?: string | undefined;
  plan_tier?: string | undefined;
  terminal_width?: number | undefined;
  session_id?: string | undefined;
  cwd?: string | undefined;
  artifact_count?: number | undefined;
  artifacts?: unknown[] | undefined;
  vcs?: { branch?: string | undefined; dirty?: boolean | undefined } | undefined;
  transcript_path?: string | undefined;
  effort?: string | undefined;
  mode?: string | undefined;
  agent?: string | undefined;
  step_count?: number | undefined;
  step_index?: number | undefined;
  max_steps?: number | undefined;
  max_context_tokens?: number | undefined;
  editor_mode?: string | undefined;
  credits?: { balance: number } | undefined;
  dangerously_skip_permissions?: boolean | undefined;
  skip_permissions?: boolean | undefined;
  is_api_key?: boolean | undefined;
  api_key_mode?: boolean | undefined;
}

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as cp from 'child_process';

export interface SubagentInfo {
  name: string;
  role: string;
  status: string;
  depth?: number | undefined;
  conversationId?: string | undefined;
  logUri?: string | undefined;
}

export interface ActiveToolInfo {
  name: string;
  summary?: string | undefined;
  status?: string | undefined;
  query?: string | undefined;
  action?: string | undefined;
}

export interface ActiveRuleInfo {
  name: string;
  path: string;
  scope: 'project' | 'workspace' | 'global';
}

export interface GitStats {
  added: number;
  deleted: number;
  filesModified: number;
  ahead: number;
  behind: number;
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
  activeTool?: ActiveToolInfo | undefined;
  activeSkills: string[];
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
  gitBranches: { name: string, branch: string, path?: string | undefined }[];
  artifactCount: number;
  conversationId?: string | undefined;
  artifacts?: string[] | undefined;
  looperMissions?: {repo: string, epic: string, mission: string, status: string, iteration?: number | undefined, maxIterations?: number | undefined, reason?: string | undefined}[] | undefined;
  looperEpics?: {repo: string, epic: string, total: number, done: number}[] | undefined;
  stepCount: number;
  maxSteps: number;
  maxContextTokens: number;
  contextWindowSize?: number | undefined;
  executionMode: string;
  transcriptPath?: string | undefined;
  effort: string;
  agentName: string;
  editorMode?: string | undefined;
  credits?: number | undefined;
  isApiKey?: boolean | undefined;
  customBlocks?: Record<string, string> | undefined;
  mcpServers?: string[] | undefined;
  mcpConfigPath?: string | undefined;
  activeRules?: ActiveRuleInfo[] | undefined;
  activePlugins?: string[] | undefined;
  sessionElapsedSeconds?: number | undefined;
  toolElapsedSeconds?: number | undefined;
  gitStats?: GitStats | undefined;
  clickableLinks?: boolean | undefined;
}

interface TranscriptCacheEntry {
  mtimeMs: number;
  count: number;
}

const transcriptStepCache = new Map<string, TranscriptCacheEntry>();

function isSafeIdentifier(id: unknown): id is string {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id) && !id.includes('..') && !id.includes('/') && !id.includes('\\');
}

function countTranscriptSteps(filePath: string): number {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size === 0) {
      return 0;
    }
    const cached = transcriptStepCache.get(filePath);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return cached.count;
    }

    // Zero-disk DoS prevention: Cap memory read to 2MB on real-time render path
    const MAX_READ_BYTES = 2 * 1024 * 1024;
    let content = '';
    if (stat.size > MAX_READ_BYTES) {
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(MAX_READ_BYTES);
      fs.readSync(fd, buffer, 0, MAX_READ_BYTES, stat.size - MAX_READ_BYTES);
      fs.closeSync(fd);
      content = buffer.toString('utf8');
    } else {
      content = fs.readFileSync(filePath, 'utf8');
    }

    // Count user turns specifically ("type":"USER_INPUT" or "type":"USER_EXPLICIT")
    const userTurns = (content.match(/"type"\s*:\s*"USER_(?:INPUT|EXPLICIT)"/g) || []).length;

    transcriptStepCache.set(filePath, {
      mtimeMs: stat.mtimeMs,
      count: userTurns
    });

    return userTurns;
  } catch (e) {
    return 0;
  }
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

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Missing required metrics in payload');

  const rawConvId = typeof parsed.conversation_id === 'string' ? parsed.conversation_id : (typeof parsed.session_id === 'string' ? parsed.session_id : undefined);
  const conversationId = isSafeIdentifier(rawConvId) ? rawConvId : undefined;

  const rawPlanTier = typeof parsed.plan_tier === 'string' ? parsed.plan_tier : '';
  const rawEmail = typeof parsed.email === 'string' ? parsed.email : '';
  const planTierLower = rawPlanTier.toLowerCase();
  const emailLower = rawEmail.toLowerCase();

  const hasApiKeyIndicator = !!(
    parsed.is_api_key ||
    parsed.api_key_mode ||
    (parsed as any).is_api_key_mode ||
    planTierLower.includes('api_key') ||
    planTierLower.includes('api-key') ||
    planTierLower.includes('api key') ||
    planTierLower.includes('gemini_api_key') ||
    emailLower.includes('api_key') ||
    emailLower.includes('api-key') ||
    emailLower.includes('api key') ||
    emailLower.includes('gemini_api_key') ||
    emailLower === '<api-key>'
  );

  let hasValidQuotaInPayload = false;
  if (parsed.quota && typeof parsed.quota === 'object' && !Array.isArray(parsed.quota)) {
    const quotaEntries = Object.values(parsed.quota);
    for (const qVal of quotaEntries) {
      if (qVal && typeof qVal === 'object' && !Array.isArray(qVal)) {
        if (typeof (qVal as any).remaining_fraction === 'number' || typeof (qVal as any).reset_in_seconds === 'number') {
          hasValidQuotaInPayload = true;
          break;
        }
      }
    }
  }

  const isApiKey = !!(hasApiKeyIndicator || (!hasValidQuotaInPayload && !parsed.credits));

  const getQuotaObj = (key: string) => {
    if (isApiKey) {
      return { percent: 0, resetSeconds: 0 };
    }
    let q: any;
    if (parsed.quota && typeof parsed.quota === 'object' && !Array.isArray(parsed.quota)) {
      q = (parsed.quota as Record<string, any>)[key];
    }
    
    // Instant Hydration Fallback: If quota is missing, try to read from our headless cache
    const quotaCacheFile = path.join(os.homedir(), '.gemini', 'hud_quota.cache');
    if (!q) {
      try {
        if (fs.existsSync(quotaCacheFile)) {
          const cacheRaw = fs.readFileSync(quotaCacheFile, 'utf8');
          const cacheData = JSON.parse(cacheRaw);
          if (cacheData && cacheData.quota && cacheData.quota[key]) {
            q = cacheData.quota[key];
          }
        }
      } catch (e) {
        // Silently ignore cache read errors
      }
      
      // Asynchronously fetch quota using the new 1.1.11 non-interactive print mode
      try {
         const fileStat = fs.existsSync(quotaCacheFile) ? fs.statSync(quotaCacheFile) : null;
         const isStale = !fileStat || (Date.now() - fileStat.mtimeMs > 60000); // 1 minute cache
         
         if (isStale) {
           // touch the file immediately to prevent concurrent spawns
           fs.writeFileSync(quotaCacheFile, fs.existsSync(quotaCacheFile) ? fs.readFileSync(quotaCacheFile, 'utf8') : '{}', { mode: 0o600 });
           
           const outFd = fs.openSync(quotaCacheFile, 'w');
           const subprocess = cp.spawn('agy', ['-p', '/quota', '--output-format', 'json'], {
             detached: true,
             stdio: ['ignore', outFd, 'ignore']
           });
           subprocess.unref();
         }
      } catch (e) {}
    }

    if (!q || typeof q !== 'object' || Array.isArray(q)) return { percent: 0, resetSeconds: 0 };
    const resetSeconds = typeof q.reset_in_seconds === 'number' && q.reset_in_seconds > 0 ? q.reset_in_seconds : 0;
    const remFrac = typeof q.remaining_fraction === 'number' ? q.remaining_fraction : 1;
    const percent = resetSeconds <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((1 - remFrac) * 100)));
    return { percent, resetSeconds };
  };

  const rawSessId = isSafeIdentifier(parsed.session_id) ? parsed.session_id : (isSafeIdentifier(parsed.conversation_id) ? parsed.conversation_id : '');
  const sessName = rawSessId ? rawSessId.substring(0, 6) : 'Unknown';
  let modelName = (parsed.model && typeof parsed.model === 'object' && !Array.isArray(parsed.model) && typeof parsed.model.display_name === 'string') ? parsed.model.display_name : 'Unknown Model';
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

  const cwd = typeof parsed.cwd === 'string' ? parsed.cwd : undefined;
  const vcsObj = (parsed.vcs && typeof parsed.vcs === 'object' && !Array.isArray(parsed.vcs)) ? parsed.vcs : undefined;

  let gitBranches: {name: string, branch: string, path?: string}[] = [];
  let gitStats: GitStats | undefined = undefined;

  const activeWorkspaceRepos: string[] = [];
  
  if (cwd) {
    if (vcsObj && typeof vcsObj.branch === 'string') {
      const b = vcsObj.dirty ? `${vcsObj.branch}*` : vcsObj.branch;
      gitBranches.push({ name: path.basename(cwd), branch: b, path: cwd });
    } else {
      const sessionSuffix = conversationId ? `_${conversationId}` : '';
      const gitCacheFile = path.join(os.homedir(), '.gemini', `hud_git${sessionSuffix}.cache`);
      let useCache = false;

    let previousCacheBranches: {name: string, branch: string, path?: string}[] | null = null;

    if (conversationId) {
       const sessionContextFile = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'brain', conversationId, 'hud_context.json');
       if (fs.existsSync(sessionContextFile)) {
          try {
            const targetDirs = JSON.parse(fs.readFileSync(sessionContextFile, 'utf8'));
            if (Array.isArray(targetDirs)) {
               for (const d of targetDirs) {
                 const p = path.join(cwd, d);
                 if (!activeWorkspaceRepos.includes(p)) activeWorkspaceRepos.push(p);
               }
            }
          } catch(err) {}
       }
    }

    try {
      if (fs.existsSync(gitCacheFile)) {
        const cacheRaw = fs.readFileSync(gitCacheFile, 'utf8');
        const cacheData = JSON.parse(cacheRaw);
        previousCacheBranches = cacheData.gitBranches || [];
        if (cacheData.gitStats) {
          gitStats = cacheData.gitStats;
        }
        // Use cache if it's less than 5 seconds old, cwd matches, and session matches
        if (cacheData.cwd === parsed.cwd && (!conversationId || cacheData.conversationId === conversationId) && (Date.now() - cacheData.timestamp) < 5000) {
          gitBranches = previousCacheBranches || [];
          useCache = true;
        }
      }
    } catch(e) {}

    if (!useCache) {
      try {
        const targetDir = parsed.cwd;
        if (targetDir) {
          // Check if current dir is a git repo
          try {
            cp.execSync('git rev-parse --is-inside-work-tree', { cwd: targetDir, stdio: 'ignore', timeout: 200 });
            // If it is, just use it
            const b = cp.execSync('git rev-parse --abbrev-ref HEAD', { cwd: targetDir, stdio: 'pipe', timeout: 200 }).toString().trim();
            const gitCommonDir = cp.execSync('git rev-parse --git-common-dir', { cwd: targetDir, stdio: 'pipe', timeout: 200 }).toString().trim();
            if (gitCommonDir) {
              const r = path.basename(path.dirname(path.resolve(targetDir, gitCommonDir)));
              gitBranches.push({ name: r, branch: b, path: path.resolve(targetDir) });
            }
          } catch (e) {
            // If not inside a git repo, use the activeWorkspaceRepos
            if (activeWorkspaceRepos.length > 0) {
              for (const p of activeWorkspaceRepos) {
                 try {
                   const b = cp.execSync('git rev-parse --abbrev-ref HEAD', { cwd: p, stdio: 'pipe', timeout: 200 }).toString().trim();
                   const cDir = cp.execSync('git rev-parse --git-common-dir', { cwd: p, stdio: 'pipe', timeout: 200 }).toString().trim();
                   const r = path.basename(path.dirname(path.resolve(p, cDir)));
                   gitBranches.push({ name: r, branch: b, path: path.resolve(p) });
                 } catch(err) {}
              }
            }
          }
        }
      } catch (e) {
        gitBranches = previousCacheBranches || [];
      }

      // Write to cache safely
      try {
        fs.writeFileSync(gitCacheFile, JSON.stringify({
          cwd: parsed.cwd,
          conversationId,
          gitBranches,
          gitStats,
          timestamp: Date.now()
        }), { mode: 0o600 });
      } catch (e) {}
    }
    }
  }

  let looperMissions: {repo: string, epic: string, mission: string, status: string, iteration?: number | undefined, maxIterations?: number | undefined, reason?: string | undefined}[] = [];
  let looperEpics: {repo: string, epic: string, total: number, done: number}[] = [];
  if (cwd) {
    const sessionSuffix = conversationId ? `_${conversationId}` : '';
    const looperCacheFile = path.join(os.homedir(), '.gemini', `hud_looper${sessionSuffix}.cache`);
    let useLooperCache = false;
    let prevLooperCache: any[] | null = null;
    let prevEpicsCache: any[] | null = null;
    try {
      if (fs.existsSync(looperCacheFile)) {
        const cRaw = fs.readFileSync(looperCacheFile, 'utf8');
        const cData = JSON.parse(cRaw);
        prevLooperCache = cData.looperMissions || [];
        prevEpicsCache = cData.looperEpics || [];
        if (cData.cwd === cwd && (!conversationId || cData.conversationId === conversationId) && (Date.now() - cData.timestamp) < 5000) {
          looperMissions = prevLooperCache || [];
          looperEpics = prevEpicsCache || [];
          useLooperCache = true;
        }
      }
    } catch(e) {}

    if (!useLooperCache) {
      try {
        const repoRoots: string[] = [];
        const targetDir = parsed.cwd;

        if (activeWorkspaceRepos.length > 0) {
           for (const p of activeWorkspaceRepos) {
              if (!repoRoots.includes(p)) repoRoots.push(p);
           }
        } else if (targetDir) {
          try {
            const root = cp.execSync('git rev-parse --show-toplevel', { cwd: targetDir, stdio: 'pipe', timeout: 200 }).toString().trim();
            if (root && fs.existsSync(path.join(root, '.looper'))) {
              repoRoots.push(root);
            }
          } catch(e) {}

          if (repoRoots.length === 0 && fs.existsSync(path.join(targetDir, '.looper'))) {
            repoRoots.push(targetDir);
          }
        }

        for (const r of repoRoots) {
          const repoName = path.basename(r);
          const looperDir = path.join(r, '.looper', 'epics');
          if (fs.existsSync(looperDir)) {
            const epics = fs.readdirSync(looperDir, { withFileTypes: true });
            for (const ep of epics) {
              if (ep.isDirectory() && !ep.name.startsWith('.')) {
                const epicPath = path.join(looperDir, ep.name);
                const epicMdPath = path.join(epicPath, 'epic.md');
                if (fs.existsSync(epicMdPath)) {
                  try {
                    const content = fs.readFileSync(epicMdPath, 'utf8');
                    const totalMissions = (content.match(/^##\s+\[[A-Za-z0-9_-]+\]/gm) || []).length;
                    if (totalMissions > 0) {
                      const doneMissions = (content.match(/^-\s+\*\*Status\*\*:\s*DONE/gim) || []).length;
                      if (doneMissions < totalMissions) {
                        looperEpics.push({ repo: repoName, epic: ep.name, total: totalMissions, done: doneMissions });
                      }
                    }
                  } catch(e) {}
                }
                const files = fs.readdirSync(epicPath);
                for (const f of files) {
                  if (f.endsWith('_purpose.md')) {
                    const content = fs.readFileSync(path.join(epicPath, f), 'utf8');
                    const statusMatch = content.match(/^status:\s*([A-Z_]+)/m);
                    if (statusMatch && statusMatch[1] && statusMatch[1] !== 'DONE') {
                      const missionId = f.replace('_purpose.md', '');
                      const status = statusMatch[1];
                      
                      const maxMatch = content.match(/^max_iterations:\s*(\d+)/m);
                      const maxIterations = maxMatch && maxMatch[1] ? parseInt(maxMatch[1], 10) : 8;
                      
                      let iteration = 0;
                      let reason: string | undefined = undefined;
                      
                      const recordsPath = path.join(epicPath, 'records');
                      if (fs.existsSync(recordsPath)) {
                        try {
                          const recordFiles = fs.readdirSync(recordsPath).filter((rf: string) => rf.startsWith(missionId + '_') && rf.endsWith('_record_file.md'));
                          if (recordFiles.length > 0 && recordFiles[recordFiles.length - 1]) {
                            recordFiles.sort();
                            const lastRecordFile = recordFiles[recordFiles.length - 1]!;
                            const recordContent = fs.readFileSync(path.join(recordsPath, lastRecordFile), 'utf8');
                            iteration = (recordContent.match(/^## Iteration/gm) || []).length;
                            
                            if (status === 'BLOCKED' || status === 'FAILED') {
                               const verdictMatch = recordContent.match(/-\s+Verdict:\s*(.*)/i);
                               const validatorMatch = recordContent.match(/-\s+Validator:\s*(.*)/i);
                               if (verdictMatch && verdictMatch[1] && verdictMatch[1].toLowerCase().includes('blocked')) {
                                 const r = verdictMatch[1].match(/blocked\((.*?)\)/i);
                                 if (r && r[1]) reason = r[1].trim();
                               } else if (validatorMatch && validatorMatch[1] && validatorMatch[1].toLowerCase().includes('fail')) {
                                 let raw = validatorMatch[1].replace(/fail/i, '').trim();
                                 if (raw.startsWith('(')) raw = raw.substring(1);
                                 if (raw.endsWith(')')) raw = raw.substring(0, raw.length - 1);
                                 reason = raw.trim();
                               }
                               if (reason && reason.length > 30) reason = reason.substring(0, 27) + '...';
                            }
                          }
                        } catch(e) {}
                      }
                      
                      looperMissions.push({ repo: repoName, epic: ep.name, mission: missionId, status, iteration, maxIterations, reason });
                    }
                  } else if (f.endsWith('.json')) {
                    try {
                      const content = fs.readFileSync(path.join(epicPath, f), 'utf8');
                      const state = JSON.parse(content);
                      if (state.status && state.status !== 'DONE') {
                        const missionId = state.mission_id || f.replace('.json', '');
                        looperMissions.push({ repo: repoName, epic: ep.name, mission: missionId, status: state.status, iteration: state.iteration, maxIterations: state.max_iterations });
                      }
                    } catch(e) {}
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        looperMissions = prevLooperCache || [];
        looperEpics = prevEpicsCache || [];
      }

      try {
        fs.writeFileSync(looperCacheFile, JSON.stringify({
          cwd,
          conversationId,
          looperMissions,
          looperEpics,
          timestamp: Date.now()
        }), { mode: 0o600 });
      } catch(e) {}
    }
  }

  let executionMode = typeof parsed.mode === 'string' ? parsed.mode : 'request-review';
  if (!parsed.mode) {
    try {
      const settingsFile = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'settings.json');
      if (fs.existsSync(settingsFile)) {
        const settingsContent = fs.readFileSync(settingsFile, 'utf8');
        const settingsParsed = JSON.parse(settingsContent);
        if (settingsParsed && typeof settingsParsed.mode === 'string') {
          executionMode = settingsParsed.mode;
        }
      }
    } catch (e) {
      // Ignore errors and default to request-review
    }
  }
  
  const workspaceName = cwd ? path.basename(cwd) : 'Unknown Workspace';

  const artifactCount = typeof parsed.artifact_count === 'number' ? parsed.artifact_count : 0;
  
  const artifactList: string[] = [];
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

  let effort = typeof parsed.effort === 'string' ? parsed.effort : 'normal';
  const lModel = modelName.toLowerCase();
  if (lModel.includes('(epic)')) effort = 'epic';
  else if (lModel.includes('(high)')) effort = 'high';
  else if (lModel.includes('(normal)')) effort = 'normal';
  else if (lModel.includes('(low)')) effort = 'low';
  const defaultAgent = process.env.AGY_AGENT_NAME || process.env.AGENT_NAME || 'TARS';
  const agentName = typeof parsed.agent === 'string' ? parsed.agent : defaultAgent;

  const toolInfoObj = (parsed.tool_info && typeof parsed.tool_info === 'object' && !Array.isArray(parsed.tool_info) && typeof parsed.tool_info.name === 'string') ? parsed.tool_info : undefined;

  let activeTool: ActiveToolInfo | undefined = undefined;
  if (toolInfoObj) {
    let summary = typeof toolInfoObj.summary === 'string' && toolInfoObj.summary.trim() ? toolInfoObj.summary.trim() : undefined;
    const query = typeof toolInfoObj.query === 'string' && toolInfoObj.query.trim() ? toolInfoObj.query.trim() : undefined;
    const action = typeof toolInfoObj.action === 'string' && toolInfoObj.action.trim() ? toolInfoObj.action.trim() : undefined;
    const taskId = (typeof toolInfoObj.taskId === 'string' && toolInfoObj.taskId.trim())
      ? toolInfoObj.taskId.trim()
      : ((typeof toolInfoObj.task_id === 'string' && toolInfoObj.task_id.trim()) ? toolInfoObj.task_id.trim() : undefined);

    if (!summary) {
      if (query) {
        summary = query;
      } else if (action) {
        const actLower = action.toLowerCase();
        if (actLower === 'kill') {
          summary = taskId ? `Killed task ${taskId}` : 'Killed task';
        } else if (actLower === 'status' || actLower === 'check') {
          summary = taskId ? `Checked task ${taskId}` : 'Checked task';
        } else if (actLower === 'list') {
          summary = 'Listed tasks';
        } else if (actLower === 'send_input') {
          summary = taskId ? `Sent input to task ${taskId}` : 'Sent input to task';
        } else {
          summary = taskId ? `${action} task ${taskId}` : action;
        }
      }
    } else if (query && !summary.includes(query)) {
      summary = `${summary}: ${query}`;
    }

    activeTool = {
      name: toolInfoObj.name,
      summary,
      status: typeof toolInfoObj.status === 'string' ? toolInfoObj.status : undefined,
      query,
      action
    };
  }

  const skillsSet = new Set<string>();
  if (activeTool && typeof activeTool.summary === 'string') {
    const skillMatch = activeTool.summary.match(/skills\/([a-zA-Z0-9_-]+)\/SKILL\.md/i);
    if (skillMatch && skillMatch[1]) {
      skillsSet.add(skillMatch[1]);
    }
  }

  const rawSubagents = Array.isArray(parsed.subagents) ? parsed.subagents : [];
  for (const sub of rawSubagents) {
    if (!sub || typeof sub !== 'object' || Array.isArray(sub)) continue;
    if (sub.status === 'completed') continue;
    const roleLower = (typeof sub.role === 'string' ? sub.role : '').toLowerCase();
    const nameLower = (typeof sub.name === 'string' ? sub.name : '').toLowerCase();
    
    if (roleLower.includes('tdd') || nameLower.includes('tdd')) skillsSet.add('tdd');
    if (roleLower.includes('cartographer') || roleLower.includes('mapper') || nameLower.includes('mapper')) skillsSet.add('mapper');
    if (roleLower.includes('looper') || roleLower.includes('mission worker') || nameLower.includes('looper')) skillsSet.add('looper');
    if (roleLower.includes('retro') || nameLower.includes('retro')) skillsSet.add('retro');
    if (roleLower.includes('epic planner') || roleLower.includes('planner')) skillsSet.add('epic-planner');
    if (roleLower.includes('epic runner') || roleLower.includes('runner')) skillsSet.add('epic-runner');
    if (roleLower.includes('hud-config') || roleLower.includes('hud config')) skillsSet.add('hud-config');
    
    if (typeof sub.role === 'string') {
      const roleMatch = sub.role.match(/skill:\s*([a-zA-Z0-9_-]+)/i);
      if (roleMatch && roleMatch[1]) skillsSet.add(roleMatch[1]);
    }
  }
  if (looperMissions.length > 0 || looperEpics.length > 0) {
    skillsSet.add('looper');
  }
  const activeSkills = Array.from(skillsSet);

  const parsedSubagents: SubagentInfo[] = [];
  for (const s of rawSubagents) {
    if (!s || typeof s !== 'object' || Array.isArray(s)) continue;
    if (s.status === 'completed') continue;
    parsedSubagents.push({
      name: typeof s.name === 'string' ? s.name : 'Unknown Subagent',
      role: typeof s.role === 'string' ? s.role : 'Worker',
      status: typeof s.status === 'string' ? s.status : 'working',
      depth: typeof s.depth === 'number' && s.depth >= 0 ? s.depth : 0,
      conversationId: typeof s.conversation_id === 'string' ? s.conversation_id : undefined,
      logUri: typeof s.log_uri === 'string' ? s.log_uri : undefined
    });
  }

  let resolvedTranscriptPath = typeof parsed.transcript_path === 'string' ? parsed.transcript_path : undefined;
  if (resolvedTranscriptPath) {
    if (!fs.existsSync(resolvedTranscriptPath)) {
      const normalized = resolvedTranscriptPath.replace('/.gemini/antigravity/', '/.gemini/antigravity-cli/');
      if (fs.existsSync(normalized)) {
        resolvedTranscriptPath = normalized;
      }
    }
  }

  if (!resolvedTranscriptPath && conversationId) {
    const candidate1 = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'brain', conversationId, '.system_generated', 'logs', 'transcript.jsonl');
    const candidate2 = path.join(os.homedir(), '.gemini', 'antigravity', 'brain', conversationId, '.system_generated', 'logs', 'transcript.jsonl');
    if (fs.existsSync(candidate1)) {
      resolvedTranscriptPath = candidate1;
    } else if (fs.existsSync(candidate2)) {
      resolvedTranscriptPath = candidate2;
    }
  }

  let stepCount = 0;
  if (typeof parsed.step_count === 'number') {
    stepCount = parsed.step_count;
  } else if (typeof parsed.step_index === 'number') {
    stepCount = parsed.step_index;
  } else if (resolvedTranscriptPath && fs.existsSync(resolvedTranscriptPath)) {
    stepCount = countTranscriptSteps(resolvedTranscriptPath);
  }

  const envMaxSteps = process.env.AGY_MAX_STEPS ? parseInt(process.env.AGY_MAX_STEPS, 10) : undefined;
  const envMaxCtx = process.env.AGY_MAX_CONTEXT_TOKENS ? parseInt(process.env.AGY_MAX_CONTEXT_TOKENS, 10) : undefined;

  const maxSteps = (envMaxSteps && !isNaN(envMaxSteps)) ? envMaxSteps : (typeof parsed.max_steps === 'number' ? parsed.max_steps : 20);
  const maxContextTokens = (envMaxCtx && !isNaN(envMaxCtx)) ? envMaxCtx : (typeof parsed.max_context_tokens === 'number' ? parsed.max_context_tokens : 0);

  const rawTotalTokens = parsed.context_window?.total_input_tokens;
  const totalInputTokens = typeof rawTotalTokens === 'number' && rawTotalTokens > 0 ? rawTotalTokens : 0;

  const rawUsedPct = parsed.context_window?.used_percentage;
  const contextUsage = typeof rawUsedPct === 'number' && !isNaN(rawUsedPct) ? Math.max(0, Math.min(100, Math.round(rawUsedPct))) : 0;

  const rawCacheTokens = parsed.context_window?.current_usage?.cache_read_input_tokens;
  const cacheTokens = typeof rawCacheTokens === 'number' && rawCacheTokens > 0 ? rawCacheTokens : 0;

  const rawCtxSize = parsed.context_window?.context_window_size;
  const contextWindowSize = (typeof rawCtxSize === 'number' && rawCtxSize > 0) ? rawCtxSize : ((typeof parsed.max_context_tokens === 'number' && parsed.max_context_tokens > 0) ? parsed.max_context_tokens : 1048576);

  const isSandboxed = !!(parsed.sandbox && typeof parsed.sandbox === 'object' && !Array.isArray(parsed.sandbox) && parsed.sandbox.enabled);

  const customBlocks: Record<string, string> = {};
  const hudConfigFile = path.join(os.homedir(), '.gemini', 'hud_config.json');
  if (fs.existsSync(hudConfigFile)) {
    try {
      const configRaw = fs.readFileSync(hudConfigFile, 'utf8');
      const configParsed = JSON.parse(configRaw);
      const customBlocksConfig: Record<string, { title?: string; command: string; intervalMs?: number }> = {};
      
      if (configParsed && typeof configParsed === 'object' && !Array.isArray(configParsed)) {
        if (configParsed.customBlocks && typeof configParsed.customBlocks === 'object' && !Array.isArray(configParsed.customBlocks)) {
          Object.assign(customBlocksConfig, configParsed.customBlocks);
        }
        for (const [k, v] of Object.entries(configParsed)) {
          if (v && typeof v === 'object' && !Array.isArray(v) && typeof (v as any).command === 'string' && k !== 'customBlocks' && k !== 'budget' && k !== 'breakpoints' && k !== 'layouts') {
            customBlocksConfig[k] = v as any;
          }
        }
      }

      for (const [blockKey, blockDef] of Object.entries(customBlocksConfig)) {
        if (!isSafeIdentifier(blockKey)) continue;
        if (!blockDef || typeof blockDef !== 'object' || typeof blockDef.command !== 'string') continue;
        const cacheFile = path.join(os.homedir(), '.gemini', `hud_custom_${blockKey}.cache`);
        const metaFile = path.join(os.homedir(), '.gemini', `hud_custom_${blockKey}.meta`);
        
        if (fs.existsSync(cacheFile)) {
          try {
            customBlocks[blockKey] = fs.readFileSync(cacheFile, 'utf8').trim();
          } catch (e) {}
        }

        const intervalMs = typeof blockDef.intervalMs === 'number' && blockDef.intervalMs > 0 ? blockDef.intervalMs : 5000;
        let isStale = true;
        try {
          if (fs.existsSync(metaFile)) {
            const metaStat = fs.statSync(metaFile);
            if (Date.now() - metaStat.mtimeMs < intervalMs) {
              isStale = false;
            }
          }
        } catch (e) {}

        if (isStale) {
          try {
            if (!fs.existsSync(path.dirname(metaFile))) {
              fs.mkdirSync(path.dirname(metaFile), { recursive: true });
            }
            fs.writeFileSync(metaFile, JSON.stringify({ timestamp: Date.now() }), { mode: 0o600 });
            const cacheTmp = `${cacheFile}.tmp`;
            fs.writeFileSync(cacheTmp, '', { mode: 0o600 });
            const cmd = `(${blockDef.command}) > "${cacheTmp}" 2>/dev/null && mv "${cacheTmp}" "${cacheFile}"`;
            const subprocess = cp.spawn(cmd, {
              shell: true,
              cwd: parsed.cwd || process.cwd(),
              detached: true,
              stdio: 'ignore'
            });
            subprocess.unref();
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

  // 1. Tool Elapsed Timer persistence
  let toolElapsedSeconds = 0;
  if (conversationId) {
    const toolCacheFile = path.join(os.homedir(), '.gemini', `hud_tool_${conversationId}.json`);
    if (activeTool && activeTool.name) {
      try {
        const now = Date.now();
        if (fs.existsSync(toolCacheFile)) {
          const cachedState = JSON.parse(fs.readFileSync(toolCacheFile, 'utf8'));
          if (cachedState.toolName === activeTool.name && cachedState.action === activeTool.action && cachedState.query === activeTool.query) {
            toolElapsedSeconds = Math.max(0, Math.round((now - cachedState.startedAt) / 1000));
          } else {
            fs.writeFileSync(toolCacheFile, JSON.stringify({
              toolName: activeTool.name,
              action: activeTool.action,
              query: activeTool.query,
              startedAt: now
            }), { mode: 0o600 });
          }
        } else {
          fs.writeFileSync(toolCacheFile, JSON.stringify({
            toolName: activeTool.name,
            action: activeTool.action,
            query: activeTool.query,
            startedAt: now
          }), { mode: 0o600 });
        }
      } catch (e) {}
    } else {
      if (fs.existsSync(toolCacheFile)) {
        try { fs.unlinkSync(toolCacheFile); } catch (e) {}
      }
    }
  }

  // 2. MCP Server Configuration Reader
  let mcpServers: string[] | undefined = undefined;
  let mcpConfigPath: string | undefined = undefined;
  const mcpFile = path.join(os.homedir(), '.gemini', 'config', 'mcp_config.json');
  if (fs.existsSync(mcpFile)) {
    mcpConfigPath = mcpFile;
    try {
      const mcpContent = fs.readFileSync(mcpFile, 'utf8');
      const mcpParsed = JSON.parse(mcpContent);
      if (mcpParsed && mcpParsed.mcpServers && typeof mcpParsed.mcpServers === 'object' && !Array.isArray(mcpParsed.mcpServers)) {
        mcpServers = Object.keys(mcpParsed.mcpServers);
      }
    } catch (e) {}
  }

  // 3. Active Rules Discovery
  const activeRules: ActiveRuleInfo[] = [];
  const checkedRuleFiles = new Set<string>();

  if (cwd) {
    const projectAgents = path.join(cwd, 'AGENTS.md');
    if (fs.existsSync(projectAgents) && !checkedRuleFiles.has(projectAgents)) {
      activeRules.push({ name: 'AGENTS.md', path: projectAgents, scope: 'project' });
      checkedRuleFiles.add(projectAgents);
    }
    const projectGemini = path.join(cwd, 'GEMINI.md');
    if (fs.existsSync(projectGemini) && !checkedRuleFiles.has(projectGemini)) {
      activeRules.push({ name: 'GEMINI.md', path: projectGemini, scope: 'project' });
      checkedRuleFiles.add(projectGemini);
    }
  }

  const globalAgents = path.join(os.homedir(), '.gemini', 'AGENTS.md');
  if (fs.existsSync(globalAgents) && !checkedRuleFiles.has(globalAgents)) {
    activeRules.push({ name: 'AGENTS.md', path: globalAgents, scope: 'global' });
    checkedRuleFiles.add(globalAgents);
  }
  const globalGemini = path.join(os.homedir(), '.gemini', 'GEMINI.md');
  if (fs.existsSync(globalGemini) && !checkedRuleFiles.has(globalGemini)) {
    activeRules.push({ name: 'GEMINI.md', path: globalGemini, scope: 'global' });
    checkedRuleFiles.add(globalGemini);
  }

  // 4. Active Plugins Discovery
  let activePlugins: string[] | undefined = undefined;
  const pluginsDir = path.join(os.homedir(), '.gemini', 'config', 'plugins');
  if (fs.existsSync(pluginsDir)) {
    try {
      const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
      const names = entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).map(e => e.name);
      if (names.length > 0) activePlugins = names;
    } catch (e) {}
  }

  // 5. Session Elapsed Seconds
  let sessionElapsedSeconds: number | undefined = undefined;
  if (resolvedTranscriptPath && fs.existsSync(resolvedTranscriptPath)) {
    try {
      const stat = fs.statSync(resolvedTranscriptPath);
      const birthtime = stat.birthtimeMs || stat.ctimeMs || stat.mtimeMs;
      if (birthtime > 0) {
        sessionElapsedSeconds = Math.max(0, Math.round((Date.now() - birthtime) / 1000));
      }
    } catch (e) {}
  }

  return {
    agentState: (typeof parsed.agent_state === 'string' ? parsed.agent_state : 'UNKNOWN').toUpperCase(),
    contextUsage,
    totalInputTokens,
    cacheTokens,
    exceeds200k: !!parsed.exceeds_200k_tokens,
    quotaWeekly: qWeeklyObj.percent,
    quotaWeeklyResetSeconds: qWeeklyObj.resetSeconds,
    quota5h: q5hObj.percent,
    quota5hResetSeconds: q5hObj.resetSeconds,
    quotaType: isGemini ? 'Gemini' : '3rd-Party',
    subagents: parsedSubagents,
    activeTool,
    activeSkills,
    taskCount: typeof parsed.task_count === 'number' && parsed.task_count > 0 ? parsed.task_count : 0,
    sessionName: sessName,
    model: modelName,
    workspace: workspaceName,
    isSandboxed,
    version: typeof parsed.version === 'string' ? parsed.version : 'unknown',
    email: typeof parsed.email === 'string' ? parsed.email : 'unknown',
    planTier: typeof parsed.plan_tier === 'string' ? parsed.plan_tier : (hasApiKeyIndicator ? 'API Key' : 'Unknown Tier'),
    terminalWidth: termWidth,
    skipPermissions: process.env.AGY_SKIP_PERMISSIONS === 'true' || !!parsed.dangerously_skip_permissions || !!parsed.skip_permissions,
    gitBranches,
    artifactCount,
    conversationId,
    artifacts: artifactList,
    looperMissions,
    looperEpics,
    stepCount,
    maxSteps,
    maxContextTokens,
    contextWindowSize,
    executionMode,
    transcriptPath: resolvedTranscriptPath,
    effort,
    agentName,
    editorMode: typeof parsed.editor_mode === 'string' ? parsed.editor_mode : undefined,
    credits: (parsed.credits && typeof parsed.credits === 'object' && !Array.isArray(parsed.credits) && typeof parsed.credits.balance === 'number') ? parsed.credits.balance : undefined,
    isApiKey,
    customBlocks,
    mcpServers,
    mcpConfigPath,
    activeRules: activeRules.length > 0 ? activeRules : undefined,
    activePlugins,
    sessionElapsedSeconds,
    toolElapsedSeconds,
    gitStats
  };
}
