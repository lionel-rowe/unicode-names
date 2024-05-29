// evaluates to `readonly (string | number)[]` as typescript can't currently represent this kind of type more granularly
export type Rle = Readonly<ReturnType<typeof Array.prototype.flat<[number, number, string]>>>

/**
 * @param bin - The binary source data for `names` and `control`, e.g. as a `Uint8Array` or NodeJS `Buffer` read from
 * disk or a blob fetched via HTTP request. Source data must be gzipped and RLE-encoded JSON, as built with
 * `scripts/build.ts` and found in the `data` directory of this repo.
 *
 * @example Deno
 * ```ts
 * const [names, control] = await Promise.all([
 * 	'./data/unicode-15.1.0-names.json.gz',
 * 	'./data/unicode-15.1.0-names-control.json.gz',
 * ].map((path) => Deno.readFile(path)))
 *
 * const unicodeNames = await getUnicodeNames({ names, control })
 * ```
 *
 * @example NodeJS
 * ```ts
 * const [names, control] = await Promise.all([
 * 	'./data/unicode-15.1.0-names.json.gz',
 * 	'./data/unicode-15.1.0-names-control.json.gz',
 * ].map((path) => fs.promises.readFile(path)))
 *
 * const unicodeNames = await getUnicodeNames({ names, control })
 * ```
 *
 * @example Browser
 * ```ts
 * const [names, control] = await Promise.all([
 * 	'./assets/unicode-names/unicode-15.1.0-names.json.gz',
 * 	'./assets/unicode-names/unicode-15.1.0-names-control.json.gz',
 * ].map((path) => fetch(new URL(path, location.origin)).then((res) => res.blob())))
 *
 * const unicodeNames = await getUnicodeNames({ names, control })
 * ```
 */
export async function getUnicodeNames(bin: { names: Blob | BufferSource; control: Blob | BufferSource }) {
	const names: Rle = await gunzip(bin.names).json()
	const _control: Record<number, string[]> = await gunzip(bin.control).json()
	const control: Record<number, string> = Object.fromEntries(Object.entries(_control).map(([k, v]) => [k, v[0]]))

	return new UnicodeNames(names, { overrides: [control] })
}

function gunzip(data: Blob | BufferSource) {
	return new Response(
		new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip')),
	)
}

// modified from https://github.com/node-unicode/unicode-15.1.0/blob/main/decode-property-map.js
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

type Options = { overrides: readonly Record<number, string>[] }

export class UnicodeNames {
	#map: Map<number, string>
	#generator: Generator<readonly [number, string], undefined, undefined>

	constructor(runs: Rle, options?: Partial<Options>) {
		this.#map = new Map<number, string>()

		for (const override of options?.overrides ?? []) {
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
			await Promise.resolve()
			const cp = this.#next()
			if (cp == null || cp >= codePoint) break
		}
	}

	getMap() {
		this.#populateMap(Infinity)
		return this.#map
	}
	async getMapAsync() {
		await this.#populateMapAsync(Infinity)
		return this.#map
	}

	getByCodePoint(codePoint: number): string | null {
		this.#populateMap(codePoint)
		return this.#map.get(codePoint) ?? null
	}
}
