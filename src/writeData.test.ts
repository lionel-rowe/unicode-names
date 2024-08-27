import { assertEquals } from '@std/assert'
import { writeUnicodeNameDataFile } from './writeData.ts'
import { UNICODE_VERSIONS } from './_versions.ts'

Deno.test({
	ignore: !Deno.env.get('INCLUDE_WRITE_DATA_TESTS'),
	name: writeUnicodeNameDataFile.name,
	async fn() {
		const dirPath = await Deno.makeTempDir()

		try {
			for (const version of UNICODE_VERSIONS) {
				await writeUnicodeNameDataFile(version, dirPath)
			}

			assertEquals((await Array.fromAsync(Deno.readDir(dirPath))).length, UNICODE_VERSIONS.length)
		} finally {
			await Deno.remove(dirPath, { recursive: true })
		}
	},
})
