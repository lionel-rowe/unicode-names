import { getLatestCommitHash } from './_getLatestCommitHash.ts'
import type { UnicodeVersion } from './_versions.ts'

// https://github.com/node-unicode/node-unicode-data/blob/main/README.md#using-the-data-in-your-scripts
// versions > 6.1.0 don't have name data
const UNICODE_VERSIONS = [
	'6.1.0',
	'6.2.0',
	'6.3.0',
	'7.0.0',
	'8.0.0',
	'9.0.0',
	'10.0.0',
	'11.0.0',
	'12.0.0',
	'12.1.0',
	'13.0.0',
	'14.0.0',
	'15.0.0',
	'15.1.0',
	'16.0.0',
] as const satisfies readonly UnicodeVersion[]

async function updateUnicodeCommitHashes() {
	const commits = Object.fromEntries(
		await Promise.all(UNICODE_VERSIONS.map(async (v) => [v, await getLatestCommitHash(v)])),
	)

	const ts = `
// Generated via src/_updateUnicodeCommitHashes.ts. Do not edit manually.
import type { UnicodeVersion } from './_versions.ts'

export const COMMIT_HASHES: Partial<Record<UnicodeVersion, string>> = ${JSON.stringify(commits, null, '\t')}
`.trimStart()

	await Deno.writeTextFile('./src/_commits.ts', ts)

	await new Deno.Command('deno', { args: ['fmt', './src/_commits.ts'] }).spawn().output()
}

if (import.meta.main) {
	await updateUnicodeCommitHashes()
}
