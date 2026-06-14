import { exec } from 'node:child_process';

export function countSubagents(): Promise<number> {
  return new Promise((resolve, reject) => {
    exec('ps aux | grep "[s]ubagent"', (error, stdout) => {
      // error.code === 1 usually means grep found no matches
      if (error && error.code !== 1) {
        return reject(error);
      }
      
      const output = stdout.trim();
      if (!output) {
        return resolve(0);
      }
      
      const lines = output.split('\n');
      resolve(lines.length);
    });
  });
}
