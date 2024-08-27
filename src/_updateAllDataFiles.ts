import { writeUnicodeNameDataFile } from './writeData.ts'
import { UNICODE_VERSIONS } from './_versions.ts'

const dirPath = './data'

for (const version of UNICODE_VERSIONS) {
	await writeUnicodeNameDataFile(version, dirPath)
}
