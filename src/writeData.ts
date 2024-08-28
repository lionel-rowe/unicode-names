import { resolve } from '@std/path'
import { exists } from '@std/fs'
import type { UnicodeVersion } from './_versions.ts'
import { COMMIT_HASHES } from './_commits.ts'
import { gunzip, gzip } from './_gzip.ts'
import { isUnicodeVersion, UNICODE_VERSION_REGEX } from './_versions.ts'
import { getLatestCommitHash } from './_getLatestCommitHash.ts'

/**
 * @module
 * Scripts for fetching and writing the Unicode name data files.
 */

/**
 * Writes the Unicode name data files for the given Unicode version to the given directory.
 *
 * @param unicodeVersion The Unicode version to fetch data for.
 * @param dirPath The directory to write the data files to.
 *
 * @example
 * ```ts
 * import { writeUnicodeNameDataFile } from '@li/unicode-names/write-data'
 *
 * // writes to ./data/unicode-16.0.0-names.json.gz
 * await writeUnicodeNameDataFile('16.0.0', './data')
 * ```
 */
export async function writeUnicodeNameDataFile(
	unicodeVersion: UnicodeVersion | URL,
	dirPath: string,
): Promise<{
	path: string
}> {
	if (!await exists(dirPath)) {
		throw new Error(`Directory does not exist: ${dirPath}`)
	}

	const runsPath = 'Names'
	const overridesPaths = ['Names/Control']

	const _meta = unicodeVersion instanceof URL
		? extractVersionInfoFromGitHubUrl(unicodeVersion)
		: { unicodeVersion, commit: COMMIT_HASHES[unicodeVersion] }

	const meta = {
		unicodeVersion: _meta.unicodeVersion,
		commit: _meta.commit ?? await getLatestCommitHash(_meta.unicodeVersion),
	}

	if (!_meta.commit) {
		console.warn(
			`No commit hash found for Unicode version ${unicodeVersion}. Using latest commit hash: ${meta.commit}`,
		)
	}

	const [runs, ...overrides] = await Promise.all(
		[runsPath, ...overridesPaths].map(async (p) => ((await getUnzippedJson(meta, p)).json())),
	)

	const json = gzip(Response.json({ meta, runs, overrides }))

	const path = resolve(dirPath, `unicode-${meta.unicodeVersion}-names.json.gz`)
	await Deno.writeFile(path, json.body!)

	return { path }
}

async function getUnzippedJson(
	v: UnicodeVersion | { unicodeVersion: UnicodeVersion; commit: string },
	subPath: string,
) {
	const { unicodeVersion, commit } = typeof v === 'string' ? { unicodeVersion: v, commit: COMMIT_HASHES[v]! } : v

	const url = new URL(
		`https://raw.githubusercontent.com/node-unicode/unicode-${unicodeVersion}/${commit}/${subPath}/index.js`,
	)
	const res = await fetch(url)

	if (!res.ok) {
		throw new Error(`Error ${res.status} (${res.statusText}) from ${url.href}`)
	}

	const text = await res.text()
	const { b64 } = text.match(/(?<quot>['"])(?<b64>[a-zA-Z0-9/+=]{20,})\k<quot>/)!.groups!
	const bin = Uint8Array.from(atob(b64), (char) => char.codePointAt(0)!)

	return gunzip(bin)
}

// https://github.com/node-unicode/unicode-16.0.0 (no commit hash)
// https://github.com/node-unicode/unicode-16.0.0/commit/4f52237d3510018b669e5991ed02f5f952649b62 (with commit hash)
function extractVersionInfoFromGitHubUrl(url: URL): {
	unicodeVersion: UnicodeVersion
	commit?: string
} {
	const u = new URL(url)

	const segments = u.pathname.slice(1).split('/')
	const unicodeVersion = segments[1].match(/\d.+$/)?.[0]
	const commit = segments[3]

	if (!isUnicodeVersion(unicodeVersion)) {
		throw new Error(`Invalid Unicode version: ${unicodeVersion}. Must match ${UNICODE_VERSION_REGEX}`)
	}

	return { unicodeVersion, commit }
}

if (import.meta.main) {
	let unicodeVersion: string | URL = Deno.args[0]
	const [, dirPath] = Deno.args

	if (!unicodeVersion || !dirPath) {
		throw new Error(`Usage: write-data <unicodeVersion> <dirPath>`)
	}

	if (!isUnicodeVersion(unicodeVersion)) {
		unicodeVersion = new URL(unicodeVersion)
	}

	const { path } = await writeUnicodeNameDataFile(unicodeVersion, dirPath)

	console.info(`Wrote to ${path}`)
}
