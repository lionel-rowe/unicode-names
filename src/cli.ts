import { gunzip, type Rle, UnicodeNames } from './mod.ts'

const names: Rle = await gunzip(await Deno.readFile('./data/unicode-15.1.0-names.json.gz')).json()
const _control: Record<number, string[]> = await gunzip(
	await Deno.readFile('./data/unicode-15.1.0-names-control.json.gz'),
).json()
const control: Record<number, string> = Object.fromEntries(Object.entries(_control).map(([k, v]) => [k, v[0]]))

const unicodeNames = new UnicodeNames(names, { overrides: [control] })

while (true) {
	await Deno.stdout.write(new TextEncoder().encode('Input string: '))
	const u = new Uint8Array(1024)
	await Deno.stdin.read(u)
	let str = new TextDecoder().decode(u).replace(/\n?\0+/, '')
	try {
		str = JSON.parse(`"${
			str
				.replaceAll(new RegExp(String.raw`\\x(\p{AHex}{2})`, 'gu'), (_, x) =>
					codePointToJsonEscaped(parseInt(x, 16)))
				.replaceAll(
					new RegExp(String.raw`\\u\{(\p{AHex}{1,6})\}`, 'gu'),
					(_, x) =>
						codePointToJsonEscaped(parseInt(x, 16)),
				)
		}"`)
	} catch {
		// just use raw str
	}

	for (const char of str) {
		const cp = char.codePointAt(0)!
		console.info(
			`${JSON.stringify(char)} (U+${cp.toString(16).padStart(4, '0').toUpperCase()}): ${
				unicodeNames.getByCodePoint(cp) ?? 'Noncharacter'
			}`,
		)
	}
}

function codePointToJsonEscaped(cp: number) {
	if (cp > 0xffff) {
		cp -= 0x10000
		const high = 0xd800 + (cp >> 10 & 0x3ff)
		const low = 0xdc00 + (cp & 0x3ff)

		return [high, low].map(codeUnitToJsonEscaped).join('')
	}

	return codeUnitToJsonEscaped(cp)
}

function codeUnitToJsonEscaped(cu: number) {
	return String.raw`\u${cu.toString(16).padStart(4, '0')}`
}
