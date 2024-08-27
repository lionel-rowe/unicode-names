import { join } from '@std/path'
import { exists } from '@std/fs'
import type { UnicodeVersion } from './types.ts'
import { COMMIT_HASHES } from './_commits.ts'
import { gunzip, gzip } from './_gzip.ts'
import { isUnicodeVersion, UNICODE_VERSIONS } from './_versions.ts'

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
export async function writeUnicodeNameDataFile(unicodeVersion: UnicodeVersion, dirPath: string) {
	if (!await exists(dirPath)) {
		throw new Error(`Directory does not exist: ${dirPath}`)
	}

	const runsPath = 'Names'
	const overridesPaths = ['Names/Control']

	const [runs, ...overrides] = await Promise.all(
		[runsPath, ...overridesPaths].map(async (p) => ((await getUnzippedJson(unicodeVersion, p)).json())),
	)

	const commit = COMMIT_HASHES[unicodeVersion]
	const json = gzip(Response.json({ meta: { unicodeVersion, commit }, runs, overrides }))

	const targetPath = join(dirPath, `unicode-${unicodeVersion}-names.json.gz`)
	await Deno.writeFile(targetPath, json.body!)
}

async function getUnzippedJson(v: UnicodeVersion, subPath: string) {
	const commit = COMMIT_HASHES[v]
	const res = await fetch(`https://raw.githubusercontent.com/node-unicode/unicode-${v}/${commit}/${subPath}/index.js`)
	const text = await res.text()
	const { b64 } = text.match(/(?<quot>['"])(?<b64>[a-zA-Z0-9/+=]{20,})\k<quot>/)!.groups!
	const bin = Uint8Array.from(atob(b64), (char) => char.codePointAt(0)!)

	return gunzip(bin)
}

if (import.meta.main) {
	const [unicodeVersion, dirPath] = Deno.args

	if (!unicodeVersion || !dirPath) {
		throw new Error(`Usage: write-data <unicodeVersion> <dirPath>`)
	}

	if (!isUnicodeVersion(unicodeVersion)) {
		throw new Error(`Invalid Unicode version: ${unicodeVersion}. Must be one of ${UNICODE_VERSIONS.join(', ')}`)
	}

	await writeUnicodeNameDataFile(unicodeVersion, dirPath)
}
