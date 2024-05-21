const UNICODE_VERSION = '15.1.0'
const subPaths = ['Names', 'Names/Control']

for (const subPath of subPaths) {
	const res = await fetch(
		`https://raw.githubusercontent.com/node-unicode/unicode-${UNICODE_VERSION}/main/${subPath}/index.js`,
	)
	const text = await res.text()
	const m = text.match(/(['"])([a-zA-Z0-9/+=]{20,})\1/)![2]

	const targetPath = `./data/unicode-${UNICODE_VERSION}-${kebab(subPath)}.json.gz`

	await Deno.writeFile(
		targetPath,
		Uint8Array.from(atob(m), (char) => char.codePointAt(0)!),
	)
}

function kebab(str: string) {
	return str.split(/[^\p{L}\p{M}\p{N}]+|(?<=\p{Ll})(?=\p{Lu})/u).join('-')
		.toLowerCase()
}
