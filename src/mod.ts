// evaluates to `readonly (string | number)[]` as typescript can't currently represent this kind of type more granularly
export type Rle = Readonly<ReturnType<typeof Array.prototype.flat<[number, number, string]>>>

export function gunzip(data: Blob | BufferSource) {
	return new Response(
		new Blob([data]).stream().pipeThrough(new DecompressionStream('gzip')),
	)
}

// modified from https://github.com/node-unicode/unicode-15.1.0/blob/main/decode-property-map.js
function* generateEntries(runs: Rle) {
	const len = runs.length - 2
	for (let cp = 0, i = 0; i < len;/* i++ */
	) {
		cp += runs[i++] as number
		const end = cp + (runs[i++] as number)
		const value = runs[i++] as string
		while (cp < end) {
			yield [cp++, value] as const
		}
	}
}

type Options = { overrides: readonly Record<number, string>[] }

export class UnicodeNames {
	#map: Map<number, string>
	#generator: Generator<readonly [number, string], void, unknown>

	constructor(runs: Rle, options?: Partial<Options>) {
		this.#map = new Map<number, string>()

		for (const override of options?.overrides ?? []) {
			for (const [k, v] of Object.entries(override)) {
				this.#map.set(Number(k), v)
			}
		}

		this.#generator = generateEntries(runs)
	}

	getByCodePoint(codePoint: number) {
		while (true) {
			const { value } = this.#generator.next()
			if (!value) break
			const [cp, name] = value
			if (!this.#map.has(cp)) {
				this.#map.set(cp, name)
			}
			if (cp >= codePoint) break
		}

		return this.#map.get(codePoint) ?? null
	}
}
