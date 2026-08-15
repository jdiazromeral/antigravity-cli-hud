#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXCLUDE_LIST = new Set(['.git', 'node_modules', '.looper']);

export function getSourceDir() {
  return path.resolve(__dirname, '..');
}

export function getTargetDir() {
  return process.env.SYNC_TARGET_DIR || path.join(os.homedir(), '.gemini', 'config', 'plugins', 'hud');
}

export function syncPlugin(sourceDir = getSourceDir(), targetDir = getTargetDir()) {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Source directory does not exist: ${sourceDir}`);
  }

  fs.mkdirSync(targetDir, { recursive: true });

  const entries = fs.readdirSync(sourceDir);
  for (const entry of entries) {
    if (EXCLUDE_LIST.has(entry)) {
      continue;
    }
    const srcPath = path.join(sourceDir, entry);
    const destPath = path.join(targetDir, entry);
    fs.cpSync(srcPath, destPath, { recursive: true, force: true, dereference: false });
  }
}

export function verifySync(sourceDir = getSourceDir(), targetDir = getTargetDir()) {
  if (!fs.existsSync(targetDir)) {
    throw new Error(`Target directory does not exist: ${targetDir}`);
  }

  function compareRecursive(src, dest) {
    const lstat = fs.lstatSync(src);
    if (!fs.existsSync(dest) && !fs.lstatSync(dest, { throwIfNoEntry: false })) {
      throw new Error(`Missing expected synced file/directory: ${dest}`);
    }

    if (lstat.isSymbolicLink()) {
      const destLstat = fs.lstatSync(dest);
      if (!destLstat.isSymbolicLink()) {
        throw new Error(`Expected symlink at ${dest}`);
      }
      const srcTarget = fs.readlinkSync(src);
      const destTarget = fs.readlinkSync(dest);
      if (srcTarget !== destTarget) {
        throw new Error(`Symlink destination mismatch: ${dest}`);
      }
    } else if (lstat.isDirectory()) {
      const children = fs.readdirSync(src);
      for (const child of children) {
        if (EXCLUDE_LIST.has(child)) continue;
        compareRecursive(path.join(src, child), path.join(dest, child));
      }
    } else if (lstat.isFile()) {
      const srcBuf = fs.readFileSync(src);
      const destBuf = fs.readFileSync(dest);
      if (!srcBuf.equals(destBuf)) {
        throw new Error(`Synced file content mismatch: ${dest}`);
      }
    }
  }

  const entries = fs.readdirSync(sourceDir);
  for (const entry of entries) {
    if (EXCLUDE_LIST.has(entry)) continue;
    compareRecursive(path.join(sourceDir, entry), path.join(targetDir, entry));
  }

  return true;
}

function main() {
  const isTest = process.argv.includes('--test');
  const sourceDir = getSourceDir();
  const targetDir = getTargetDir();

  try {
    syncPlugin(sourceDir, targetDir);
    verifySync(sourceDir, targetDir);

    if (isTest) {
      console.log(`[hud-sync] Verified plugin sync successfully at ${targetDir}`);
      process.exit(0);
    } else {
      console.log(`[hud-sync] Successfully synced plugin to ${targetDir}`);
      process.exit(0);
    }
  } catch (err) {
    console.error(`[hud-sync ERROR] Sync failed: ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main();
}
