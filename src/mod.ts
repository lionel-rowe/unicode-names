import { gunzip, type Streamable, toReadableStream } from './_gzip.ts'
import type { UnicodeVersion } from './_versions.ts'

/**
 * @module
 * Get Unicode names from code points.
 */

// evaluates to `readonly (string | number)[]` as typescript can't currently represent this kind of type more granularly
type Rle = Readonly<ReturnType<typeof Array.prototype.flat<[number, number, string]>>>

/**
 * Extracts the Unicode name data from the given binary data and returns a `UnicodeNames` object for querying it.
 *
 * @param unicodeVersion The Unicode version to fetch the data for.
 * @param fetchFile A function that takes a file name and returns a `Blob` object.
 * @returns A `UnicodeNames` object.
 *
 * @example
 * ```ts
 * import { getUnicodeNames, fetchByBaseUrl } from '@li/unicode-names'
 *
 * const unicodeNames = await getUnicodeNames(
 * 	fetch(
 * 		import.meta.resolve('/path/to/data/unicode-16.0.0-names.json.gz'),
 * 		{ cache: 'force-cache' },
 * 	),
 * )
 *
 * unicodeNames.getByCodePoint('💩'.codePointAt(0)!) // 'PILE OF POO'
 * ```
 */
export async function getUnicodeNames(bin: Streamable | Promise<Streamable>): Promise<UnicodeNames> {
	let res: Response
	const [s1, s2] = new Response(toReadableStream(await bin)).body!.tee()
	try {
		res = new Response(await gunzip(s1).blob())
	} catch {
		// some build tools may automatically gunzip the file, so we handle that gracefully
		res = new Response(s2)
	}

	const x = await res.json()

	const unicodeVersion: UnicodeVersion = x.meta.unicodeVersion
	const runs: Rle = x.runs

	const _overrides: Record<number, string[]>[] = x.overrides
	const overrides: Record<number, string>[] = _overrides.map((o) => {
		return Object.fromEntries(Object.entries(o).map(([k, [preferredName]]) => [k, preferredName]))
	})

	return new UnicodeNames({ unicodeVersion, runs, overrides })
}

// modified from https://github.com/node-unicode/unicode-16.0.0/blob/main/decode-property-map.js
function* generateEntries(runs: Rle): Generator<readonly [number, string], undefined, undefined> {
	const len = runs.length - 2
	let cp = 0
	for (let i = 0; i < len; i += 3) {
		const skip = runs[i] as number
		const length = runs[i + 1] as number
		const value = runs[i + 2] as string

		cp += skip

		for (let j = 0; j < length; ++j) {
			yield [cp++, value] as const
		}
	}
}

class UnicodeNames {
	#map: Map<number, string>
	#generator: Generator<readonly [number, string], undefined, undefined>
	unicodeVersion: UnicodeVersion

	constructor(
		{ unicodeVersion, runs, overrides }: {
			unicodeVersion: UnicodeVersion
			runs: Rle
			overrides: readonly Record<number, string>[]
		},
	) {
		this.#map = new Map<number, string>()
		this.unicodeVersion = unicodeVersion

		for (const override of overrides ?? []) {
			for (const [k, v] of Object.entries(override)) {
				this.#map.set(Number(k), v)
			}
		}

		this.#generator = generateEntries(runs)
	}

	#next() {
		const { value } = this.#generator.next()
		if (!value) return null
		const [cp, name] = value
		if (!this.#map.has(cp)) {
			this.#map.set(cp, name)
		}
		return cp
	}

	#populateMap(codePoint: number): void {
		while (true) {
			const cp = this.#next()
			if (cp == null || cp >= codePoint) break
		}
	}
	async #populateMapAsync(codePoint: number): Promise<void> {
		while (true) {
			await Promise.resolve() // yield to event loop
			const cp = this.#next()
			if (cp == null || cp >= codePoint) break
		}
	}
	getMap(): Map<number, string> {
		this.#populateMap(Infinity)
		return this.#map
	}
	async getMapAsync(): Promise<Map<number, string>> {
		await this.#populateMapAsync(Infinity)
		return this.#map
	}
	getByCodePoint(codePoint: number): string | undefined {
		this.#populateMap(codePoint)
		return this.#map.get(codePoint)
	}
	async getByCodePointAsync(codePoint: number): Promise<string | undefined> {
		await this.#populateMapAsync(codePoint)
		return this.#map.get(codePoint)
	}
}
