import { assertEquals } from '@std/assert'
import { getUnicodeNames } from './mod.ts'
import { gunzip } from './_gzip.ts'

Deno.test(getUnicodeNames.name, async (t) => {
	const unicodeNames = await getUnicodeNames(
		fetch(
			import.meta.resolve('../data/unicode-16.0.0-names.json.gz'),
			{ cache: 'force-cache' },
		),
	)

	await t.step(unicodeNames.getByCodePoint.name, () => {
		assertEquals(unicodeNames.getByCodePoint(0), 'NULL')
		assertEquals(unicodeNames.getByCodePoint(0x0061), 'LATIN SMALL LETTER A')
		assertEquals(unicodeNames.getByCodePoint(0x0062), 'LATIN SMALL LETTER B')
		assertEquals(unicodeNames.getByCodePoint('💩'.codePointAt(0)!), 'PILE OF POO')
	})

	await t.step(unicodeNames.getMap.name, () => {
		const m = unicodeNames.getMap()
		assertEquals(unicodeNames.getByCodePoint(0), 'NULL')
		assertEquals(m.get(0x0061), 'LATIN SMALL LETTER A')
		assertEquals(m.get(0x0062), 'LATIN SMALL LETTER B')
	})
})

Deno.test('handles premature gunzipping gracefully', async () => {
	// some build tools may automatically gunzip the file, so we handle that gracefully
	const gunzipped = gunzip(await Deno.readFile(new URL('../data/unicode-16.0.0-names.json.gz', import.meta.url)))

	const unicodeNames = await getUnicodeNames(gunzipped)
	assertEquals(unicodeNames.getByCodePoint('💩'.codePointAt(0)!), 'PILE OF POO')
})
