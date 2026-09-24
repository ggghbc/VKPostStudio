# Getting Started & Build Guide

This guide walks you through setting up a development environment, running the application in hot-reload mode, and compiling production binaries for Windows and other desktop platforms.

---

## 1. Prerequisites

To build and run **VK Post Studio**, ensure your development machine has the following tools installed:

### 1.1 Node.js & Package Manager
- **Node.js**: Version `20.x` or higher (LTS recommended).
- **npm**: Version `10.x` or higher (bundled with Node.js) or `pnpm` / `yarn`.

Verify your installation:
```bash
node -v
npm -v
```

### 1.2 Rust Toolchain
- **Rust Compiler & Cargo**: Rust `1.77` or higher (2021 edition).
- Install via [rustup.rs](https://rustup.rs/):
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```
Verify your installation:
```bash
rustc --version
cargo --version
```

### 1.3 Platform-Specific Prerequisites

#### Windows (Primary Target)
1. **Microsoft C++ Build Tools**:
   - Download the Visual Studio Installer and install the **"Desktop development with C++"** workload.
   - Required for compiling native Rust crates (`sqlx`, `ring`, etc.).
2. **Microsoft Edge WebView2**:
   - Pre-installed on Windows 10 (version 1803+) and Windows 11.
   - If missing, download the evergreen runtime from Microsoft.

#### Linux (Debian / Ubuntu)
Install the required WebKitGTK and system libraries:
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

#### macOS
Install Xcode Command Line Tools:
```bash
xcode-select --install
```

---

## 2. Project Setup

### 2.1 Clone the Repository
```bash
git clone https://github.com/ggghbc/VKPostingTool.git
cd VKPostingTool
```

### 2.2 Install Frontend Dependencies
```bash
npm install
```

This installs:
- `@tauri-apps/api`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-opener`
- `react`, `react-dom` (React 19)
- `tailwindcss`, `postcss`, `autoprefixer`
- `lucide-react`, `date-fns`
- `typescript`, `vite`

---

## 3. Running in Development Mode

To start the Vite frontend development server along with the native Tauri application window with hot module replacement (HMR):

```bash
npm run tauri dev
```

### What Happens Behind the Scenes:
1. Vite starts the local HTTP frontend server on `http://localhost:1420`.
2. Cargo downloads and compiles all Rust crates listed in `src-tauri/Cargo.toml`.
3. SQLite database `studio.sqlite` is initialized in `%APPDATA%/com.vkpoststudio.app/` (or `~/.local/share/` on Linux).
4. The native desktop window appears at `1280x820` resolution with live reload enabled.

---

## 4. Building for Production

To create an optimized, standalone executable and installer package:

```bash
npm run tauri build
```

### Build Artifacts
Upon a successful build, installers and binaries are generated in:

- **Windows**:
  - Standalone EXE: `src-tauri/target/release/vk-post-studio.exe`
  - NSIS Installer (`.exe`): `src-tauri/target/release/bundle/nsis/`
  - MSI Installer (`.msi`): `src-tauri/target/release/bundle/msi/`
- **Linux**:
  - Deb package: `src-tauri/target/release/bundle/deb/`
  - AppImage: `src-tauri/target/release/bundle/appimage/`
- **macOS**:
  - DMG / App bundle: `src-tauri/target/release/bundle/dmg/`

---

## 5. Configuration Files

| File | Description |
|---|---|
| `package.json` | Frontend dependencies, build scripts, Vite runner |
| `tsconfig.json` | TypeScript compiler configuration (strict mode) |
| `vite.config.ts` | Vite configuration, port `1420`, Tauri HMR integration |
| `tailwind.config.js` | Tailwind utility class configuration |
| `src-tauri/tauri.conf.json` | Core Tauri manifest (window dimensions, bundle identifier, CSP) |
| `src-tauri/Cargo.toml` | Rust backend dependencies, optimization profiles |
| `src-tauri/capabilities/default.json` | Tauri 2.0 permissions (`dialog:default`, `fs:default`, `core:default`) |
| `src-tauri/migrations/001_initial.sql` | Baseline SQLite schema |

---

## 6. Common Build Troubleshooting

### Error: "link.exe not found" or "MSVC toolchain missing"
- **Cause**: Visual Studio C++ build tools are not installed or not in system `PATH`.
- **Solution**: Open the Visual Studio Installer, ensure **Desktop development with C++** is checked, and restart your shell.

### Error: "database locked" or SQLx compile-time errors
- **Cause**: Another instance of the application is running and holds an exclusive lock on `studio.sqlite`.
- **Solution**: Close any running instances of `vk-post-studio.exe` in Windows Task Manager.

### Error: "failed to run webview" on Linux
- **Cause**: Missing `libwebkit2gtk-4.1-dev`.
- **Solution**: Run `sudo apt install libwebkit2gtk-4.1-dev`.
