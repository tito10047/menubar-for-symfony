// src/extension.ts
import GLib from "gi://GLib";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

// src/ui/Indicator.ts
import GObject5 from "gi://GObject";
import { Button } from "resource:///org/gnome/shell/ui/panelMenu.js";
import { PopupSeparatorMenuItem as PopupSeparatorMenuItem2 } from "resource:///org/gnome/shell/ui/popupMenu.js";
import St5 from "gi://St";
import Clutter4 from "gi://Clutter";

// src/ui/components/SectionHeader.ts
import St from "gi://St";
import { PopupBaseMenuItem } from "resource:///org/gnome/shell/ui/popupMenu.js";
function createSectionHeader(text) {
  const header = new PopupBaseMenuItem({ reactive: false });
  const label = new St.Label({
    text: text.toUpperCase(),
    style: "font-size: 11px; font-weight: bold; color: rgba(255, 255, 255, 0.4); padding-top: 5px; padding-bottom: 2px;"
  });
  label.clutter_text.ellipsize = 0;
  header.add_child(label);
  return header;
}

// src/ui/components/PhpVersionItem.ts
import GObject from "gi://GObject";
import St2 from "gi://St";
import Clutter from "gi://Clutter";
import { PopupBaseMenuItem as PopupBaseMenuItem2 } from "resource:///org/gnome/shell/ui/popupMenu.js";
var BADGE_STYLE = "font-size: 10px; background-color: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; margin-right: 8px;";
var PhpVersionItem = GObject.registerClass(
  class PhpVersionItem2 extends PopupBaseMenuItem2 {
    _init(params = {}) {
      super._init({ reactive: false });
      const box = new St2.BoxLayout({
        x_expand: true,
        y_align: Clutter.ActorAlign.CENTER
      });
      this._dot = new St2.Label({
        text: "\u25CF  ",
        style: "color: #888888;"
      });
      this._versionLabel = new St2.Label({ text: "\u2014" });
      this._versionLabel.set_x_expand(true);
      this._badgeContainer = new St2.BoxLayout({});
      box.add_child(this._dot);
      box.add_child(this._versionLabel);
      box.add_child(this._badgeContainer);
      this.add_child(box);
      if (params.version) this.updateVersion(params.version);
      if (params.isActive !== void 0) this.updateStatus(params.isActive);
      if (params.info) this.updateBadges(params.info);
    }
    updateVersion(version) {
      this._versionLabel.set_text(version);
    }
    updateStatus(isActive) {
      this._dot.set_style(`color: ${isActive ? "#4ade80" : "#888888"};`);
    }
    /**
     * Destroys all existing badge actors and re-populates from PhpInfo.
     * Badges are shown only for extensions that are actually enabled.
     */
    updateBadges(info) {
      this._badgeContainer.destroy_all_children();
      if (info.hasOpcache) {
        this._badgeContainer.add_child(
          new St2.Label({ text: "OPcache", style: BADGE_STYLE })
        );
      }
      if (info.hasXdebug) {
        this._badgeContainer.add_child(
          new St2.Label({ text: "Xdebug", style: BADGE_STYLE })
        );
      }
      if (info.hasApcu) {
        this._badgeContainer.add_child(
          new St2.Label({ text: "APCu", style: BADGE_STYLE })
        );
      }
    }
  }
);

// src/ui/components/ServerMenuItem.ts
import GObject2 from "gi://GObject";
import St3 from "gi://St";
import Clutter2 from "gi://Clutter";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import { PopupMenuItem, PopupSeparatorMenuItem } from "resource:///org/gnome/shell/ui/popupMenu.js";
var RUNNING_COLOR = "#4ade80";
var STOPPED_COLOR = "#888888";
var ServerMenuItem = GObject2.registerClass(
  class ServerMenuItem2 extends PopupMenu.PopupSubMenuMenuItem {
    _init(params) {
      super._init(params.name);
      this.label.set_x_expand(true);
      this._isRunning = params.isRunning;
      this._isFavorite = params.isFavorite;
      this._portLabel = null;
      this._dot = new St3.Label({
        text: "\u25CF  ",
        style: `color: ${STOPPED_COLOR};`,
        y_align: Clutter2.ActorAlign.CENTER
      });
      const labelIndex = this.get_children().indexOf(this.label);
      this.insert_child_at_index(this._dot, labelIndex !== -1 ? labelIndex : 1);
      this._applyDotColor(params.isRunning);
      this._setPort(params.port);
      this._rebuildActions();
    }
    updateStatus(isRunning) {
      this._isRunning = isRunning;
      this._applyDotColor(isRunning);
      this._rebuildActions();
    }
    updatePort(port) {
      this._setPort(port);
    }
    // ---- private helpers (GObject _ convention) ----
    _applyDotColor(isRunning) {
      this._dot.set_style(`color: ${isRunning ? RUNNING_COLOR : STOPPED_COLOR};`);
    }
    /**
     * Destroys the existing port actor (if any) and inserts a new one
     * just before the expand-arrow (last child).
     */
    _setPort(port) {
      if (this._portLabel) {
        this._portLabel.destroy();
        this._portLabel = null;
      }
      if (!port) return;
      this._portLabel = new St3.Label({
        text: `:${port}`,
        style: "color: rgba(255, 255, 255, 0.4); font-size: 12px; margin-right: 8px;",
        y_align: Clutter2.ActorAlign.CENTER
      });
      const childrenCount = this.get_children().length;
      this.insert_child_at_index(this._portLabel, childrenCount - 1);
    }
    /**
     * Clears and re-populates the submenu based on current running state.
     * Called on construction and on every status change.
     */
    _rebuildActions() {
      this.menu.removeAll();
      if (this._isRunning) {
        this.menu.addMenuItem(new PopupMenuItem("\u23F9\uFE0F Stop server"));
        this.menu.addMenuItem(new PopupMenuItem("\u{1F310} Open in browser"));
      } else {
        this.menu.addMenuItem(new PopupMenuItem("\u25B6\uFE0F Start server"));
      }
      this.menu.addMenuItem(new PopupSeparatorMenuItem());
      this.menu.addMenuItem(new PopupMenuItem("\u{1F4CB} Copy URL"));
      this.menu.addMenuItem(new PopupMenuItem("\u{1F4C4} View logs"));
      if (this._isFavorite) {
        this.menu.addMenuItem(new PopupSeparatorMenuItem());
        this.menu.addMenuItem(new PopupMenuItem("\u2B50 Add to favorites"));
      }
    }
  }
);

// src/ui/components/FavoriteServersGroup.ts
import GObject3 from "gi://GObject";
import * as PopupMenu2 from "resource:///org/gnome/shell/ui/popupMenu.js";
var FavoriteServersGroup = GObject3.registerClass(
  class FavoriteServersGroup2 extends PopupMenu2.PopupSubMenuMenuItem {
    _init() {
      super._init("\u{1F4C1} Other favorite servers");
      this._serverMap = /* @__PURE__ */ new Map();
    }
    /**
     * Creates a new ServerMenuItem, registers it under `directory` as the
     * canonical key (matches SymfonyServer.directory), and appends it to the submenu.
     */
    addServer(directory, params) {
      const item = new ServerMenuItem(params);
      this._serverMap.set(directory, item);
      this.menu.addMenuItem(item);
    }
    getServer(directory) {
      return this._serverMap.get(directory);
    }
    /** Destroys all child items and clears the internal map. */
    clear() {
      this.menu.removeAll();
      this._serverMap.clear();
    }
    get serverCount() {
      return this._serverMap.size;
    }
  }
);

// src/ui/components/ProxyMenuItem.ts
import GObject4 from "gi://GObject";
import St4 from "gi://St";
import Clutter3 from "gi://Clutter";
import * as PopupMenu3 from "resource:///org/gnome/shell/ui/popupMenu.js";
import { PopupMenuItem as PopupMenuItem2 } from "resource:///org/gnome/shell/ui/popupMenu.js";
var RUNNING_COLOR2 = "#4ade80";
var STOPPED_COLOR2 = "#888888";
var ProxyMenuItem = GObject4.registerClass(
  class ProxyMenuItem2 extends PopupMenu3.PopupSubMenuMenuItem {
    _init() {
      super._init("Proxy: stopped");
      this._dot = new St4.Label({
        text: "\u25CF  ",
        style: `color: ${STOPPED_COLOR2};`,
        y_align: Clutter3.ActorAlign.CENTER
      });
      const labelIdx = this.get_children().indexOf(this.label);
      this.insert_child_at_index(this._dot, labelIdx !== -1 ? labelIdx : 1);
      this._startItem = new PopupMenuItem2("\u25B6\uFE0F Start");
      this._stopItem = new PopupMenuItem2("\u23F9\uFE0F Stop");
      this._restartItem = new PopupMenuItem2("\u{1F504} Restart");
      this._openBrowserItem = new PopupMenuItem2("\u{1F310} Open in browser");
      this.menu.addMenuItem(this._startItem);
      this.menu.addMenuItem(this._stopItem);
      this.menu.addMenuItem(this._restartItem);
      this.menu.addMenuItem(this._openBrowserItem);
    }
    /**
     * Updates dot color, label text, and action visibility to reflect
     * the current proxy running state.
     *
     * @param isRunning - Whether the proxy process is active.
     * @param port      - Optional port number shown in the label when running.
     */
    updateStatus(isRunning, port) {
      this._dot.set_style(`color: ${isRunning ? RUNNING_COLOR2 : STOPPED_COLOR2};`);
      const labelText = isRunning ? `Proxy running${port !== void 0 ? `: port ${port}` : ""}` : "Proxy: stopped";
      this.label.set_text(labelText);
      this._startItem.visible = !isRunning;
      this._stopItem.visible = isRunning;
      this._restartItem.visible = isRunning;
    }
    updateLabel(text) {
      this.label.set_text(text);
    }
  }
);

// src/ui/Indicator.ts
var Indicator = GObject5.registerClass(
  class Indicator2 extends Button {
    _init() {
      super._init(0, "Symfony Menubar", false);
      this._mainServerItems = /* @__PURE__ */ new Map();
      const topLabel = new St5.Label({
        text: "sf",
        y_align: Clutter4.ActorAlign.CENTER
      });
      this.add_child(topLabel);
      const menu = this.menu;
      menu.addMenuItem(createSectionHeader("PHP"));
      this._phpItem = new PhpVersionItem();
      menu.addMenuItem(this._phpItem);
      menu.addMenuItem(new PopupSeparatorMenuItem2());
      menu.addMenuItem(createSectionHeader("Servers"));
      const server1 = new ServerMenuItem({
        name: "my-super-project",
        port: "8000",
        isRunning: true,
        isFavorite: false
      });
      const server2 = new ServerMenuItem({
        name: "old-project",
        port: "",
        isRunning: false,
        isFavorite: false
      });
      this._mainServerItems.set("my-super-project", server1);
      this._mainServerItems.set("old-project", server2);
      menu.addMenuItem(server1);
      menu.addMenuItem(server2);
      menu.addMenuItem(new PopupSeparatorMenuItem2());
      this._favoriteServersGroup = new FavoriteServersGroup();
      for (let i = 1; i <= 30; i++) {
        const isRunning = i % 2 !== 0;
        const port = isRunning ? String(8e3 + i) : "";
        this._favoriteServersGroup.addServer(`project-${i}`, {
          name: `project-${i}`,
          port,
          isRunning,
          isFavorite: true
        });
      }
      menu.addMenuItem(this._favoriteServersGroup);
      menu.addMenuItem(new PopupSeparatorMenuItem2());
      menu.addMenuItem(createSectionHeader("Proxy"));
      this._proxyItem = new ProxyMenuItem();
      menu.addMenuItem(this._proxyItem);
    }
    // ---- Public update API ----
    /**
     * Refreshes the PHP row.
     * Picks the default version; falls back to the first entry in the list.
     */
    updatePhpStatus(versions, phpInfoMap) {
      const active = versions.find((v) => v.isDefault) ?? versions[0];
      if (!active) return;
      this._phpItem.updateVersion(active.version);
      this._phpItem.updateStatus(true);
      const info = phpInfoMap.get(active.version);
      if (info) {
        this._phpItem.updateBadges(info);
      }
    }
    /**
     * Reconciles the server list in-place: updates existing items, adds new
     * ones to the favorites group. Does not remove items that disappeared
     * from the list — call destroy() on this indicator for a full reset.
     */
    updateServerStatus(servers) {
      for (const server of servers) {
        const mainItem = this._mainServerItems.get(server.directory);
        if (mainItem) {
          mainItem.updateStatus(server.isRunning);
          mainItem.updatePort(server.isRunning ? String(server.port) : "");
          continue;
        }
        const favoriteItem = this._favoriteServersGroup.getServer(server.directory);
        if (favoriteItem) {
          favoriteItem.updateStatus(server.isRunning);
          favoriteItem.updatePort(server.isRunning ? String(server.port) : "");
          continue;
        }
        this._favoriteServersGroup.addServer(server.directory, {
          name: server.directory,
          port: server.isRunning ? String(server.port) : "",
          isRunning: server.isRunning,
          isFavorite: true
        });
      }
    }
    /**
     * Updates proxy section status dot and label.
     * Port is not yet available in ProxyStatus; pass it explicitly when known.
     */
    updateProxyStatus(status, port) {
      this._proxyItem.updateStatus(status.isRunning, port);
    }
  }
);

// src/core/GjsProcessRunner.ts
import Gio from "gi://Gio";
var GjsProcessRunner = class {
  /**
   * @param logger The logger to record command execution and results.
   * @param binaryPath Default binary to run (e.g., 'symfony'). Defaults to 'symfony'.
   */
  constructor(logger, binaryPath = "symfony") {
    this.logger = logger;
    this.binaryPath = binaryPath;
  }
  logger;
  binaryPath;
  /**
   * Executes a command with arguments asynchronously and returns the stdout.
   * 
   * @param command Array containing the arguments (e.g., ['ls', '-la'] or just ['-la'] if binary is set).
   * @returns A promise that resolves to the stdout string on success.
   * @throws Error if the process fails or returns a non-zero exit code.
   */
  async run(command) {
    let binary = this.binaryPath;
    let args = command;
    if (command.length > 0 && command[0].startsWith("/")) {
      binary = command[0];
      args = command.slice(1);
    }
    const fullArgs = [binary, ...args];
    const commandLine = fullArgs.join(" ");
    this.logger.info(`Running command: ${commandLine}`);
    return new Promise((resolve, reject) => {
      let proc;
      try {
        proc = Gio.Subprocess.new(
          fullArgs,
          Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        );
      } catch (error) {
        const errorMessage = `Failed to create subprocess for command: ${commandLine}. Error: ${error}`;
        this.logger.error(errorMessage);
        return reject(new Error(errorMessage));
      }
      proc.communicate_utf8_async(null, null, (subprocess, result) => {
        try {
          const [, stdout, stderr] = subprocess.communicate_utf8_finish(result);
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

// src/core/commands/PhpInfoCommand.ts
var PhpInfoCommand = class {
  constructor(processRunner) {
    this.processRunner = processRunner;
  }
  processRunner;
  logger;
  getName() {
    return "php:info";
  }
  setLogger(logger) {
    this.logger = logger;
  }
  async execute(args = []) {
    const commandName = this.getName();
    const runArgsIni = args.length > 0 ? [args[0], "--ini"] : ["--ini"];
    const runArgsM = args.length > 0 ? [args[0], "-m"] : ["-m"];
    const phpLabel = args.length > 0 ? ` for PHP: ${args[0]}` : "";
    this.logger?.info(`Executing command ${commandName}${phpLabel}`);
    try {
      const iniOutput = await this.processRunner.run(runArgsIni);
      const modulesOutput = await this.processRunner.run(runArgsM);
      const phpIniPath = this.parseIniPath(iniOutput);
      const modules = modulesOutput.toLowerCase();
      return {
        phpIniPath,
        hasXdebug: modules.includes("xdebug"),
        hasApcu: modules.includes("apcu"),
        hasOpcache: modules.includes("opcache")
      };
    } catch (error) {
      this.logger?.error(`Command ${commandName} failed`, error);
      throw error;
    }
  }
  parseIniPath(output) {
    const loadedMatch = output.match(/Loaded Configuration File:\s+(.+)/);
    if (loadedMatch && loadedMatch[1].trim() !== "(none)") {
      return loadedMatch[1].trim();
    }
    const pathMatch = output.match(/Configuration File \(php\.ini\) Path:\s+(.+)/);
    if (pathMatch) {
      return pathMatch[1].trim();
    }
    return "";
  }
};

// src/core/commands/OpenLogCommand.ts
var OpenLogCommand = class {
  constructor(processRunner) {
    this.processRunner = processRunner;
  }
  processRunner;
  logger;
  getName() {
    return "open:log";
  }
  setLogger(logger) {
    this.logger = logger;
  }
  async execute(args = []) {
    try {
      if (!args || args.length === 0) {
        throw new Error("Project directory is required");
      }
      const projectPath = args[0];
      this.logger?.info(`Preparing log command for project: ${projectPath}`);
      return `symfony server:log --dir=${projectPath}`;
    } catch (error) {
      this.logger?.error(`Command ${this.getName()} failed: ${error}`);
      throw error;
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
    this.registerCommand(new PhpInfoCommand(processRunner));
    this.registerCommand(new OpenLogCommand(processRunner));
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
    try {
      const command = this.commands.get(commandName);
      if (!command) {
        this.logger?.error(`Command ${commandName} not found`);
        throw new Error(`Command ${commandName} not found`);
      }
      return await command.execute(args);
    } catch (error) {
      this.logger?.error(`Error running command ${commandName}: ${error}`);
      throw error;
    }
  }
};

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

// src/extension.ts
var REFRESH_INTERVAL_SECONDS = 30;
var SymfonyMenubarExtension = class extends Extension {
  _indicator = null;
  _manager = null;
  _refreshTimer = null;
  enable() {
    const logger = new ConsoleLogger();
    const runner = new GjsProcessRunner(logger);
    this._manager = new SymfonyCliManager(runner);
    this._manager.setLogger(logger);
    this._indicator = new Indicator();
    Main.panel.addToStatusArea(this.uuid, this._indicator);
    this._refresh();
    this._refreshTimer = GLib.timeout_add_seconds(
      GLib.PRIORITY_DEFAULT,
      REFRESH_INTERVAL_SECONDS,
      () => {
        this._refresh();
        return GLib.SOURCE_CONTINUE;
      }
    );
  }
  disable() {
    if (this._refreshTimer !== null) {
      GLib.Source.remove(this._refreshTimer);
      this._refreshTimer = null;
    }
    this._indicator?.destroy();
    this._indicator = null;
    this._manager = null;
  }
  _refresh() {
    if (!this._manager || !this._indicator) return;
    const manager = this._manager;
    const indicator = this._indicator;
    manager.runCommand("local:php:list").then((versions) => {
      indicator.updatePhpStatus(versions, /* @__PURE__ */ new Map());
    }).catch((err) => {
      console.error("[SymfonyMenubar] PHP refresh failed:", err);
    });
  }
};
export {
  SymfonyMenubarExtension as default
};
