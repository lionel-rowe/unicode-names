import type { UnicodeVersion } from './_versions.ts'

const BRANCH = 'main'

export async function getLatestCommitHash(v: UnicodeVersion) {
	const url = new URL(`https://api.github.com/repos/node-unicode/unicode-${v}/commits/${BRANCH}`)
	const res = await fetch(url)

	if (!res.ok) {
		throw new Error(`Error ${res.status} (${res.statusText}) from ${url.href}`)
	}

	const { sha } = await res.json()

	if (typeof sha !== 'string') {
		throw new Error(`Expected commit hash to be a string, got ${typeof sha}`)
	}

	return sha
}
