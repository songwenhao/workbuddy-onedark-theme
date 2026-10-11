// One Dark Pro canonical palette for WorkBuddy AI.
//
// Source: One Dark Pro (https://github.com/Binaryify/OneDark-Pro, MIT), the
// same canonical values used by onedark-dsh-theme. The three flavors only
// shift the background ladder — editor.background / sideBar.background per
// the upstream OneDark-Pro*.json workbench sheets; accents are identical.
//
// WorkBuddy's token system is three-staged:
//   --wb-palette-*   raw palette ramps (gray/brand/blue/... defined in
//                    renderer/assets/tokens-*.css, dark values on the
//                    `[data-theme=dark]` selector group)
//   --wb-color-*     semantic tokens resolving into the palette
//   --cb-* / --vscode-*  component-level tokens (lib-chat-ui / VS Code names)

export const hex = (r, g, b) =>
	"#" + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("");

export const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

export const rgba = (c, a) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

export const WHITE = [255, 255, 255];

/** Shared One Dark Pro accents (identical across every upstream variant). */
export const ODP = {
	fg: [171, 178, 191], // #abb2bf
	fgDim: [92, 99, 112], // #5c6370 (comment)
	red: [224, 108, 117], // #e06c75
	green: [152, 195, 121], // #98c379
	yellow: [229, 192, 123], // #e5c07b
	orange: [209, 154, 102], // #d19a66
	blue: [97, 175, 239], // #61afef
	cyan: [86, 182, 194], // #56b6c2
	purple: [198, 120, 221], // #c678dd
	// chrome grays that upstream keeps constant across variants:
	hover: [44, 49, 58], // #2c313a (list.hoverBackground)
	raise: [62, 68, 82], // #3e4452 (focusBorder)
	button: [64, 71, 84], // #404754 (button.background)
};

/** Secondary/tertiary text from the blue-gray One Dark chat look. */
export const TEXT2 = [157, 163, 174]; // #9da3ae
export const TEXT3 = [134, 140, 151]; // #868c97

/**
 * Per-flavor background ladder, verbatim from the upstream OneDark-Pro*.json
 * workbench sheets. `deep` is the input/ deepest background.
 */
export const VARIANTS = [
	{
		id: "onedark-pro",
		name: "One Dark Pro",
		bg: [40, 44, 52], // #282c34 (editor.background)
		bgAlt: [33, 37, 43], // #21252b (sideBar.background)
		deep: [29, 31, 35], // #1d1f23 (input.background)
	},
	{
		id: "onedark-darker",
		name: "One Dark Pro Darker",
		bg: [35, 39, 46], // #23272e
		bgAlt: [30, 34, 39], // #1e2227
		deep: [29, 31, 35], // #1d1f23
	},
	{
		id: "onedark-night-flat",
		name: "One Dark Pro Night Flat",
		bg: [22, 25, 29], // #16191d
		bgAlt: [30, 34, 39], // #1e2227
		deep: [29, 31, 35], // #1d1f23
	},
];

/** The flavor shipped as the WorkBuddy skin/CDP theme. */
export const DEFAULT_VARIANT = "onedark-pro";

/**
 * Map a flavor onto WorkBuddy's dark palette ramps. WorkBuddy's dark theme
 * defines gray-1..5 as the surface ladder, brand-1..10 as the accent ramp and
 * so on; every semantic --wb-color-* token resolves into these ramps, so
 * overriding the ramps re-skins the whole app coherently (the same
 * alias-token philosophy as onedark-dsh-theme).
 */
export function buildPaletteOverrides(v) {
	const P = ODP;
	return {
		// ── surface ladder (gray ramp) ──────────────────────────────
		// gray-1 deepest (input wells) · gray-2 sidebar/panels ·
		// gray-3 main editor surface · gray-4 hover · gray-5 raised
		"gray-1": v.deep,
		"gray-2": v.bgAlt,
		"gray-3": v.bg,
		"gray-4": mix(v.bg, P.hover, 0.55),
		"gray-5": P.raise,

		// ── brand ramp (WorkBuddy green → One Dark blue) ───────────
		"brand-1": mix(v.bg, P.blue, 0.14),
		"brand-2": mix(v.bg, P.blue, 0.24),
		"brand-3": mix(v.bg, P.blue, 0.45),
		"brand-4": P.blue,
		"brand-5": mix(P.blue, WHITE, 0.1),
		"brand-7": P.blue,
		"brand-8": mix(P.blue, WHITE, 0.28),
		"brand-9": mix(P.blue, WHITE, 0.48),
		"brand-10": mix(P.blue, WHITE, 0.68),

		// ── functional ramps ───────────────────────────────────────
		"green-3": mix(v.bg, P.green, 0.4),
		"green-4": P.green,
		"green-5": mix(P.green, WHITE, 0.12),
		"green-6": mix(P.green, WHITE, 0.3),
		"green-8": mix(P.green, WHITE, 0.55),

		"orange-3": mix(v.bg, P.orange, 0.42),
		"orange-4": mix(v.bg, P.orange, 0.62),
		"orange-6": P.orange,
		"orange-7": mix(P.orange, WHITE, 0.14),
		"orange-8": mix(P.orange, WHITE, 0.28),
		"orange-9": mix(P.orange, WHITE, 0.5),

		"red-3": mix(v.bg, P.red, 0.35),
		"red-4": mix(v.bg, P.red, 0.55),
		"red-6": mix(P.red, [0, 0, 0], 0.18),
		"red-7": P.red,
		"red-8": mix(P.red, WHITE, 0.1),
		"red-9": mix(P.red, WHITE, 0.35),
		"red-10": mix(P.red, WHITE, 0.55),

		"blue-1": mix(v.bg, P.blue, 0.16),
		"blue-2": mix(v.bg, P.blue, 0.3),
		"blue-3": mix(v.bg, P.blue, 0.55),
		"blue-4": P.blue,
		"blue-5": mix(P.blue, WHITE, 0.08),
		"blue-6": mix(P.blue, WHITE, 0.12),
		"blue-7": mix(P.blue, WHITE, 0.24),
		"blue-8": mix(P.blue, WHITE, 0.4),
		"blue-9": mix(P.blue, WHITE, 0.6),
		"blue-10": mix(P.cyan, WHITE, 0.3),

		"purple-1": mix(v.bg, P.purple, 0.16),
		"purple-3": mix(v.bg, P.purple, 0.4),
		"purple-6": mix(P.purple, WHITE, 0.0),
		"purple-7": mix(P.purple, WHITE, 0.1),
		"purple-8": mix(P.purple, WHITE, 0.22),
		"purple-9": mix(P.purple, WHITE, 0.45),
		"purple-10": mix(P.purple, WHITE, 0.65),

		"cyan-3": P.cyan,
		"cyan-4": mix(P.cyan, WHITE, 0.1),
		"cyan-5": mix(P.cyan, WHITE, 0.2),
		"cyan-6": mix(P.cyan, WHITE, 0.3),
		"cyan-7": mix(P.cyan, WHITE, 0.45),
	};
}

/** Semantic --wb-color-* corrections that must not follow the ramps. */
export function buildSemanticOverrides(v) {
	const P = ODP;
	return {
		"--wb-color-text-primary": hex(...P.fg),
		"--wb-color-text-secondary": rgba(P.fg, 0.72),
		"--wb-color-text-secondary-solid": hex(...TEXT2),
		"--wb-color-text-tertiary": rgba(P.fg, 0.55),
		"--wb-color-text-placeholder": hex(...mix(P.fgDim, P.fg, 0.35)),
		"--wb-color-text-disabled": rgba(P.fg, 0.32),
		"--wb-color-text-hint": rgba(P.fg, 0.4),
		"--wb-color-text-link-default": hex(...mix(P.blue, WHITE, 0.12)),
		"--wb-color-text-link-hover": hex(...mix(P.blue, WHITE, 0.28)),
		"--wb-color-border-primary": rgba(P.fg, 0.12),
		"--wb-color-border-secondary": rgba(P.fg, 0.16),
		"--wb-color-border-tertiary": rgba(P.fg, 0.1),
		"--wb-color-border-focus": rgba(P.blue, 0.6),
		"--wb-color-border-solid": rgba(P.fg, 0.2),
		"--wb-color-mask-color": "rgba(0, 0, 0, 0.6)",
		"--wb-color-accent-brand": hex(...P.blue),
	};
}
