# Contributing to Menu Bar for Symfony (GNOME Port)

Thank you for your interest in contributing to Menu Bar for Symfony for GNOME! This project is a port of the macOS version, adapted for Linux and GNOME Shell using GJS (GNOME JavaScript).

## Code of Conduct
Be respectful, constructive, and professional in all interactions.

## How to Contribute

### Reporting Bugs
1. Check if the bug has already been reported in [Issues](https://github.com/tito10047/menubar-for-symfony/issues)
2. If not, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - GNOME Shell version and Symfony CLI version
   - Screenshots if applicable

### Suggesting Features
1. Check existing issues for similar suggestions
2. Create a new issue with `[Feature Request]` prefix
3. Describe the feature and its use case
4. Explain why it would benefit users

### Pull Requests
1. **Fork the repository** and create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Make your changes** following the code style:
   - Use **TypeScript** (Strict mode).
   - Follow GJS best practices for ESModules.
   - UI must use native GNOME Shell modules (`gi://St`, `gi://Gio`, `gi://GLib`).
   - Preferences UI must use **GTK4** and **Libadwaita**.
3. **Strict TDD (Test-Driven Development)**:
   - For any business logic, you MUST write a failing test in **Jest** before implementing the logic.
4. **Test your changes**:
   ```bash
   npm run build
   npm run test
   npm run test:integration # If you have symfony-cli installed locally
   ```
5. **Commit with clear messages** (in English):
   ```bash
   git commit -m "Add feature: description of what changed"
   ```
   - Use present tense ("Add feature" not "Added feature").
   - Reference issues: "Fixes #123".
6. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```
   - Fill out the PR template.
   - Link related issues.
   - Add screenshots for UI changes.

## Development Setup

### Requirements
- Linux with **GNOME Shell 45** or newer.
- **Node.js** and **npm**.
- [Symfony CLI](https://symfony.com/download) installed and available in your `PATH`.
- `librsvg` (if you plan to generate/manipulate icons).

### Building from Source
```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/symfony-cli-menubar.git
cd symfony-cli-menubar

# Install dependencies
npm install

# Build both the extension and the helper daemon
npm run build

# Compile GSettings schemas (required for settings to work)
npm run compile-schemas

# Install both locally for testing
# WARNING: This script will force a logout from your current GNOME session!
./install-local.sh
```

The extension needs the helper daemon to do anything. `install-local.sh` installs
both; to install only the helper after a change, run `npm run install-daemon`.

## Project Structure

The project is **two programs** built from one source tree: the GNOME Shell
extension, and a helper daemon that runs the Symfony CLI on its behalf. They talk
over D-Bus. The extension starts no processes and owns no timers — that split was
required by the extensions.gnome.org reviewers, so please do not undo it.

```
symfony-cli-menubar/
├── src/
│   ├── shared/             # Compiled into both programs
│   │   ├── dbus/           # The D-Bus contract, wire shapes and marshalling
│   │   ├── dto/            # Plain data types
│   │   └── logging/, interfaces/, errors.ts
│   ├── extension/          # -> dist/extension/extension.js
│   │   ├── extension.ts    # GNOME lifecycle; wires the menu to the daemon
│   │   ├── core/dbus/      # Bus connection, proxy, typed client
│   │   ├── core/services/  # GSettings and .php-version access
│   │   └── ui/             # GNOME Shell UI components (Indicator, MenuItems)
│   └── daemon/             # -> dist/daemon/symfony-menubar-daemon.js
│       ├── main.ts         # CLI, bus name ownership, --install-service
│       ├── core/           # Command classes, parsers, the only subprocesses
│       └── shell/          # argv building (never shell strings)
├── daemon/                 # install.sh / uninstall.sh for the helper
├── schemas/                # GSettings XML schema (org.gnome.shell.extensions.symfony-menubar)
├── tests/
│   ├── unit/               # 100% mocked unit tests (fast, no system calls)
│   ├── integration/        # Tests calling the real symfony-cli binary
│   └── dbus/               # End-to-end test of the daemon on a private bus
├── scripts/build.js        # esbuild bundling for both targets
├── dist/                   # Bundled JavaScript output (esbuild)
├── assets/                 # Static assets (icons)
└── metadata.json           # GNOME Shell extension metadata
```

Build a single target while working on it: `npm run build extension` or
`npm run build daemon`. `npm run typecheck` is the quality gate — the daemon's
tsconfig deliberately hides St/Clutter, so shell API cannot leak into it.

## Testing Strategy
- **Unit Tests (`tests/unit/`)**: Use mocks for everything. No shell or system calls. These must be fast and environment-independent. `ProcessRunnerInterface` is the daemon's seam, `DaemonClientInterface` the extension's.
- **Integration Tests (`tests/integration/`)**: These call the real `symfony` CLI. Run them with `RUN_INTEGRATION=1 npm run test:integration`.
- **D-Bus End-to-End (`tests/dbus/`)**: `npm run test:dbus` runs the bundled daemon under `dbus-run-session` and drives it with `gdbus`. This covers the exported interface, variant marshalling, error mapping and signals — none of which can run under Node, because the girs packages are types only.
- **Debug Mode (tests)**: To see raw communication with the shell during tests, use `DEBUG=1`.
- **Debug Mode (extension)**: To see verbose extension logs in the system journal, enable the `debug-logging` GSettings key (see [Debug Logging](../README.md#debug-logging) in the README). Errors and warnings are always logged regardless of this setting.

## Code Style Guidelines
1. **Language**:
   - Source code, comments, and commit messages must be in **English**.
   - Communication with the maintainer (issues, PR discussions) can be in **Slovak**.
2. **Naming**:
   - Classes: `PascalCase` (e.g., `SymfonyServerManager`).
   - Functions/Variables: `camelCase` (e.g., `refreshServers()`).
3. **Refactoring**:
   - If you modify old code, refactor it to modern, modular, and DRY standards.
   - Functions should be small and have a Single Responsibility.
4. **Logging**:
   - Every important operation (process start, parsing, setting changes) must be logged using the `LoggerInterface`.
   - Use `debug()`/`info()` for verbose diagnostic messages (suppressed by default; controlled by the `debug-logging` GSettings key).
   - Use `warn()`/`error()` for issues that should always be visible in the journal.

## Iconography
This project uses standard GNOME symbolic icons. For consistency and inspiration, refer to:
[GNOME 46 Adwaita Icons](https://github.com/StorageB/icons/blob/main/GNOME46Adwaita/icons.md)

## License
By contributing, you agree that your contributions will be licensed under the GNU General Public License v2.0 or later (GPL-2.0-or-later).
