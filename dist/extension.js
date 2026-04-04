// src/extension.ts
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

// src/extension.ts
var SymfonyMenubarExtension = class extends Extension {
  _indicator = null;
  enable() {
    this._indicator = new Indicator();
    Main.panel.addToStatusArea(this.uuid, this._indicator);
  }
  disable() {
    this._indicator?.destroy();
    this._indicator = null;
  }
};
export {
  SymfonyMenubarExtension as default
};
