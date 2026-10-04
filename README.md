# Compact Log Format Viewer :mag: :chart_with_upwards_trend:
A cross platform tool to read &amp; query JSON aka CLEF log files created by Serilog

<img src="https://raw.githubusercontent.com/warrenbuckley/Compact-Log-Format-Viewer/master/LogViewer.Client/build/logo.png?v=2" width="100" height="100">

![screenshot](screenshot.JPG?raw=true "Screenshot")

## Download
Releases are available on this GitHub Repository along on the Windows Store

### Windows
<a href='https://www.microsoft.com/store/apps/9N8RV8LKTXRJ?cid=storebadge&ocid=badge'><img src='English_get-it-from-MS_InvariantCulture_Default.png' alt='English badge' style='height: 38px;' height="38" /></a>

### MacOS
The metrics for the MacOS usage was too little & I don't currently build/release any other Apple apps, so my Apple Developer subscription lapsed. I assumed the application would still be available to download but that I would not be able to push any new updates. However it seems Apple just removes the listing :(

For now I recommend you build it manually. In future I may do auto-updates via GitHub releases instead of app stores.

## Building

You will need the following installed:
- node/npm
- .NET Core SDK 2.2+

For OSX & Windows you can download the SDK here or install Visual Studio for Mac/Windows which includes the `dotnet` CLI tool<br/>
https://dotnet.microsoft.com/download<br/>
https://visualstudio.microsoft.com/vs/

### Build Steps 🔨📐
- Clone Repo
- Open terminal in root of project
- `dotnet publish LogViewer.Server --runtime osx-x64 --output LogViewer.Server/bin/dist/osx --configuration release -p:PublishSingleFile=true` generates a self contained application for our WebAPI
- `dotnet publish LogViewer.Server --runtime win-x64 --output LogViewer.Server/bin/dist/win --configuration release -p:PublishSingleFile=true` same but creates the Windows version
- Change terminal directory to `LogViewer.Client` folder
- Install TypeScript if missing `npm install -g typescript`
- `npm install`
- `tsc --watch` This will compile the TypeScript files & continue to watch them
- Open a new terminal in `LogViewer.Client`
- `npm run start` Will run the Electron app for development with Chrome DevTools open/launched

>**Note:** If you `npm run start` before you have compiled the TypeScript files then Electron will complain about not finding the entry point file. Additionally if you have also not run `dotnet publish` then the underlying WebAPI which we communicate with will not be running.

## 3rd Party Libraries 💖💖
This package uses the following libraries:
- [Serilog.Formatting.Compact.Reader](https://github.com/serilog/serilog-formatting-compact-reader)
- [Serilog.Expressions](https://github.com/serilog/serilog-expressions)
- [Serilog.Sinks.File](https://github.com/serilog/serilog-sinks-file)

## Trimark Customizations 🛠️
Changes made on the `feature/Trimark_Tweaks` branch for the Trimark edition of the viewer.

### Platform & build
- **.NET 10** - `LogViewer.Server` and `LogViewer.Server.Tests` now target `net10.0` (was `net7.0`), with `Microsoft.AspNetCore.Mvc.NewtonsoftJson` updated to 10.0.12. GitHub workflows install the .NET 10 SDK and the Azure pipeline uses the `win-x64` runtime identifier.
- **Generic host** - `Program.cs` uses `HostBuilder` + `ConfigureWebHost` in place of the deprecated `WebHostBuilder`.
- **Trimmed publish fix** - `PublishTrimmed` on .NET 8+ disables a feature switch MVC needs and trims more aggressively, which crashed the server at startup. The project now sets `TrimMode=partial` and `MvcEnhancedModelMetadataSupport=true`.

### Branding & packaging
- Product name is **Trimark Compact Log Viewer** and the version is **1.5.0** (client and server).
- The installer is `Trimark.Compact.Log.Viewer.Setup.<version>.exe`, with matching shortcut, Add/Remove Programs, Microsoft Store and About box names. The window title is *Compact Log Viewer (Trimark Edition)*.
- **Publishing and auto-update are disabled** - electron-builder no longer publishes to GitHub releases, the *Check for Updates* menu item, `electron-updater` package and `dev-app-update.yml` are removed, and CI no longer runs a publish step.

### Searching
- **Property name suggestions** - while typing in the search box, property names found in the open log file (plus built-ins such as `@Level` and `@Message`) are suggested for the word at the caret. Use ↑/↓ to choose, Enter or Tab to insert and Escape to close. The server collects the names while parsing (`GET api/viewer/properties`).
- **Double-quoted strings** - Serilog expressions only accept `'single quoted'` strings, so an expression such as `RequestMethod="POST"` that fails to compile is retried with its double-quoted strings converted before falling back to a text search.
- **Enter runs the search**, and the Search button now sits before Clear.
- **Clickable properties** - every property value in an expanded log entry (including `@MessageTemplate`, nested object values and array items) is a link styled as plain text. Clicking it searches for that property and value, quoting the value according to its type.

### Auto refresh
- A **Refresh** dropdown next to the sort order (Disabled, 3, 5, 10 or 30 seconds). At the chosen interval the app asks the server whether the file has changed (`GET api/viewer/haschanged`, comparing file size and last write time) and, only if it has, reloads it while keeping the current search, sort order and page.
- The *File has updates* banner has been removed.
- Fixed the file watcher handler being added again on every reload.

### Display
- **Rendered messages** no longer wrap string property values in double quotes (`HTTP POST /api` rather than `HTTP "POST" "/api"`).
- **Log Levels** lists Fatal down to Verbose, adds a **Percent** column (rounded to whole numbers) and shows the chart below the table.
- **Properties** of an expanded log entry are listed alphabetically after Timestamp and @MessageTemplate, with tighter row spacing.
- The sort order dropdown moved into the search card with *Sort:* labels, the pager is smaller and the error count panel is removed.

### Building notes
- The server must be published to `LogViewer.Server/bin/dist/win` for Electron to start it - re-run `dotnet publish LogViewer.Server --runtime win-x64 --output LogViewer.Server/bin/dist/win --configuration Release` after any server change.
- Packaging on Windows (`npm run win`) needs **Developer Mode** turned on (or an administrator prompt) so electron-builder can extract its code signing tools; without it the exe keeps the default Electron icon and version details.
- Electron 30 can fail to unpack its binary when installed under very new Node versions (e.g. Node 26), giving *Electron failed to install correctly*. Use Node 20 or 22 LTS for `npm install`.
