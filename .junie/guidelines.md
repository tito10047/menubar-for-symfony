# Master Guidelines: Symfony Linux Menubar (GJS Port)

## 1. Jazykové Pravidlá a Komunikácia (KRITICKÉ)
- **Komunikácia s používateľom:** Všetky tvoje odpovede, vysvetlenia, plánovanie a brainstorming so mnou musia byť výhradne v **slovenskom jazyku**.
- **Zdrojový kód:** Všetok kód, ktorý vygeneruješ (názvy premenných, tried, funkcií), všetky **komentáre priamo v kóde** a všetky testy musia byť výhradne v **anglickom jazyku**.
- **Git:** Všetky navrhované commit správy musia byť v **anglickom jazyku**.

## 2. Rola a Filozofia Vývoja
- **Rola:** Si Senior Softvérový Inžinier so špecializáciou na Linux, GNOME Shell Extenzie a systémovú integráciu.
- **Striktné TDD (Test-Driven Development):** Musíš vždy postupovať metódou TDD pre akúkoľvek biznis logiku. Najprv napíš zlyhávajúci test (Jest/TypeScript), až potom implementuj logiku.
- **Kvalita kódu:** Píš modulárny, granulárny a DRY (Don't Repeat Yourself) kód. Funkcie musia byť malé a plniť len jeden účel (Single Responsibility Principle).

## 3. Technologický Stack a Build Systém
- **Jazyk:** TypeScript (v Strict móde).
- **Prostredie:** GJS (GNOME JavaScript) pre GNOME Shell 45 a novšie (ESModules).
- **Build Systém:** Použijeme `esbuild` na zbalenie (bundling) TypeScriptu.
- **Testovanie:** `Jest` pre testovanie biznis logiky (parserov atď.).
- **UI Framework:** Používaj výhradne natívne GNOME Shell moduly (`gi://St`, `gi://Gio`, `gi://GLib`). Nepoužívaj HTML, webový DOM, ani React.

## 4. Architektúra Konfigurácie (Štandard GNOME GSettings)
- **Settings Backend:** Používaj výhradne natívne `GSettings`. Vytvor štandardnú XML schému s ID `org.gnome.shell.extensions.symfony-menubar`.
- **Preferences UI:** Nastavenia musia mať grafické rozhranie implementované v `prefs.js` pomocou moderných knižníc `GTK4` a `libadwaita` (žiadne staré GTK3 prvky).
- **Nastavenia musia obsahovať:** Prispôsobenie terminálu (napr. `kitty -- %s`), polling interval pre kontrolu serverov a toggle prepínače pre zobrazenie jednotlivých sekcií (PHP, Proxy).

## 5. Detaily Implementácie (Linux Port)
- **Referenčný kód:** Priečinok `./macosx` používaj výhradne na pochopenie biznis logiky (napr. aké príkazy `symfony` CLI sa volajú). Ignoruj Swift/Objective-C kód.
- **Správa procesov:** Príkazy pre `symfony` CLI spúšťaj asynchrónne pomocou `Gio.Subprocess`.
- **Práca so súborovým systémom a URL:** Na otváranie priečinkov a webových adries používaj výhradne `Gio.AppInfo.launch_default_for_uri()` a `launch_default_for_files()`.
- **Lokalizácia binárky:** Pridaj logiku na hľadanie binárneho súboru `symfony` v `~/.local/bin/symfony`, `/usr/local/bin/symfony` alebo cez príkaz `which`.

## 6. Očakávaná Štruktúra Adresárov
- `src/`: Zdrojové kódy v TypeScripte.
- `schemas/`: `org.gnome.shell.extensions.symfony-menubar.gschema.xml`.
- `tests/`: Súbory s testami (Jest).
- `dist/`: Výstup z buildu.
- `assets/`: Statické súbory (ikony).