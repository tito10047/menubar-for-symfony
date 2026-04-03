// src/extension.ts
import { Extension } from "gi://gnome-shell/extensions/extension";

// src/core/logging/ConsoleLogger.ts
var ConsoleLogger = class {
  prefix = "[SymfonyMenubar]";
  debug(message, ...args) {
    console.debug(`${this.prefix} ${message}`, ...args);
  }
  info(message, ...args) {
    console.info(`${this.prefix} ${message}`, ...args);
  }
  warn(message, ...args) {
    console.warn(`${this.prefix} ${message}`, ...args);
  }
  error(message, ...args) {
    console.error(`${this.prefix} ${message}`, ...args);
  }
};

// src/core/GjsProcessRunner.ts
import Gio from "gi://Gio";
var GjsProcessRunner = class {
  /**
   * @param logger The logger to record command execution and results.
   */
  constructor(logger) {
    this.logger = logger;
  }
  logger;
  /**
   * Executes a command with arguments asynchronously and returns the stdout.
   * 
   * @param args Array containing the command and its arguments (e.g., ['ls', '-la']).
   * @returns A promise that resolves to the stdout string on success.
   * @throws Error if the process fails or returns a non-zero exit code.
   */
  async run(args) {
    const commandLine = args.join(" ");
    this.logger.info(`Running command: ${commandLine}`);
    return new Promise((resolve, reject) => {
      let proc;
      try {
        proc = Gio.Subprocess.new(
          args,
          Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        );
      } catch (error) {
        const errorMessage = `Failed to create subprocess for command: ${commandLine}. Error: ${error}`;
        this.logger.error(errorMessage);
        return reject(new Error(errorMessage));
      }
      proc.communicate_utf8_async(null, null, (subprocess, result) => {
        try {
          const [stdout, stderr] = subprocess.communicate_utf8_finish(result);
          const status = subprocess.get_exit_status();
          const exited = subprocess.get_if_exited();
          if (!exited || status !== 0) {
            const errorMessage = `Command '${commandLine}' exited with status ${status}. Stderr: ${stderr || "no error output"}`;
            this.logger.error(errorMessage);
            return reject(new Error(errorMessage));
          }
          this.logger.debug(`Command '${commandLine}' executed successfully.`);
          resolve(stdout || "");
        } catch (error) {
          const errorMessage = `Error reading output of command: ${commandLine}. Error: ${error}`;
          this.logger.error(errorMessage);
          reject(new Error(errorMessage));
        }
      });
    });
  }
};

// src/core/commands/VersionCommand.ts
var VersionCommand = class {
  constructor(processRunner) {
    this.processRunner = processRunner;
  }
  processRunner;
  logger;
  getName() {
    return "version";
  }
  setLogger(logger) {
    this.logger = logger;
  }
  async execute(args = []) {
    const commandName = this.getName();
    this.logger?.info(`Executing command ${commandName}`);
    try {
      const commandArgs = ["version", "--no-ansi", ...args];
      const output = await this.processRunner.run(commandArgs);
      if (!output || output.trim() === "") {
        this.logger?.warn(`Empty output from ${commandName}`);
      }
      const match = output.match(/Symfony CLI (?:version|v)?\s*(\d+\.\d+\.\d+)/i);
      if (match) {
        return { version: match[1] };
      }
      this.logger?.warn(`Could not parse version from output: ${output}`);
      return { version: output.trim() };
    } catch (error) {
      this.logger?.error(`Command ${commandName} failed`, error);
      throw error;
    }
  }
};

// src/core/commands/ServerListCommand.ts
var ServerListCommand = class {
  constructor(processRunner) {
    this.processRunner = processRunner;
  }
  processRunner;
  logger;
  getName() {
    return "server:list";
  }
  setLogger(logger) {
    this.logger = logger;
  }
  async execute(args = []) {
    const commandName = this.getName();
    this.logger?.info(`Executing command ${commandName}`);
    try {
      const commandArgs = ["server:list", "--no-ansi", ...args];
      const output = await this.processRunner.run(commandArgs);
      if (!output || output.trim() === "") {
        this.logger?.warn(`No servers found (empty output) for ${commandName}`);
      }
      const servers = [];
      const lines = output.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("+") || trimmed.startsWith("-") || trimmed.includes("Directory") || !trimmed.includes("|")) {
          continue;
        }
        const columns = trimmed.split("|").map((c) => c.trim()).filter((c) => c !== "");
        if (columns.length < 2) continue;
        const directory = columns[0];
        const portStr = columns[1];
        let port = 8e3;
        let isRunning = false;
        if (portStr.toLowerCase() === "not running") {
          isRunning = false;
        } else {
          const p = parseInt(portStr, 10);
          if (!isNaN(p)) {
            port = p;
            isRunning = true;
          }
        }
        const url = isRunning ? `https://127.0.0.1:${port}` : "";
        servers.push({
          directory,
          port,
          url,
          isRunning
        });
      }
      if (servers.length === 0 && output.trim() !== "") {
        this.logger?.warn(`No servers found in output of ${commandName}`);
      }
      return servers;
    } catch (error) {
      this.logger?.error(`Command ${commandName} failed`, error);
      throw error;
    }
  }
};

// src/core/commands/PhpListCommand.ts
var PhpListCommand = class {
  constructor(processRunner) {
    this.processRunner = processRunner;
  }
  processRunner;
  logger;
  getName() {
    return "local:php:list";
  }
  setLogger(logger) {
    this.logger = logger;
  }
  async execute(args = []) {
    const commandName = this.getName();
    this.logger?.info(`Executing command ${commandName}`);
    try {
      const commandArgs = ["local:php:list", "--no-ansi", ...args];
      const output = await this.processRunner.run(commandArgs);
      if (!output || output.trim() === "") {
        this.logger?.warn(`No PHP versions found (empty output) for ${commandName}`);
      }
      const versions = [];
      const lines = output.split("\n");
      const versionRegex = /(\d+\.\d+(?:\.\d+)?)/;
      const pathRegex = /(\/[^\s│|]+)/;
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("\u2500") || trimmed.startsWith("\u250C") || trimmed.startsWith("\u2514") || trimmed.startsWith("\u251C") || trimmed.includes("Version")) {
          continue;
        }
        const versionMatch = trimmed.match(versionRegex);
        if (!versionMatch) continue;
        const version = versionMatch[1];
        const isDefault = trimmed.toLowerCase().includes("default") || trimmed.includes("*") || trimmed.includes("\u2B50");
        const pathMatch = trimmed.match(pathRegex);
        const path = pathMatch ? pathMatch[1] : "";
        if (!versions.find((v) => v.version === version)) {
          versions.push({
            version,
            path,
            isDefault
          });
        }
      }
      if (versions.length === 0 && output.trim() !== "") {
        this.logger?.warn(`No PHP versions found in output of ${commandName}`);
      }
      return versions;
    } catch (error) {
      this.logger?.error(`Command ${commandName} failed`, error);
      throw error;
    }
  }
};

// src/core/commands/ProxyStatusCommand.ts
var ProxyStatusCommand = class {
  constructor(processRunner) {
    this.processRunner = processRunner;
  }
  processRunner;
  logger;
  getName() {
    return "proxy:status";
  }
  setLogger(logger) {
    this.logger = logger;
  }
  async execute(args = []) {
    const commandName = this.getName();
    this.logger?.info(`Executing command ${commandName}`);
    try {
      const commandArgs = ["proxy:status", "--no-ansi", ...args];
      const output = await this.processRunner.run(commandArgs);
      if (!output || output.trim() === "") {
        this.logger?.warn(`Empty output from ${commandName}`);
      }
      const lines = output.split("\n");
      let isRunning = false;
      for (let i = 0; i < Math.min(lines.length, 10); i++) {
        const line = lines[i].toLowerCase();
        if (line.includes("listening") || line.includes("proxy is running")) {
          isRunning = true;
          break;
        }
      }
      const proxies = [];
      const domainRegex = /([a-zA-Z0-9.\-]+\.wip)/;
      const pathRegex = /([~/][^\s|│]+)/;
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("+") || trimmed.startsWith("-") || trimmed.startsWith("\u250C") || trimmed.startsWith("\u2514") || trimmed.startsWith("\u251C") || trimmed.includes("Domain") || trimmed.includes("Directory")) {
          continue;
        }
        const domainMatch = trimmed.match(domainRegex);
        if (domainMatch) {
          const domain = domainMatch[1];
          const pathMatch = trimmed.match(pathRegex);
          const directory = pathMatch ? pathMatch[1] : "";
          if (!proxies.find((p) => p.domain === domain)) {
            proxies.push({ domain, directory });
          }
        }
      }
      return { isRunning, proxies };
    } catch (error) {
      this.logger?.error(`Command ${commandName} failed`, error);
      throw error;
    }
  }
};

// src/core/commands/ServerStartCommand.ts
var ServerStartCommand = class {
  constructor(processRunner) {
    this.processRunner = processRunner;
  }
  processRunner;
  logger;
  getName() {
    return "server:start";
  }
  setLogger(logger) {
    this.logger = logger;
  }
  async execute(args = []) {
    const commandName = this.getName();
    this.logger?.info(`Executing command ${commandName}`);
    try {
      const commandArgs = ["server:start", "-d", ...args];
      const output = await this.processRunner.run(commandArgs);
      const lowerOutput = output.toLowerCase();
      const success = lowerOutput.includes("listening") || lowerOutput.includes("already running");
      if (!success) {
        this.logger?.warn(`Command ${commandName} did not indicate clear success. Output: ${output}`);
      }
      return success;
    } catch (error) {
      this.logger?.error(`Command ${commandName} failed`, error);
      throw error;
    }
  }
};

// src/core/commands/ServerStopCommand.ts
var ServerStopCommand = class {
  constructor(processRunner) {
    this.processRunner = processRunner;
  }
  processRunner;
  logger;
  getName() {
    return "server:stop";
  }
  setLogger(logger) {
    this.logger = logger;
  }
  async execute(args = []) {
    const commandName = this.getName();
    this.logger?.info(`Executing command ${commandName}`);
    try {
      const commandArgs = ["server:stop", ...args];
      const output = await this.processRunner.run(commandArgs);
      const lowerOutput = output.toLowerCase();
      const success = lowerOutput.includes("stopped") || lowerOutput.includes("no web server is running");
      if (!success) {
        this.logger?.warn(`Command ${commandName} did not indicate clear success. Output: ${output}`);
      }
      return success;
    } catch (error) {
      this.logger?.error(`Command ${commandName} failed`, error);
      throw error;
    }
  }
};

// src/core/commands/ProxyStartCommand.ts
var ProxyStartCommand = class {
  constructor(processRunner) {
    this.processRunner = processRunner;
  }
  processRunner;
  logger;
  getName() {
    return "proxy:start";
  }
  setLogger(logger) {
    this.logger = logger;
  }
  async execute(args = []) {
    const commandName = this.getName();
    this.logger?.info(`Executing command ${commandName}`);
    try {
      const commandArgs = ["proxy:start", "--no-ansi", ...args];
      const output = await this.processRunner.run(commandArgs);
      const lowerOutput = output.toLowerCase();
      const success = lowerOutput.includes("listening") || lowerOutput.includes("already running");
      if (!success) {
        this.logger?.warn(`Command ${commandName} did not indicate clear success. Output: ${output}`);
      }
      return success;
    } catch (error) {
      this.logger?.error(`Command ${commandName} failed`, error);
      throw error;
    }
  }
};

// src/core/commands/ProxyStopCommand.ts
var ProxyStopCommand = class {
  constructor(processRunner) {
    this.processRunner = processRunner;
  }
  processRunner;
  logger;
  getName() {
    return "proxy:stop";
  }
  setLogger(logger) {
    this.logger = logger;
  }
  async execute(args = []) {
    const commandName = this.getName();
    this.logger?.info(`Executing command ${commandName}`);
    try {
      const commandArgs = ["proxy:stop", "--no-ansi", ...args];
      const output = await this.processRunner.run(commandArgs);
      const lowerOutput = output.toLowerCase();
      const success = lowerOutput.includes("stopped") || lowerOutput.includes("not running");
      if (!success) {
        this.logger?.warn(`Command ${commandName} did not indicate clear success. Output: ${output}`);
      }
      return success;
    } catch (error) {
      this.logger?.error(`Command ${commandName} failed`, error);
      throw error;
    }
  }
};

// src/core/commands/ProxyDomainDetachCommand.ts
var ProxyDomainDetachCommand = class {
  constructor(processRunner) {
    this.processRunner = processRunner;
  }
  processRunner;
  logger;
  getName() {
    return "proxy:domain:detach";
  }
  setLogger(logger) {
    this.logger = logger;
  }
  async execute(args = []) {
    const commandName = this.getName();
    this.logger?.info(`Executing command ${commandName}`);
    try {
      const commandArgs = ["proxy:domain:detach", "--no-ansi", ...args];
      const output = await this.processRunner.run(commandArgs);
      const lowerOutput = output.toLowerCase();
      const success = lowerOutput.includes("detached") || lowerOutput.includes("not defined anymore");
      if (!success) {
        this.logger?.warn(`Command ${commandName} did not indicate clear success. Output: ${output}`);
      }
      return success;
    } catch (error) {
      this.logger?.error(`Command ${commandName} failed`, error);
      throw error;
    }
  }
};

// src/core/commands/WhichSymfonyCommand.ts
var WhichSymfonyCommand = class {
  constructor(processRunner) {
    this.processRunner = processRunner;
  }
  processRunner;
  logger;
  getName() {
    return "which";
  }
  setLogger(logger) {
    this.logger = logger;
  }
  async execute(args = []) {
    const commandName = this.getName();
    this.logger?.info(`Executing command ${commandName}`);
    try {
      const output = await this.processRunner.run(["/usr/bin/which", "symfony"]);
      const path = output.trim();
      if (!path) {
        this.logger?.warn(`Command ${commandName} returned empty path`);
      }
      return { path };
    } catch (error) {
      this.logger?.error(`Command ${commandName} failed`, error);
      return { path: null };
    }
  }
};

// src/core/SymfonyCliManager.ts
var SymfonyCliManager = class {
  commands = /* @__PURE__ */ new Map();
  logger;
  constructor(processRunner) {
    this.registerCommand(new VersionCommand(processRunner));
    this.registerCommand(new ServerListCommand(processRunner));
    this.registerCommand(new PhpListCommand(processRunner));
    this.registerCommand(new ProxyStatusCommand(processRunner));
    this.registerCommand(new ServerStartCommand(processRunner));
    this.registerCommand(new ServerStopCommand(processRunner));
    this.registerCommand(new ProxyStartCommand(processRunner));
    this.registerCommand(new ProxyStopCommand(processRunner));
    this.registerCommand(new ProxyDomainDetachCommand(processRunner));
    this.registerCommand(new WhichSymfonyCommand(processRunner));
  }
  setLogger(logger) {
    this.logger = logger;
    for (const command of this.commands.values()) {
      command.setLogger(logger);
    }
  }
  registerCommand(command) {
    if (this.logger) {
      command.setLogger(this.logger);
    }
    this.commands.set(command.getName(), command);
  }
  async runCommand(commandName, args) {
    const command = this.commands.get(commandName);
    if (!command) {
      this.logger?.error(`Command ${commandName} not found`);
      throw new Error(`Command ${commandName} not found`);
    }
    return await command.execute(args);
  }
};

// src/extension.ts
var SymfonyMenubarExtension = class extends Extension {
  logger;
  processRunner;
  cliManager;
  /**
   * Called when the extension is enabled.
   */
  enable() {
    this.logger = new ConsoleLogger();
    this.processRunner = new GjsProcessRunner(this.logger);
    this.cliManager = new SymfonyCliManager(this.processRunner);
    this.cliManager.setLogger(this.logger);
    this.logger.info("Symfony Menubar Extension Enabled");
    this.runDiagnostics();
  }
  /**
   * Called when the extension is disabled.
   */
  disable() {
    if (this.logger) {
      this.logger.info("Symfony Menubar Extension Disabled");
    }
    this.cliManager = void 0;
    this.processRunner = void 0;
    this.logger = void 0;
  }
  /**
   * Run version command for diagnostic purposes and log the result.
   */
  async runDiagnostics() {
    try {
      if (this.cliManager && this.logger) {
        const response = await this.cliManager.runCommand("version");
        this.logger.info(`SUCCESS: ${response.version}`);
      }
    } catch (error) {
      this.logger?.error(`Diagnostic failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};
export {
  SymfonyMenubarExtension as default
};
