import { assertEquals } from '@std/assert'
import { getUnicodeNames } from './mod.ts'

const unicodeNames = await getUnicodeNames(
	fetch(
		import.meta.resolve('../data/unicode-16.0.0-names.json.gz'),
		{ cache: 'force-cache' },
	),
)

Deno.test(unicodeNames.getByCodePoint.name, () => {
	assertEquals(unicodeNames.getByCodePoint(0), 'NULL')
	assertEquals(unicodeNames.getByCodePoint(0x0061), 'LATIN SMALL LETTER A')
	assertEquals(unicodeNames.getByCodePoint(0x0062), 'LATIN SMALL LETTER B')
	assertEquals(unicodeNames.getByCodePoint('💩'.codePointAt(0)!), 'PILE OF POO')
})

Deno.test(unicodeNames.getMap.name, () => {
	const m = unicodeNames.getMap()
	assertEquals(unicodeNames.getByCodePoint(0), 'NULL')
	assertEquals(m.get(0x0061), 'LATIN SMALL LETTER A')
	assertEquals(m.get(0x0062), 'LATIN SMALL LETTER B')
})
