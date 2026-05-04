const { spawn } = require("node:child_process");
const readline = require("node:readline");

const command = process.argv[2];
const validCommands = new Set(["dev", "start"]);

if (!validCommands.has(command)) {
  console.error(`Unsupported split command: ${command || "<empty>"}`);
  process.exit(1);
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const workspaceCommands = [
  { label: "backend", args: ["run", command, "--workspace", "backend", "--if-present"] },
  { label: "frontend", args: ["run", command, "--workspace", "frontend", "--if-present"] }
];

const children = new Set();
let exitCode = 0;
let shuttingDown = false;

function pipeWithPrefix(stream, label, writer) {
  const reader = readline.createInterface({ input: stream });
  reader.on("line", (line) => writer(`[${label}] ${line}`));
  return reader;
}

function stopChildren(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

function startWorkspace(workspaceCommand) {
  const child = spawn(npmCommand, workspaceCommand.args, {
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"]
  });

  children.add(child);

  const stdoutReader = pipeWithPrefix(child.stdout, workspaceCommand.label, console.log);
  const stderrReader = pipeWithPrefix(child.stderr, workspaceCommand.label, console.error);

  child.on("error", (error) => {
    console.error(`[${workspaceCommand.label}] Failed to start`, error);

    if (!exitCode) {
      exitCode = 1;
    }

    stopChildren("SIGTERM");
  });

  child.on("exit", (code, signal) => {
    stdoutReader.close();
    stderrReader.close();
    children.delete(child);

    if (!shuttingDown && (signal || code)) {
      exitCode = signal ? 1 : code;
      stopChildren("SIGTERM");
    }

    if (children.size === 0) {
      process.exit(exitCode);
    }
  });
}

for (const workspaceCommand of workspaceCommands) {
  startWorkspace(workspaceCommand);
}

process.on("SIGINT", () => {
  stopChildren("SIGINT");
});

process.on("SIGTERM", () => {
  stopChildren("SIGTERM");
});
