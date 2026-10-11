// CDP theme injector for WorkBuddy AI.
//
// WorkBuddy's desktop app natively enables a Chrome DevTools Protocol
// endpoint when started with WORKBUDDY_REMOTE_DEBUGGING_PORT=<port>
// (applyCliCommandLineSwitches in the app's main bundle). This script uses
// that endpoint to:
//   1. set body[data-vscode-theme-name="One Dark Pro"] +
//      data-vscode-theme-kind="vscode-dark" — the app's own MutationObserver
//      then applies the dark classes/color-scheme through its official path;
//   2. install the generated skin CSS via constructed stylesheets
//      (document.adoptedStyleSheets), which wins the cascade over the
//      built-in token sheets and survives CSP;
//   3. register the same payload with Page.addScriptToEvaluateOnNewDocument
//      so reloads and SPA re-mounts re-apply the theme at document-start;
//   4. persist the choice in localStorage (`agent-ui-theme`) so the app boots
//      dark natively on the next launch.
//
// Commands:
//   node scripts/inject.mjs launch [--variant <id>] [--port 9223] [--watch]
//   node scripts/inject.mjs apply  [--variant <id>] [--port 9223]
//   node scripts/inject.mjs status [--port 9223]
//   node scripts/inject.mjs revert [--port 9223]   — remove the theme again
//
// No WorkBuddy files are modified; closing the app restores the stock look.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { VARIANTS } from "../palette/onedark.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP_EXE = "C:/Program Files/WorkBuddyAI/WorkBuddyAI.exe";
const MARKER = "__wbOneDarkPro";

function parseArgs(argv) {
	const args = { variant: "onedark-pro", port: 9223, watch: false, command: argv[0] ?? "apply" };
	for (let i = 1; i < argv.length; i++) {
		if (argv[i] === "--variant") args.variant = argv[++i];
		else if (argv[i] === "--port") args.port = Number(argv[++i]);
		else if (argv[i] === "--watch") args.watch = true;
	}
	return args;
}

function loadCss(variant) {
	return readFileSync(join(root, "skin", `${variant}.css`), "utf8");
}

function variantName(variant) {
	const v = VARIANTS.find((x) => x.id === variant);
	if (!v) throw new Error(`unknown variant: ${variant} (known: ${VARIANTS.map((x) => x.id).join(", ")})`);
	return v.name;
}

/** The page-side payload, as a single expression for Runtime.evaluate. */
function buildPayload(css, name, persist) {
	const json = JSON.stringify({ name, css });
	return `(() => {
	if (window.${MARKER}?.name !== ${JSON.stringify(name)}) {
		// fresh install or variant switch: drop the previous guard/sheet
		try { window.${MARKER}?.disconnect?.(); } catch {}
		window.${MARKER} = undefined;
	}
	const state = (window.${MARKER} ??= { name: ${JSON.stringify(name)} });
	const CSS = ${json}.css;
	const NAME = ${json}.name;
	// css 内容指纹：重新注入（换变体或更新皮肤）时强制重建样式表
	const FINGERPRINT = ${JSON.stringify(css.length)};

	function ensureSheet() {
		if (state.sheet && state.fingerprint === FINGERPRINT) return;
		if (state.sheet) {
			const sheets = document.adoptedStyleSheets.filter((s) => s !== state.sheet);
			document.adoptedStyleSheets = sheets;
		}
		const sheet = new CSSStyleSheet();
		sheet.replaceSync(CSS);
		state.sheet = sheet;
		state.fingerprint = FINGERPRINT;
		document.adoptedStyleSheets = [...document.adoptedStyleSheets.filter((s) => s !== sheet), sheet];
	}
	function applyAttributes() {
		const body = document.body;
		if (!body) return false;
		if (body.getAttribute("data-vscode-theme-name") !== NAME)
			body.setAttribute("data-vscode-theme-name", NAME);
		if (body.getAttribute("data-vscode-theme-kind") !== "vscode-dark")
			body.setAttribute("data-vscode-theme-kind", "vscode-dark");
		return true;
	}
	function start() {
		ensureSheet();
		applyAttributes();
		if (state.observer) state.observer.disconnect();
		// guard: if the app (or an official skin) flips the base theme back,
		// re-assert One Dark — WorkBuddy's observer then re-derives classes.
		state.observer = new MutationObserver(() => {
			const body = document.body;
			if (!body) return;
			if (document.documentElement.hasAttribute("data-skin")) return; // defer to official skins
			if (body.getAttribute("data-vscode-theme-name") !== NAME ||
				body.getAttribute("data-vscode-theme-kind") !== "vscode-dark") {
				applyAttributes();
			}
		});
		state.observer.observe(document.body, { attributes: true, attributeFilter: ["data-vscode-theme-name", "data-vscode-theme-kind"] });
		state.observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-skin"] });
		${persist ? `try {
			localStorage.setItem("agent-ui-theme", JSON.stringify({
				theme: "dark", followSystem: false,
				vsCodeThemeName: NAME, vsCodeThemeKind: "vscode-dark",
			}));
		} catch {}` : ""}
	}
	if (document.body) start();
	else new MutationObserver((m, mo) => {
		if (document.body) { mo.disconnect(); start(); }
	}).observe(document.documentElement, { childList: true, subtree: true });
	return "ok:" + NAME;
})()`;
}

const REVERT_PAYLOAD = `(() => {
	try { window.${MARKER}?.observer?.disconnect(); } catch {}
	try { window.${MARKER}?.sheet; document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== window.${MARKER}?.sheet); } catch {}
	window.${MARKER} = undefined;
	try { document.body?.removeAttribute("data-vscode-theme-name"); } catch {}
	return "reverted";
})()`;

class Cdp {
	constructor(wsUrl) {
		this.wsUrl = wsUrl;
		this.seq = 0;
		this.pending = new Map();
	}
	async connect() {
		this.ws = new WebSocket(this.wsUrl);
		await new Promise((resolve, reject) => {
			this.ws.addEventListener("open", resolve, { once: true });
			this.ws.addEventListener("error", () => reject(new Error(`CDP websocket failed: ${this.wsUrl}`)), { once: true });
		});
		this.ws.addEventListener("message", (event) => {
			const msg = JSON.parse(String(event.data));
			if (msg.id && this.pending.has(msg.id)) {
				const { resolve, reject } = this.pending.get(msg.id);
				this.pending.delete(msg.id);
				msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
			}
		});
	}
	send(method, params = {}, sessionId) {
		const id = ++this.seq;
		return new Promise((resolve, reject) => {
			this.pending.set(id, { resolve, reject });
			this.ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
		});
	}
	close() {
		try { this.ws.close(); } catch {}
	}
}

async function listTargets(port) {
	const res = await fetch(`http://127.0.0.1:${port}/json/list`);
	if (!res.ok) throw new Error(`/json/list ${res.status}`);
	return res.json();
}

/** Inject into one page target; returns the evaluate() result. */
async function injectIntoTarget(target, css, name, persist) {
	const cdp = new Cdp(target.webSocketDebuggerUrl);
	await cdp.connect();
	try {
		// re-apply on every future navigation/reload of this target
		await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: buildPayload(css, name, persist) }).catch(() => {});
		const result = await cdp.send("Runtime.evaluate", {
			expression: buildPayload(css, name, persist),
			returnByValue: true,
		});
		return result?.result?.value ?? "no-result";
	} finally {
		cdp.close();
	}
}

async function injectAll(port, variant, { quiet = false, seen = null } = {}) {
	const css = loadCss(variant);
	const name = variantName(variant);
	const targets = (await listTargets(port)).filter(
		(t) => t.type === "page" && !t.url.startsWith("devtools:") && t.webSocketDebuggerUrl,
	);
	const results = [];
	for (const target of targets) {
		if (seen) {
			if (seen.has(target.id)) continue;
			seen.add(target.id);
		}
		try {
			const value = await injectIntoTarget(target, css, name, true);
			results.push(`${target.title || target.url} → ${value}`);
		} catch (err) {
			results.push(`${target.title || target.url} → ERROR ${err.message}`);
		}
	}
	if (!quiet) console.log(results.join("\n") || "no page targets found");
	return results;
}

async function waitForPort(port, timeoutMs) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		try {
			await listTargets(port);
			return true;
		} catch {
			await new Promise((r) => setTimeout(r, 500));
		}
	}
	return false;
}

async function launch(args) {
	const { spawn } = await import("node:child_process");
	// ELECTRON_RUN_AS_NODE 会把 WorkBuddyAI.exe 当成纯 Node 启动（秒退、无日志），
	// 在 Electron/DSH 等宿主终端里运行本脚本时必须剥离；顺带去掉 Node 代理试验开关。
	const env = { ...process.env, WORKBUDDY_REMOTE_DEBUGGING_PORT: String(args.port) };
	delete env.ELECTRON_RUN_AS_NODE;
	delete env.NODE_USE_ENV_PROXY;
	const child = spawn(APP_EXE, [], { detached: true, stdio: "ignore", env });
	child.unref();
	console.log(`WorkBuddyAI launched with WORKBUDDY_REMOTE_DEBUGGING_PORT=${args.port} (pid ${child.pid})`);
	if (!(await waitForPort(args.port, 90_000))) {
		throw new Error(`CDP endpoint http://127.0.0.1:${args.port} did not come up within 90s`);
	}
	// give the renderer a moment to mount its window targets
	await new Promise((r) => setTimeout(r, 2500));
	const seen = new Set();
	await injectAll(args.port, args.variant, { seen });
	if (args.watch) {
		console.log(`watching for new windows on port ${args.port} — Ctrl+C to stop (the app keeps running)`);
		setInterval(() => {
			injectAll(args.port, args.variant, { quiet: true, seen }).catch(() => {});
		}, 4000);
	}
}

async function revert(port) {
	const targets = (await listTargets(port)).filter((t) => t.type === "page" && t.webSocketDebuggerUrl);
	for (const target of targets) {
		const cdp = new Cdp(target.webSocketDebuggerUrl);
		await cdp.connect();
		try {
			await cdp.send("Runtime.evaluate", { expression: REVERT_PAYLOAD, returnByValue: true });
			console.log(`${target.title || target.url} → reverted`);
		} catch (err) {
			console.log(`${target.title || target.url} → ERROR ${err.message}`);
		} finally {
			cdp.close();
		}
	}
}

const args = parseArgs(process.argv.slice(2));
try {
	if (args.command === "launch") await launch(args);
	else if (args.command === "apply") {
		const targets = await listTargets(args.port).catch(() => null);
		if (!targets) {
			console.error(`WorkBuddy AI is not reachable on port ${args.port}.\n` +
				`Start it with:  npm run launch   (or set WORKBUDDY_REMOTE_DEBUGGING_PORT=${args.port} before opening the app)`);
			process.exitCode = 1;
		} else await injectAll(args.port, args.variant);
	} else if (args.command === "status") {
		const targets = await listTargets(args.port).catch(() => null);
		console.log(targets ? `${targets.length} targets` : `offline on port ${args.port}`);
	} else if (args.command === "revert") await revert(args.port);
	else {
		console.error(`unknown command: ${args.command}`);
		process.exitCode = 1;
	}
} catch (err) {
	console.error(err.message);
	process.exitCode = 1;
}
