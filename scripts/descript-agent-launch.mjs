// Launches the Descript agent with the prompt loaded from a file, bypassing
// the Windows CMD 8KB command-line limit. Calls @descript/platform-cli
// programmatically via spawn(), passing the prompt via the actual argv array
// (which goes through CreateProcessW and supports up to 32KB).

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const PROJECT_ID = process.argv[2] ?? "c5a9fcaf-f42e-46d7-9c15-ab90495d7a1f";
const PROMPT_FILE = process.argv[3] ?? "tmp/descript-agent-prompt.md";

const prompt = fs.readFileSync(PROMPT_FILE, "utf8");
process.stdout.write(`prompt: ${prompt.length} bytes\n`);
process.stdout.write(`project: ${PROJECT_ID}\n`);

// Resolve the local CLI binary so we don't go through the long npx shim
// (which uses cmd.exe and hits the 8KB limit). The CLI is at
// node_modules/@descript/platform-cli/dist/cli.js — but it's a globally
// installed package. Find it via npm root -g.
const { execSync } = await import("node:child_process");
const globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
const cliPath = path.join(globalRoot, "@descript", "platform-cli", "dist", "descript-cli.cjs");
if (!fs.existsSync(cliPath)) {
  process.stderr.write(`CLI not found at ${cliPath}\n`);
  process.stderr.write(`Listing ${path.join(globalRoot, "@descript")}:\n`);
  process.stderr.write(fs.readdirSync(path.join(globalRoot, "@descript")).join("\n") + "\n");
  process.exit(1);
}

const args = [cliPath, "agent", "-p", PROJECT_ID, "--prompt", prompt, "--no-wait"];

// spawn() bypasses cmd.exe and uses CreateProcessW directly — argv up to 32KB
const child = spawn(process.execPath, args, { stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
