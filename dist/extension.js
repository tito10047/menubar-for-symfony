// src/extension.ts
import GLib from "gi://GLib";
import Gio2 from "gi://Gio";
import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

// src/ui/Indicator.ts
import GObject6 from "gi://GObject";
import { Button } from "resource:///org/gnome/shell/ui/panelMenu.js";
import { PopupSeparatorMenuItem as PopupSeparatorMenuItem2, PopupMenuSection } from "resource:///org/gnome/shell/ui/popupMenu.js";
import St6 from "gi://St";
import Clutter5 from "gi://Clutter";

// src/ui/components/PhpVersionItem.ts
import GObject from "gi://GObject";
import St from "gi://St";
import Clutter from "gi://Clutter";
import { PopupBaseMenuItem } from "resource:///org/gnome/shell/ui/popupMenu.js";
var BADGE_STYLE_ENABLED = "font-size: 10px; background-color: rgba(74, 222, 128, 0.20); color: #4ade80; padding: 2px 6px; border-radius: 4px; margin-right: 8px;";
var BADGE_STYLE_INSTALLED = "font-size: 10px; background-color: rgba(255,255,255,0.06); color: rgba(255,255,255,0.35); padding: 2px 6px; border-radius: 4px; margin-right: 8px;";
var PhpVersionItem = GObject.registerClass(
  class PhpVersionItem2 extends PopupBaseMenuItem {
    _init(params = {}) {
      super._init({ reactive: false });
      const box = new St.BoxLayout({
        x_expand: true,
        y_align: Clutter.ActorAlign.CENTER
      });
      this._dot = new St.Label({
        text: "\u25CF  ",
        style: "color: #888888;"
      });
      this._versionLabel = new St.Label({ text: "\u2014" });
      this._versionLabel.set_x_expand(true);
      this._badgeContainer = new St.BoxLayout({});
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
     * - ENABLED extensions get a green badge
     * - INSTALLED (but not enabled) extensions get a muted badge
     * - NOT_INSTALLED extensions produce no badge
     */
    updateBadges(info) {
      this._badgeContainer.destroy_all_children();
      const entries = [
        [info.opcache, "OPcache"],
        [info.xdebug, "Xdebug"],
        [info.apcu, "APCu"]
      ];
      for (const [status, label] of entries) {
        const badge = this._makeBadge(label, status);
        if (badge) this._badgeContainer.add_child(badge);
      }
    }
    _makeBadge(label, status) {
      if (status === "enabled" /* ENABLED */) {
        return new St.Label({ text: label, style: BADGE_STYLE_ENABLED });
      }
      if (status === "installed" /* INSTALLED */) {
        return new St.Label({ text: label, style: BADGE_STYLE_INSTALLED });
      }
      return null;
    }
  }
);

// src/ui/components/ServerMenuItem.ts
import GObject2 from "gi://GObject";
import St2 from "gi://St";
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
      this._directory = params.directory;
      this._onToggleFavorite = params.onToggleFavorite;
      this._portLabel = null;
      this._dot = new St2.Label({
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
      this._portLabel = new St2.Label({
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
      this.menu.addMenuItem(new PopupSeparatorMenuItem());
      const label = this._isFavorite ? "\u2B50 Remove from favorites" : "\u2606 Add to favorites";
      const favItem = new PopupMenuItem(label);
      favItem.connect("activate", () => this._onToggleFavorite?.(this._directory));
      this.menu.addMenuItem(favItem);
    }
  }
);

// src/ui/components/ServerRowItem.ts
import GObject3 from "gi://GObject";
import St3 from "gi://St";
import Clutter3 from "gi://Clutter";
import * as PopupMenu2 from "resource:///org/gnome/shell/ui/popupMenu.js";
var RUNNING_COLOR2 = "#4ade80";
var STOPPED_COLOR2 = "#888888";
var ServerRowItem = GObject3.registerClass(
  class ServerRowItem2 extends PopupMenu2.PopupBaseMenuItem {
    _init(params) {
      super._init({ reactive: false });
      this._directory = params.directory;
      this._isRunning = params.isRunning;
      this._isFavorite = params.isFavorite;
      this._onStart = params.onStart;
      this._onStop = params.onStop;
      this._onOpenBrowser = params.onOpenBrowser;
      this._onToggleFavorite = params.onToggleFavorite;
      this._dot = new St3.Label({
        text: "\u25CF ",
        style: `color: ${params.isRunning ? RUNNING_COLOR2 : STOPPED_COLOR2};`,
        y_align: Clutter3.ActorAlign.CENTER
      });
      const nameLabel = new St3.Label({
        text: params.name,
        x_expand: true,
        y_align: Clutter3.ActorAlign.CENTER
      });
      this._portLabel = new St3.Label({
        text: params.port ? `:${params.port}` : "",
        style: "color: rgba(255, 255, 255, 0.4); font-size: 12px; margin-right: 8px;",
        y_align: Clutter3.ActorAlign.CENTER,
        visible: !!params.port
      });
      this._startStopBtn = this._makeIconButton(
        params.isRunning ? "media-playback-stop-symbolic" : "media-playback-start-symbolic"
      );
      this._browserBtn = this._makeIconButton("web-browser-symbolic");
      this._browserBtn.visible = params.isRunning;
      this._favoriteBtn = this._makeIconButton(
        params.isFavorite ? "starred-symbolic" : "non-starred-symbolic"
      );
      const buttonBox = new St3.BoxLayout({
        y_align: Clutter3.ActorAlign.CENTER
      });
      buttonBox.add_child(this._startStopBtn);
      buttonBox.add_child(this._browserBtn);
      buttonBox.add_child(this._favoriteBtn);
      this.add_child(this._dot);
      this.add_child(nameLabel);
      this.add_child(this._portLabel);
      this.add_child(buttonBox);
      this._connectSignals();
    }
    updateStatus(isRunning) {
      this._isRunning = isRunning;
      this._dot.set_style(`color: ${isRunning ? RUNNING_COLOR2 : STOPPED_COLOR2};`);
      this._startStopBtn.get_child()?.set_icon_name(
        isRunning ? "media-playback-stop-symbolic" : "media-playback-start-symbolic"
      );
      this._browserBtn.visible = isRunning;
    }
    updatePort(port) {
      this._portLabel.set_text(port ? `:${port}` : "");
      this._portLabel.visible = !!port;
    }
    updateFavorite(isFavorite) {
      this._isFavorite = isFavorite;
      this._favoriteBtn.get_child()?.set_icon_name(isFavorite ? "starred-symbolic" : "non-starred-symbolic");
    }
    // ---- private helpers ----
    _makeIconButton(iconName) {
      const icon = new St3.Icon({
        icon_name: iconName,
        icon_size: 12,
        style: "color: rgba(255,255,255,0.7);"
      });
      return new St3.Button({
        child: icon,
        style: "padding: 2px 4px; background: transparent; border: none;",
        can_focus: true,
        x_align: Clutter3.ActorAlign.CENTER,
        y_align: Clutter3.ActorAlign.CENTER
      });
    }
    _connectSignals() {
      this._startStopBtn.connect("clicked", () => {
        if (this._isRunning) {
          this._onStop(this._directory);
        } else {
          this._onStart(this._directory);
        }
      });
      this._browserBtn.connect("clicked", () => {
        this._onOpenBrowser(this._directory);
      });
      this._favoriteBtn.connect("clicked", () => {
        this._onToggleFavorite(this._directory);
      });
    }
  }
);

// src/ui/components/FavoriteServersGroup.ts
import GObject4 from "gi://GObject";
import * as PopupMenu3 from "resource:///org/gnome/shell/ui/popupMenu.js";
var FavoriteServersGroup = GObject4.registerClass(
  class FavoriteServersGroup2 extends PopupMenu3.PopupSubMenuMenuItem {
    _init() {
      super._init("\u{1F4C1} Other servers");
      this._serverMap = /* @__PURE__ */ new Map();
    }
    /**
     * Registers a pre-created ServerRowItem under `directory` as the
     * canonical key (matches SymfonyServer.directory), and appends it to the submenu.
     */
    addServer(directory, item) {
      this._serverMap.set(directory, item);
      this.menu.addMenuItem(item);
    }
    getServer(directory) {
      return this._serverMap.get(directory);
    }
    removeServer(directory) {
      const item = this._serverMap.get(directory);
      if (!item) return;
      item.destroy();
      this._serverMap.delete(directory);
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
import GObject5 from "gi://GObject";
import St4 from "gi://St";
import Clutter4 from "gi://Clutter";
import * as PopupMenu4 from "resource:///org/gnome/shell/ui/popupMenu.js";
import { PopupMenuItem as PopupMenuItem2 } from "resource:///org/gnome/shell/ui/popupMenu.js";
var RUNNING_COLOR3 = "#4ade80";
var STOPPED_COLOR3 = "#888888";
var ProxyMenuItem = GObject5.registerClass(
  class ProxyMenuItem2 extends PopupMenu4.PopupSubMenuMenuItem {
    _init() {
      super._init("Proxy: stopped");
      this._dot = new St4.Label({
        text: "\u25CF  ",
        style: `color: ${STOPPED_COLOR3};`,
        y_align: Clutter4.ActorAlign.CENTER
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
      this._dot.set_style(`color: ${isRunning ? RUNNING_COLOR3 : STOPPED_COLOR3};`);
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

// src/ui/components/SectionHeader.ts
import St5 from "gi://St";
import { PopupBaseMenuItem as PopupBaseMenuItem3 } from "resource:///org/gnome/shell/ui/popupMenu.js";
function createSectionHeader(text, options) {
  const header = new PopupBaseMenuItem3({ reactive: false });
  const label = new St5.Label({
    text: text.toUpperCase(),
    style: "font-size: 11px; font-weight: bold; color: rgba(255, 255, 255, 0.4); padding-top: 5px; padding-bottom: 2px;",
    x_expand: true
  });
  label.clutter_text.ellipsize = 0;
  header.add_child(label);
  if (options?.onRefresh) {
    const btn = new St5.Button({
      label: "\u21BA",
      reactive: true,
      track_hover: true,
      style: "font-size: 14px; color: rgba(255,255,255,0.5); padding: 0 4px;"
    });
    btn.connect("notify::hover", () => {
      if (btn.hover) {
        btn.set_style("font-size: 14px; color: rgba(255,255,255,0.9); padding: 0 4px;");
      } else {
        btn.set_style("font-size: 14px; color: rgba(255,255,255,0.5); padding: 0 4px;");
      }
    });
    btn.connect("clicked", options.onRefresh);
    header.add_child(btn);
  }
  return header;
}

// src/ui/Indicator.ts
var Indicator = GObject6.registerClass(
  class Indicator2 extends Button {
    _init(params) {
      super._init(0, "Symfony Menubar", false);
      this._favoritesRepository = params.favoritesRepository;
      this._onRefresh = params.onRefresh;
      this._onStartServer = params.onStartServer;
      this._onStopServer = params.onStopServer;
      this._onOpenBrowser = params.onOpenBrowser;
      const topLabel = new St6.Label({
        text: "sf",
        y_align: Clutter5.ActorAlign.CENTER
      });
      this.add_child(topLabel);
      const menu = this.menu;
      menu.addMenuItem(createSectionHeader("PHP", { onRefresh: params.onRefresh }));
      this._phpSection = new PopupMenuSection();
      menu.addMenuItem(this._phpSection);
      menu.addMenuItem(new PopupSeparatorMenuItem2());
      menu.addMenuItem(createSectionHeader("Servers"));
      this._serverSection = new PopupMenuSection();
      menu.addMenuItem(this._serverSection);
      this._otherServersGroup = new FavoriteServersGroup();
      menu.addMenuItem(this._otherServersGroup);
      menu.addMenuItem(new PopupSeparatorMenuItem2());
      menu.addMenuItem(createSectionHeader("Proxy"));
      this._proxyItem = new ProxyMenuItem();
      menu.addMenuItem(this._proxyItem);
    }
    // ---- Public update API ----
    /**
     * Refreshes the PHP section with all available versions.
     * Default version gets a green dot; others get a gray dot.
     */
    updatePhpStatus(versions, phpInfoMap) {
      this._phpSection.removeAll();
      for (const version of versions) {
        const item = new PhpVersionItem();
        item.updateVersion(version.version);
        item.updateStatus(version.isDefault);
        const info = phpInfoMap.get(version.version);
        if (info) item.updateBadges(info);
        this._phpSection.addMenuItem(item);
      }
    }
    /**
     * Fully rebuilds the server sections from the given list.
     * Favorite servers (by directory) are shown directly; others go into the
     * collapsible "Other servers" group.
     */
    updateServerStatus(servers) {
      this._serverSection.removeAll();
      this._otherServersGroup.clear();
      for (const server of servers) {
        const isFav = this._favoritesRepository.isFavorite(server.directory);
        const name = server.directory.split("/").pop() ?? server.directory;
        const port = server.isRunning ? String(server.port) : "";
        const onToggleFavorite = (dir) => {
          if (this._favoritesRepository.isFavorite(dir)) {
            this._favoritesRepository.remove(dir);
          } else {
            this._favoritesRepository.add(dir);
          }
          this._onRefresh?.();
        };
        if (isFav) {
          const item = new ServerMenuItem({
            directory: server.directory,
            name,
            port,
            isRunning: server.isRunning,
            isFavorite: true,
            onToggleFavorite
          });
          this._serverSection.addMenuItem(item);
        } else {
          const item = new ServerRowItem({
            directory: server.directory,
            name,
            port,
            isRunning: server.isRunning,
            isFavorite: false,
            onStart: this._onStartServer,
            onStop: this._onStopServer,
            onOpenBrowser: this._onOpenBrowser,
            onToggleFavorite
          });
          this._otherServersGroup.addServer(server.directory, item);
        }
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
      let headerLine = lines.find((l) => l.includes("Version") && l.includes("Directory"));
      let versionIdx = -1, directoryIdx = -1, phpCliIdx = -1;
      if (headerLine) {
        const parts = headerLine.split("|").map((p) => p.trim());
        versionIdx = parts.indexOf("Version");
        directoryIdx = parts.indexOf("Directory");
        phpCliIdx = parts.indexOf("PHP CLI");
      }
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("\u2500") || trimmed.startsWith("\u250C") || trimmed.startsWith("\u2514") || trimmed.startsWith("\u251C") || trimmed.startsWith("+") || trimmed.startsWith("-") || trimmed.includes("Version")) {
          continue;
        }
        let version = "";
        let path = "";
        let isDefault = false;
        if (versionIdx !== -1 && line.includes("|")) {
          const parts = line.split("|").map((p) => p.trim());
          version = parts[versionIdx].replace(/[*⭐]|\(default\)/g, "").trim();
          isDefault = parts[versionIdx].includes("*") || parts[versionIdx].includes("\u2B50") || parts[versionIdx].toLowerCase().includes("default") || line.includes("*") || line.includes("\u2B50");
          const directory = directoryIdx !== -1 ? parts[directoryIdx] : "";
          const phpCli = phpCliIdx !== -1 ? parts[phpCliIdx] : "";
          if (directory && phpCli) {
            path = directory.endsWith("/") ? `${directory}${phpCli}` : `${directory}/${phpCli}`;
          } else if (directory) {
            path = directory;
          } else if (phpCli) {
            path = phpCli;
          }
        } else {
          const versionRegex = /(\d+\.\d+(?:\.\d+)?)/;
          const pathRegex = /(\/[^\s│|]+)/;
          const versionMatch = trimmed.match(versionRegex);
          if (!versionMatch) continue;
          version = versionMatch[1];
          isDefault = trimmed.toLowerCase().includes("default") || trimmed.includes("*") || trimmed.includes("\u2B50");
          const pathMatch = trimmed.match(pathRegex);
          path = pathMatch ? pathMatch[1] : "";
        }
        if (version && !versions.find((v) => v.version === version)) {
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
var EXTENSION_STATUS_SCRIPT = `$dir = ini_get('extension_dir'); $loaded = array_map('strtolower', get_loaded_extensions()); foreach(['xdebug','apcu','opcache'] as $e) { $inst = file_exists($dir.'/'.$e.'.so') ? 1 : 0; $enab = in_array($e, $loaded) ? 1 : 0; echo $e.':'.$inst.':'.$enab.PHP_EOL; }`;
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
    let phpBin = args.length > 0 && args[0].trim() !== "" ? args[0] : "php";
    if (phpBin.match(/^\d+\.\d+/)) {
      this.logger?.warn(`PhpInfoCommand received version ${phpBin} instead of path. Trying to use it as is.`);
    }
    this.logger?.info(`Executing command ${commandName} using binary: ${phpBin}`);
    try {
      const iniOutput = await this.processRunner.run([phpBin, "--ini"]);
      const extensionOutput = await this.processRunner.run([phpBin, "-r", EXTENSION_STATUS_SCRIPT]);
      const phpIniPath = this.parseIniPath(iniOutput);
      return {
        phpIniPath,
        xdebug: this.parseExtensionStatus("xdebug", extensionOutput),
        apcu: this.parseExtensionStatus("apcu", extensionOutput),
        opcache: this.parseExtensionStatus("opcache", extensionOutput)
      };
    } catch (error) {
      this.logger?.error(`Command ${commandName} failed`, error);
      throw error;
    }
  }
  parseExtensionStatus(name, output) {
    const match = output.match(new RegExp(`^${name}:(\\d):(\\d)`, "m"));
    if (!match) return "not_installed" /* NOT_INSTALLED */;
    const enabled = match[2] === "1";
    const installed = match[1] === "1";
    if (enabled) return "enabled" /* ENABLED */;
    if (installed) return "installed" /* INSTALLED */;
    return "not_installed" /* NOT_INSTALLED */;
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

// src/core/services/FavoritesRepository.ts
var FavoritesRepository = class {
  constructor(settings) {
    this.settings = settings;
  }
  settings;
  getAll() {
    return this.settings.get_strv("favorite-servers");
  }
  add(directory) {
    const current = this.getAll();
    if (current.includes(directory)) return;
    this.settings.set_strv("favorite-servers", [...current, directory]);
  }
  remove(directory) {
    this.settings.set_strv(
      "favorite-servers",
      this.getAll().filter((d) => d !== directory)
    );
  }
  isFavorite(directory) {
    return this.getAll().includes(directory);
  }
  onChange(callback) {
    this.settings.connect("changed::favorite-servers", callback);
  }
};

// src/extension.ts
var REFRESH_INTERVAL_SECONDS = 30;
var SymfonyMenubarExtension = class extends Extension {
  _indicator = null;
  _manager = null;
  _logger = null;
  _refreshTimer = null;
  _lastServers = null;
  enable() {
    this._logger = new ConsoleLogger();
    this._logger.info("Enabling extension");
    const runner = new GjsProcessRunner(this._logger);
    this._manager = new SymfonyCliManager(runner);
    this._manager.setLogger(this._logger);
    const settings = this.getSettings();
    const favoritesRepository = new FavoritesRepository(settings);
    this._indicator = new Indicator({
      onRefresh: () => this._refresh(),
      favoritesRepository,
      onStartServer: async (dir) => {
        await this._manager?.runCommand("server:start", [dir]);
        this._refresh();
      },
      onStopServer: async (dir) => {
        await this._manager?.runCommand("server:stop", [dir]);
        this._refresh();
      },
      onOpenBrowser: (dir) => {
        const server = this._lastServers?.find((s) => s.directory === dir);
        if (server?.url) Gio2.AppInfo.launch_default_for_uri(server.url, null);
      }
    });
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
    this._logger?.info("Disabling extension");
    if (this._refreshTimer !== null) {
      GLib.Source.remove(this._refreshTimer);
      this._refreshTimer = null;
    }
    this._indicator?.destroy();
    this._indicator = null;
    this._manager = null;
    this._logger = null;
    this._lastServers = null;
  }
  _refresh() {
    if (!this._manager || !this._indicator) return;
    const manager = this._manager;
    const indicator = this._indicator;
    manager.runCommand("local:php:list").then(async (versions) => {
      const phpInfoMap = /* @__PURE__ */ new Map();
      for (const version of versions) {
        try {
          const info = await manager.runCommand("php:info", [version.path]);
          phpInfoMap.set(version.version, info);
        } catch (err) {
          this._logger?.error(`php:info failed for ${version.version}:`, err);
        }
      }
      indicator.updatePhpStatus(versions, phpInfoMap);
    }).catch((err) => {
      this._logger?.error("PHP refresh failed:", err);
    });
    manager.runCommand("server:list").then((servers) => {
      this._lastServers = servers;
      indicator.updateServerStatus(servers);
    }).catch((err) => {
      this._logger?.error("Server list refresh failed:", err);
    });
  }
};
export {
  SymfonyMenubarExtension as default
};
