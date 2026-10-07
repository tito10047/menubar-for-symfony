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
git clone https://github.com/YOUR_USERNAME/menubar-for-symfony.git
cd menubar-for-symfony

# Install dependencies
npm install

# Clone the helper service next to it — the extension needs it to do anything
git clone https://github.com/tito10047/menubar-for-symfony-daemon ../menubar-for-symfony-daemon

# Build the extension
npm run build

# Compile GSettings schemas (required for settings to work)
npm run compile-schemas

# Build and install both, then reload the session (it asks first)
./install-local.sh
```

While working on the helper, `./install-local.sh --helper-only` rebuilds and swaps
it without touching the extension — no session reload needed.

## Project Structure

The project is split across **two repositories**. This one holds the GNOME Shell
extension; everything that runs the Symfony CLI lives in
[menubar-for-symfony-daemon](https://github.com/tito10047/menubar-for-symfony-daemon), and
the two talk over the session D-Bus.

That split was required by the extensions.gnome.org reviewers, so please do not
undo it: **the extension must never spawn a process or own a main loop timer.**
`publish.sh` and the release workflow assert this against the built bundle.

```
menubar-for-symfony/
├── src/
│   ├── shared/             # Mirrored with the helper repository
│   │   ├── dbus/           # The D-Bus contract, wire shapes and marshalling
│   │   ├── dto/            # Plain data types
│   │   └── logging/, interfaces/, types/, errors.ts
│   └── extension/
│       ├── extension.ts    # GNOME lifecycle; wires the menu to the helper
│       ├── core/dbus/      # Bus connection, proxy, typed client
│       ├── core/services/  # GSettings and .php-version access
│       └── ui/             # GNOME Shell UI components (Indicator, MenuItems)
├── schemas/                # GSettings XML schema (org.gnome.shell.extensions.menubar-for-symfony)
├── tests/unit/             # 100% mocked unit tests (fast, no system calls)
├── scripts/
│   ├── build.js            # esbuild bundling
│   └── check-contract.sh   # Diffs src/shared against the helper checkout
├── dist/extension/         # Bundled output (esbuild, never minified)
├── assets/                 # Static assets (icons)
└── metadata.json           # GNOME Shell extension metadata

../menubar-for-symfony-daemon/  # The helper service, cloned separately
```

### Changing the D-Bus contract

`src/shared/` exists in both repositories and both compile it, which is what keeps
the interface, its field names and its marshalling from drifting apart. After
changing anything there:

1. copy the files to the other repository,
2. run `npm run check-contract` to confirm they match,
3. bump `API_VERSION` in `src/shared/dbus/protocol.ts` if the change is
   incompatible — the extension compares it with the daemon's at runtime and tells
   the user to update the helper rather than failing obscurely.

## Testing Strategy
- **Unit Tests (`tests/unit/`)**: Use mocks for everything. No shell or system calls. These must be fast and environment-independent. `DaemonClientInterface` is the seam to mock.
- **Anything needing a real bus, variant or subprocess** is tested in the helper repository, where `npm run test:dbus` drives the built daemon under `dbus-run-session` with `gdbus`. It cannot be tested here: the `@girs` packages are type definitions only, so GJS API is not callable under Node.
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
