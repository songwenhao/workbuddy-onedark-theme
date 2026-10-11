// One-shot generator for skin/onedark-*.css: builds the WorkBuddy One Dark
// Pro stylesheets from the source palette. Run: node scripts/gen-css.mjs
//
// Mapping follows WorkBuddy's own token architecture
// (renderer/assets/tokens-*.css + lib-chat-ui-*.css):
//   --wb-palette-*   raw ramps consumed by every semantic token
//   --wb-color-*     semantic text/border/accent tokens
//   --cb-*           component tokens (chat UI, markdown, highlight.js)
//   --vscode-*       VS Code names the desktop renderer mirrors
// Everything hangs off WorkBuddy's dark selector group plus the injected
// theme name body[data-vscode-theme-name="One Dark Pro"], so the app's own
// dark logic (MutationObserver on data-vscode-theme-kind) keeps working.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	ODP,
	TEXT2,
	TEXT3,
	VARIANTS,
	buildPaletteOverrides,
	buildSemanticOverrides,
	hex,
	mix,
	rgba,
} from "../palette/onedark.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const skinDir = join(root, "skin");

/**
 * WorkBuddy's own dark selector group, plus high-specificity variants.
 *
 * lib-chat-ui tokens hang off `:root.dark, :root.cb-dark, :root .dark,
 * :root .cb-dark` (0,2,0) and even a bare `body` rule, so the plain dark
 * group (0,1,0–0,1,1) loses the cascade on html/body. Emitting `html:root.dark`
 * (0,2,1) and `:root.cb-dark body` (0,2,1) variants guarantees our token
 * overrides win while staying inside the app's own dark scoping.
 */
const DARK_SELECTORS = [
	"html[data-theme='dark']",
	'html:root[data-theme=dark]',
	'html.cb-dark',
	'html:root.cb-dark',
	'html:root.dark',
	'body[data-vscode-theme-name="One Dark Pro"]',
	'body[data-vscode-theme-name="One Dark Pro Darker"]',
	'body[data-vscode-theme-name="One Dark Pro Night Flat"]',
	'body.vscode-dark',
	'body.dark',
	':root.dark body',
	':root.cb-dark body',
	':root .dark body',
	':root .cb-dark body',
];

function declarations(entries, indent = "\t") {
	return entries.map(([k, v]) => `${indent}${k}: ${v};`).join("\n");
}

function buildVariables(v) {
	const P = ODP;
	const palette = buildPaletteOverrides(v);
	const semantic = buildSemanticOverrides(v);
	const vars = [];

	// WorkBuddy raw ramps (--wb-palette-*)
	for (const [ramp, value] of Object.entries(palette)) {
		vars.push([`--wb-palette-${ramp}`, hex(...value)]);
	}
	// WorkBuddy semantic tokens (--wb-color-*)
	vars.push(...Object.entries(semantic));

	// VS Code names the desktop renderer mirrors (body falls back to
	// var(--vscode-editor-background) in renderer/index.html; --cb-vscode-*
	// indirections in lib-chat-ui resolve through these).
	vars.push(
		["--vscode-editor-background", hex(...v.bg)],
		["--vscode-editor-foreground", hex(...P.fg)],
		["--vscode-sideBar-background", hex(...v.bgAlt)],
		["--vscode-input-background", hex(...v.deep)],
		["--vscode-dropdown-background", hex(...mix(v.bgAlt, P.raise, 0.5))],
		["--vscode-foreground", hex(...P.fg)],
		["--vscode-descriptionForeground", hex(...TEXT3)],
		["--vscode-titleBar-activeBackground", hex(...v.bgAlt)],
		["--vscode-titleBar-activeForeground", hex(...TEXT2)],
		["--vscode-titleBar-inactiveBackground", hex(...v.bgAlt)],
		["--vscode-titleBar-inactiveForeground", hex(...P.fgDim)],
		["--vscode-list-hoverBackground", hex(...P.hover)],
		["--vscode-list-activeSelectionBackground", hex(...mix(P.raise, P.blue, 0.35))],
		["--vscode-list-activeSelectionForeground", "#ffffff"],
		["--vscode-list-inactiveSelectionBackground", rgba(P.fg, 0.1)],
		["--vscode-button-background", hex(...mix(P.blue, [0, 0, 0], 0.28))],
		["--vscode-button-foreground", "#ffffff"],
		["--vscode-button-hoverBackground", hex(...P.blue)],
		["--vscode-button-secondaryBackground", hex(...P.button)],
		["--vscode-button-secondaryForeground", hex(...P.fg)],
		["--vscode-button-secondaryHoverBackground", hex(...mix(P.button, P.raise, 0.5))],
		["--vscode-scrollbarSlider-background", rgba(P.fg, 0.2)],
		["--vscode-scrollbarSlider-hoverBackground", rgba(P.fg, 0.35)],
		["--vscode-scrollbarSlider-activeBackground", rgba(P.fg, 0.5)],
		["--vscode-textLink-foreground", hex(...P.blue)],
		["--vscode-textLink-activeForeground", hex(...mix(P.blue, WHITE_ALIAS, 0.25))],
		["--vscode-focusBorder", rgba(P.blue, 0.7)],
		["--vscode-widget-border", rgba(P.fg, 0.16)],
		["--vscode-widget-shadow", "rgba(0, 0, 0, 0.5)"],
		["--vscode-panel-border", rgba(P.fg, 0.14)],
		["--vscode-menu-foreground", hex(...P.fg)],
		["--vscode-menu-separatorBackground", hex(...P.raise)],
		["--vscode-menu-border", hex(...P.raise)],
		["--vscode-quickInputList-focusBackground", hex(...mix(P.raise, P.blue, 0.4))],
		["--vscode-toolbar-hoverBackground", hex(...P.hover)],
	);

	// Component tokens from lib-chat-ui's `.cb-dark` block that carry hardcoded
	// values rather than resolving through the ramps above.
	vars.push(
		["--cb-titlebar-control-hover-background", rgba(P.fg, 0.12)],
		["--cb-list-item-bg", hex(...v.bgAlt)],
		["--cb-list-item-hover-bg", hex(...P.hover)],
		["--cb-list-item-selected-bg", rgba(P.fg, 0.1)],
		["--cb-list-item-foreground", hex(...P.fg)],
		["--cb-list-item-selected-foreground", "#ffffff"],
		["--cb-focus-outline-color", rgba(P.blue, 0.7)],
		["--cb-text-primary", hex(...P.fg)],
		["--cb-text-secondary", hex(...TEXT2)],
		["--cb-text-tertiary", hex(...TEXT3)],
		["--cb-text-muted", rgba(P.fg, 0.7)],
		["--cb-text-highlight", hex(...P.blue)],
		["--cb-text-disabled", rgba(P.fg, 0.32)],
		["--cb-text-error-active", hex(...P.red)],
		["--cb-text-link", hex(...P.blue)],
		["--cb-button-primary", hex(...mix(P.blue, [0, 0, 0], 0.28))],
		["--cb-success-color", hex(...P.green)],
		// ChatGPT-look code surfaces: header merged into the elevated block,
		// one step lighter than the page (bg -> #32373f on onedark-pro).
		[
			"--cb-markdown-code-block-border",
			hex(...v.bg.map((c, i) => c + 10)),
		],
		["--cb-markdown-code-block-header-bg", hex(...v.bg.map((c, i) => c + 10))],
		["--cb-markdown-code-block-title-fg", hex(...TEXT2)],
		["--cb-markdown-hljs-color", hex(...P.fg)],
		// highlight.js syntax colors (canonical One Dark Pro token colors)
		["--cb-hljs-comment", hex(...P.fgDim)],
		["--cb-hljs-keyword", hex(...P.purple)],
		["--cb-hljs-string", hex(...P.green)],
		["--cb-hljs-number", hex(...P.orange)],
		["--cb-hljs-function", hex(...P.blue)],
		["--cb-hljs-variable", hex(...P.red)],

		// ── hardcoded surface aliases from the same tokens sheet ────
		// (--wb-bg-content / --wb-home-* / cards carry literal dark grays
		// that do not resolve through the ramps above; the conversation
		// page paints --wb-bg-content, so it must be remapped too.)
		["--wb-bg-content", hex(...v.bg)],
		["--wb-home-bg-primary", hex(...v.bg)],
		["--wb-home-bg-secondary", hex(...v.bgAlt)],
		["--wb-home-input-slot-bg", hex(...P.hover)],
		["--wb-bg-active-hover", hex(...P.raise)],
		["--wb-bg-card", hex(...P.hover)],
		["--wb-bg-card-strong", hex(...mix(P.hover, P.raise, 0.5))],
		["--wb-bg-elevated", hex(...P.raise)],
		["--wb-bg-inset-strong", hex(...v.deep)],
		["--wb-bg-item-selected", hex(...P.hover)],
		["--wb-bg-error-soft", hex(...mix(v.bg, P.red, 0.28))],
		["--wb-bg-success-soft", hex(...mix(v.bg, P.green, 0.3))],
		["--wb-bg-focus-soft", rgba(P.blue, 0.15)],
		["--wb-bg-purple-soft", rgba(P.purple, 0.16)],
		["--wb-bg-error-subtle", rgba(P.red, 0.15)],
		["--wb-bg-warning-subtle", rgba(P.yellow, 0.15)],
		["--wb-bg-gold-start", hex(...P.yellow)],
		["--wb-bg-gold-end", hex(...P.orange)],
	);
	return vars;
}
const WHITE_ALIAS = [255, 255, 255];

/** highlight.js polish: token classes WorkBuddy maps onto shared vars. */
function buildHljsPolish(v) {
	const P = ODP;
	const scope = `body[data-vscode-theme-name="${v.name}"] .cb-markdown`;
	return [
		`${scope} .hljs-type,
${scope} .hljs-title.class_,
${scope} .hljs-title.class {
	color: ${hex(...P.yellow)};
}`,
		`${scope} .hljs-attr,
${scope} .hljs-attribute,
${scope} .hljs-selector-attr {
	color: ${hex(...P.orange)};
}`,
		`${scope} .hljs-selector-tag,
${scope} .hljs-selector-id,
${scope} .hljs-selector-class {
	color: ${hex(...P.purple)};
}`,
		`${scope} .hljs-section,
${scope} .hljs-name {
	color: ${hex(...P.blue)};
}`,
		`${scope} .hljs-addition {
	color: ${hex(...P.green)};
	background: ${rgba(P.green, 0.12)};
}`,
		`${scope} .hljs-deletion {
	color: ${hex(...P.red)};
	background: ${rgba(P.red, 0.12)};
}`,
		`${scope} .hljs-emphasis {
	font-style: italic;
}`,
		`${scope} .hljs-strong {
	font-weight: 600;
}`,
		`${scope} .hljs-comment,
${scope} .hljs-quote {
	font-style: italic;
}`,
	].join("\n\n");
}

function buildSheet(v) {
	const selectors = DARK_SELECTORS.join(",\n");
	return `/*!
 * ${v.name} for WorkBuddy AI — generated by scripts/gen-css.mjs, do not edit.
 *
 * Palette: One Dark Pro (https://github.com/Binaryify/OneDark-Pro, MIT),
 * mapped onto WorkBuddy's --wb-palette-* / --wb-color-* / --cb-* /
 * --vscode-* token system. Scope: WorkBuddy's own dark selector group plus
 * body[data-vscode-theme-name="${v.name}"], so the app's native dark logic
 * (ThemeManager's data-vscode-theme-kind observer) keeps driving classes.
 * Surfaces:
 *   main ${hex(...v.bg)} · sidebar ${hex(...v.bgAlt)} · input ${hex(...v.deep)}
 *   accent ${hex(...ODP.blue)} · text ${hex(...ODP.fg)}
 */
${selectors} {
${declarations(buildVariables(v))}
}

/* 独立会话窗首屏骨架（renderer/index.html 内联样式里的硬编码） */
html:root[data-window-app-id='conversation'] {
	--conversation-shell-bg: ${hex(...v.bg)};
	--conversation-shell-fg: ${hex(...TEXT2)};
	--conversation-shell-ring: ${rgba(ODP.fg, 0.16)};
	--conversation-shell-hover: ${rgba(ODP.fg, 0.08)};
}

/* highlight.js polish — canonical One Dark Pro token mapping */
${buildHljsPolish(v)}
`;
}

mkdirSync(skinDir, { recursive: true });
for (const v of VARIANTS) {
	const dest = join(skinDir, `${v.id}.css`);
	writeFileSync(dest, buildSheet(v), "utf8");
	console.log("wrote", dest, `(${v.name})`);
}
