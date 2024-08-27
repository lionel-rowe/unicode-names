import { UNICODE_VERSIONS } from './_versions.ts'

const BRANCH = 'main'

await updateUnicodeCommitHashes()

async function updateUnicodeCommitHashes() {
	const commits = Object.fromEntries(
		await Promise.all(
			UNICODE_VERSIONS.map(async (v) => {
				const res = await fetch(`https://api.github.com/repos/node-unicode/unicode-${v}/commits/${BRANCH}`)
				const json = await res.json()
				return [v, json.sha]
			}),
		),
	)

	const ts =
		`import type { UnicodeVersion } from './types.ts'\n\nexport const COMMIT_HASHES: Record<UnicodeVersion, string> = ${
			JSON.stringify(commits, null, '\t')
		}`

	await Deno.writeTextFile('./src/_commits.ts', ts)

	await new Deno.Command('deno', { args: ['fmt', './src/_commits.ts'] }).spawn().output()
}
