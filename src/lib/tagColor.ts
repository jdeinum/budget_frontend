/**
 * Deterministic per-tag color so the same tag reads identically everywhere
 * it appears. Hue comes from `name` alone (so e.g. every `category` tag
 * shares a hue family), saturation/lightness vary by `name:value` together
 * so distinct values are still distinguishable — label text remains the
 * primary disambiguator.
 */
function hashString(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
	return Math.abs(h);
}

function hsl(name: string, value: string): { hue: number; saturation: number; lightness: number } {
	const hue = hashString(name) % 360;
	const variance = hashString(`${name}:${value}`);
	return {
		hue,
		saturation: 55 + (variance % 20), // 55–74%
		lightness: 42 + (variance % 12) // 42–53%
	};
}

export function tagColorSolid(name: string, value: string): string {
	const { hue, saturation, lightness } = hsl(name, value);
	return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

export function tagColorStyle(name: string, value: string): string {
	const { hue, saturation, lightness } = hsl(name, value);
	const solid = `hsl(${hue} ${saturation}% ${lightness}%)`;
	return `background-color: hsl(${hue} ${saturation}% ${lightness}% / 0.15); color: ${solid}; border-color: hsl(${hue} ${saturation}% ${lightness}% / 0.4);`;
}
