import { getUnicodeNames } from './mod.ts'

export const unicodeNames = await getUnicodeNames(
	fetch(new URL('../data/unicode-16.0.0-names.json.gz', import.meta.url)),
)
