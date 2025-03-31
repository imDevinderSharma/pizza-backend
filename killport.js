const { exec } = require('child_process');

// Port to check and kill
const PORT = process.env.PORT || 3001;

console.log(`Checking for processes using port ${PORT}...`);

const isWindows = process.platform === 'win32';
const isMac = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

let command = '';

if (isWindows) {
  // Windows command
  command = `netstat -ano | findstr :${PORT} | findstr LISTENING`;
} else if (isMac) {
  // macOS command
  command = `lsof -i tcp:${PORT} | grep LISTEN`;
} else if (isLinux) {
  // Linux command
  command = `lsof -i tcp:${PORT} | grep LISTEN`;
} else {
  console.error('Unsupported operating system');
  process.exit(1);
}

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.log(`No process found using port ${PORT}`);
    return;
  }

  console.log(`Found processes using port ${PORT}:`);
  console.log(stdout);

  let killCommand = '';

  if (isWindows) {
    // Extract PID and kill (Windows)
    const pidMatch = stdout.match(/LISTENING\s+(\d+)/);
    if (pidMatch && pidMatch[1]) {
      const pid = pidMatch[1];
      killCommand = `taskkill /F /PID ${pid}`;
    }
  } else {
    // Extract PID and kill (macOS/Linux)
    const lines = stdout.trim().split('\n');
    if (lines.length > 0) {
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const pid = parts[1];
          console.log(`Killing process with PID: ${pid}`);
          exec(`kill -9 ${pid}`, (killError) => {
            if (killError) {
              console.error(`Error killing process ${pid}:`, killError);
            } else {
              console.log(`Process ${pid} killed successfully`);
            }
          });
        }
      }
      return;
    }
  }

  if (killCommand) {
    console.log(`Executing: ${killCommand}`);
    exec(killCommand, (killError, killStdout, killStderr) => {
      if (killError) {
        console.error('Error killing process:', killError);
        return;
      }
      console.log('Process killed successfully');
    });
  } else {
    console.log('No process to kill');
  }
}); 