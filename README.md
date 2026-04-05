# Symfony CLI Menu Bar

> A native Gnome menu bar app for managing local [Symfony CLI](https://github.com/symfony-cli/symfony-cli) servers.

![Symfony CLI Menu Bar](assets/hero.png)

Access, start, and stop your local Symfony servers from the menu bar. Open them in your browser, view logs, manage PHP versions and proxy domains — without leaving your current context.

## Features

- **Server management**: view all your Symfony local servers at a glance; start and stop them directly from the menu
- **One-click browser open**: open any running server in your default browser instantly
- **Server logs**: jump straight to `symfony server:log` in Terminal, pre-filled for the right project
- **PHP versions**: see all installed PHP versions and set the default
- **Proxy domains**: manage `.wip` Symfony proxy domains
- **Auto-updates**: built-in update notifications powered by Sparkle
- **Start at Login**: optionally launch on login so it is always available

## Requirements

- gnome 49.0 or later
- [Symfony CLI](https://symfony.com/download) installed and available in your `PATH`

## Installation
### Download (recommended)

TODO: this package will be available by default distro package managers soon.

### Build from Source

```bash
git clone https://github.com/tito10047/symfony-cli-menubar
cd symfony-cli-menubar

# Build and package
# this process will logout you from your current session
npm install
./install-local.sh

```


## MacOS X version

see [smnandre/symfony-cli-menubar](https://github.com/smnandre/symfony-cli-menubar)

## Contributing

Contributions are welcome. Please open an issue before submitting a pull request for significant changes.
See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for development guidelines.

## Thanks

Symfony CLI Menu Bar builds on top of remarkable open source work.

**[Symfony](https://symfony.com)**: the PHP framework this whole ecosystem is built on.
Fabien Potencier [@fabpot](https://github.com/fabpot) and the Symfony contributors.

**[Symfony CLI](https://github.com/symfony-cli/symfony-cli)**: the local server tooling this app brings to your menu
bar.
Fabien Potencier [@fabpot](https://github.com/fabpot) and Tugdual Saunier [@tucksaun](https://github.com/tucksaun).

## License

Released by [Jozef  Môstka](https://vsetkosada.sk/en) under the [MIT License](LICENSE).

This project is inspired by [Symfony CLI](https://github.com/smnandre/symfony-cli-menubar) by [@smnandre](https://github.com/smnandre).

"Symfony" and the Symfony logo are registered trademarks of [Symfony SAS](https://symfony.com).  

