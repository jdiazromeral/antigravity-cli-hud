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
  vcs?: { branch?: string; dirty?: boolean };
  transcript_path?: string;
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
  looperMissions?: {repo: string, epic: string, mission: string, status: string, iteration?: number, maxIterations?: number, reason?: string}[];
  looperEpics?: {repo: string, epic: string, total: number, done: number}[];
  executionMode: string;
  transcriptPath?: string;
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
    const resetSeconds = q.reset_in_seconds || 0;
    const percent = resetSeconds <= 0 ? 0 : Math.round((1 - (q.remaining_fraction || 0)) * 100);
    return { percent, resetSeconds };
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

  let activeWorkspaceRepos: string[] = [];
  
  if (parsed.cwd) {
    if (parsed.vcs && parsed.vcs.branch) {
      const b = parsed.vcs.dirty ? `${parsed.vcs.branch}*` : parsed.vcs.branch;
      gitBranches.push({ name: path.basename(parsed.cwd), branch: b });
    } else {
      const gitCacheFile = path.join(os.homedir(), '.gemini', 'hud_git.cache');
      let useCache = false;

    let previousCacheBranches: {name: string, branch: string}[] | null = null;

    if (conversationId) {
       const sessionContextFile = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'brain', conversationId, 'hud_context.json');
       if (fs.existsSync(sessionContextFile)) {
          try {
            const targetDirs = JSON.parse(fs.readFileSync(sessionContextFile, 'utf8'));
            if (Array.isArray(targetDirs)) {
               for (const d of targetDirs) {
                 const p = path.join(parsed.cwd, d);
                 if (!activeWorkspaceRepos.includes(p)) activeWorkspaceRepos.push(p);
               }
            }
          } catch(err) {}
       }
    }
    
    if (activeWorkspaceRepos.length === 0) {
       const searchRoots = [
          path.join(parsed.cwd, 'lab'),
          path.join(parsed.cwd, 'worktrees')
       ];
       for (const root of searchRoots) {
          if (fs.existsSync(root)) {
             try {
               const items = fs.readdirSync(root, { withFileTypes: true });
               for (const item of items) {
                  if (item.isDirectory() && !item.name.startsWith('.')) {
                     const p = path.join(root, item.name);
                     if (fs.existsSync(path.join(p, '.git')) || fs.existsSync(path.join(p, '.looper'))) {
                        let isActive = false;
                        try {
                           const branch = cp.execSync('git rev-parse --abbrev-ref HEAD', { cwd: p, stdio: 'pipe', timeout: 200 }).toString().trim();
                           if (branch !== 'main' && branch !== 'master' && branch !== 'HEAD') {
                              isActive = true;
                           } else {
                              const status = cp.execSync('git status --porcelain', { cwd: p, stdio: 'pipe', timeout: 200 }).toString().trim();
                              if (status.length > 0) isActive = true;
                           }
                        } catch(e) {}
                        
                        if (!isActive && fs.existsSync(path.join(p, '.looper', 'epics'))) {
                           try {
                              const epics = fs.readdirSync(path.join(p, '.looper', 'epics'), { withFileTypes: true });
                              for (const ep of epics) {
                                 if (ep.isDirectory() && !ep.name.startsWith('.')) {
                                    const epicPath = path.join(p, '.looper', 'epics', ep.name);
                                    const files = fs.readdirSync(epicPath);
                                    for (const f of files) {
                                       if (f.endsWith('_purpose.md')) {
                                          const content = fs.readFileSync(path.join(epicPath, f), 'utf8');
                                          const statusMatch = content.match(/^status:\s*([A-Z_]+)/m);
                                          if (statusMatch && statusMatch[1] !== 'DONE') {
                                             isActive = true;
                                             break;
                                          }
                                       } else if (f.endsWith('.json')) {
                                          try {
                                             const content = fs.readFileSync(path.join(epicPath, f), 'utf8');
                                             const state = JSON.parse(content);
                                             if (state.status && state.status !== 'DONE') {
                                                isActive = true;
                                                break;
                                             }
                                          } catch(e) {}
                                       }
                                    }
                                 }
                                 if (isActive) break;
                              }
                           } catch(e) {}
                        }
                        
                        if (isActive) activeWorkspaceRepos.push(p);
                     }
                  }
               }
             } catch(err) {}
          }
       }
    }
    try {
      if (fs.existsSync(gitCacheFile)) {
        const cacheRaw = fs.readFileSync(gitCacheFile, 'utf8');
        const cacheData = JSON.parse(cacheRaw);
        previousCacheBranches = cacheData.gitBranches || [];
        // Use cache if it's less than 5 seconds old and cwd matches
        if (cacheData.cwd === parsed.cwd && (Date.now() - cacheData.timestamp) < 5000) {
          gitBranches = previousCacheBranches || [];
          useCache = true;
        }
      }
    } catch(e) {}

    if (!useCache) {
      try {
        let targetDir = parsed.cwd;
        // Check if current dir is a git repo
        try {
          cp.execSync('git rev-parse --is-inside-work-tree', { cwd: targetDir, stdio: 'ignore', timeout: 200 });
          // If it is, just use it
          const b = cp.execSync('git rev-parse --abbrev-ref HEAD', { cwd: targetDir, stdio: 'pipe', timeout: 200 }).toString().trim();
          const gitCommonDir = cp.execSync('git rev-parse --git-common-dir', { cwd: targetDir, stdio: 'pipe', timeout: 200 }).toString().trim();
          if (gitCommonDir) {
            const r = path.basename(path.dirname(path.resolve(targetDir, gitCommonDir)));
            gitBranches.push({ name: r, branch: b });
          }
        } catch (e) {
          // If not inside a git repo, use the activeWorkspaceRepos
          if (activeWorkspaceRepos.length > 0) {
            for (const p of activeWorkspaceRepos) {
               try {
                 const b = cp.execSync('git rev-parse --abbrev-ref HEAD', { cwd: p, stdio: 'pipe', timeout: 200 }).toString().trim();
                 const cDir = cp.execSync('git rev-parse --git-common-dir', { cwd: p, stdio: 'pipe', timeout: 200 }).toString().trim();
                 const r = path.basename(path.dirname(path.resolve(p, cDir)));
                 gitBranches.push({ name: r, branch: b });
               } catch(err) {}
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
          gitBranches,
          timestamp: Date.now()
        }), { mode: 0o600 });
      } catch (e) {}
    }
    }
  }

  let looperMissions: {repo: string, epic: string, mission: string, status: string, iteration?: number, maxIterations?: number, reason?: string}[] = [];
  let looperEpics: {repo: string, epic: string, total: number, done: number}[] = [];
  if (parsed.cwd) {
    const looperCacheFile = path.join(os.homedir(), '.gemini', 'hud_looper.cache');
    let useLooperCache = false;
    let prevLooperCache: any[] | null = null;
    try {
      if (fs.existsSync(looperCacheFile)) {
        const cRaw = fs.readFileSync(looperCacheFile, 'utf8');
        const cData = JSON.parse(cRaw);
        prevLooperCache = cData.looperMissions || [];
        const prevEpicsCache = cData.looperEpics || [];
        if (cData.cwd === parsed.cwd && (Date.now() - cData.timestamp) < 5000) {
          looperMissions = prevLooperCache || [];
          looperEpics = prevEpicsCache || [];
          useLooperCache = true;
        }
      }
    } catch(e) {}

    if (!useLooperCache) {
      try {
        let repoRoots: string[] = [];
        let targetDir = parsed.cwd;
        try {
          const root = cp.execSync('git rev-parse --show-toplevel', { cwd: targetDir, stdio: 'pipe', timeout: 200 }).toString().trim();
          if (root) repoRoots.push(root);
        } catch(e) {}

        let currentDir = targetDir;
        while (currentDir && currentDir !== '/') {
           if (fs.existsSync(path.join(currentDir, '.looper'))) {
              if (!repoRoots.includes(currentDir)) repoRoots.push(currentDir);
              break;
           }
           const parent = path.dirname(currentDir);
           if (parent === currentDir) break;
           currentDir = parent;
        }
        
        if (activeWorkspaceRepos.length > 0) {
           for (const p of activeWorkspaceRepos) {
              if (!repoRoots.includes(p)) repoRoots.push(p);
           }
        }
        
        if (repoRoots.length === 0) repoRoots.push(targetDir);

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
                      const maxIterations = maxMatch ? parseInt(maxMatch[1], 10) : 8;
                      
                      let iteration = 0;
                      let reason = undefined;
                      
                      const recordsPath = path.join(epicPath, 'records');
                      if (fs.existsSync(recordsPath)) {
                        try {
                          const recordFiles = fs.readdirSync(recordsPath).filter((rf: string) => rf.startsWith(missionId + '_') && rf.endsWith('_record_file.md'));
                          if (recordFiles.length > 0) {
                            recordFiles.sort();
                            const lastRecordFile = recordFiles[recordFiles.length - 1];
                            const recordContent = fs.readFileSync(path.join(recordsPath, lastRecordFile), 'utf8');
                            iteration = (recordContent.match(/^## Iteration/gm) || []).length;
                            
                            if (status === 'BLOCKED' || status === 'FAILED') {
                               const verdictMatch = recordContent.match(/-\s+Verdict:\s*(.*)/i);
                               const validatorMatch = recordContent.match(/-\s+Validator:\s*(.*)/i);
                               if (verdictMatch && verdictMatch[1].toLowerCase().includes('blocked')) {
                                 const r = verdictMatch[1].match(/blocked\((.*?)\)/i);
                                 if (r && r[1]) reason = r[1].trim();
                               } else if (validatorMatch && validatorMatch[1].toLowerCase().includes('fail')) {
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
          cwd: parsed.cwd,
          looperMissions,
          looperEpics,
          timestamp: Date.now()
        }), { mode: 0o600 });
      } catch(e) {}
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

  let executionMode = 'request-review';
  try {
    const settingsFile = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'settings.json');
    if (fs.existsSync(settingsFile)) {
      const settingsContent = fs.readFileSync(settingsFile, 'utf8');
      const settingsParsed = JSON.parse(settingsContent);
      if (settingsParsed.mode) {
        executionMode = settingsParsed.mode;
      }
    }
  } catch (e) {
    // Ignore errors and default to request-review
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
    artifacts: artifactList,
    looperMissions,
    looperEpics,
    executionMode,
    transcriptPath: parsed.transcript_path
  };
}
