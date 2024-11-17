import { unicodeNames } from './_unicodeNames.ts'
import { border as defaultBorder, Table } from '@cliffy/table'
import type { Border, Column, ColumnOptions } from '@cliffy/table'
import { regExpEscape } from '@li/regexp-escape-polyfill'
import { Command } from '@cliffy/command'
import { brightBlack, red } from '@std/fmt/colors'

/**
 * @module
 * CLI app for getting Unicode names from code points.
 */

/** Data for a single Unicode name. */
type UnicodeNameData = {
	codePoint: number
	name: string
	char: string
	hex: string
}

function toUnicodeNameData(codePoint: number, name: string): UnicodeNameData {
	return {
		codePoint,
		name,
		char: String.fromCodePoint(codePoint),
		hex: String.raw`U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`.padStart(7, ' '),
	}
}

type TableOptions = {
	header: string[]
	body: string[][]
	columns?: (Column | ColumnOptions)[]
	border?: Border
}

const r: typeof String.raw = (s, ...vals) => String.raw(s, ...vals.map(regExpEscape))

// https://github.com/c4spar/deno-cliffy/issues/765
function table({ header, body, columns, border = defaultBorder }: TableOptions) {
	const { leftMid, mid, midMid, rightMid } = border
	const replacer = new RegExp(r`\n${leftMid}(?:${mid}|${midMid})+${rightMid}`, 'g')
	let rowIdx = 0

	return new Table()
		.columns(columns ?? [])
		.chars(border)
		.border()
		.header(header)
		.body(body)
		.toString()
		.replace(replacer, (m) => rowIdx++ ? '' : m)
}

const cli = new Command()

function toLimit(n: number | undefined) {
	return n === 0 ? Infinity : n ?? (Deno.stdout.isTerminal() ? 30 : Infinity)
}

function addTruncatedMessage(totalResults: number, body: string[][]) {
	if (totalResults > body.length) {
		body.push(['...', '...', `... ${totalResults - body.length} results hidden ...`])
	}
}

cli
	.command('names')
	.description('Search by Unicode name')
	.example(
		'usage',
		[
			brightBlack('# search for Unicode names containing "question" or "exclamation", e.g. "?", "!", etc.'),
			'un names question exclamation',
		].join('\n'),
	)
	.option(
		'-n, --num-results <n:number>',
		'Maximum number of results to return. 0 = unlimited. Default: 30 (or unlimited if stdout is not a TTY).',
	)
	.arguments('<names:string> [...names:string]')
	.action((options, ...names) => {
		let re: RegExp
		if (names.length === 1) {
			const [name] = names
			const regexSyntaxRe = /^\s*\/(?<source>.+?)\/(?<flags>[a-z]*)\s*$/
			const regexSyntaxMatch = name.match(regexSyntaxRe)

			re = regexSyntaxMatch
				? new RegExp(regexSyntaxMatch.groups!.source, regexSyntaxMatch.groups!.flags)
				: new RegExp(String.raw`\b${regExpEscape(name)}\b`, 'i')
		} else {
			re = new RegExp(String.raw`\b(?:${names.map(regExpEscape).join('|')})\b`, 'i')
		}

		const all = [...unicodeNames.getMap()].map(([codePoint, name]) => toUnicodeNameData(codePoint, name))
		const results: typeof all = []

		for (const x of all) {
			let matched = false
			const highlighted = x.name.replace(re, (m) => {
				matched = true
				return red(m)
			})

			if (matched) results.push({ ...x, name: highlighted })
		}

		const limit = toLimit(options.numResults)
		const header = ['Char', 'Hex', 'Name']
		const body = results
			.slice(0, limit)
			.map((x) => [x.char, x.hex, x.name])
		const columns = [{ maxWidth: 10 }, { maxWidth: 10 }, { minWidth: 60, maxWidth: 60 }]

		addTruncatedMessage(results.length, body)

		console.info(table({ header, body, columns }))
	})

cli
	.command('chars')
	.description('Search by chars')
	.example(
		'usage',
		[
			brightBlack('# search for the literal chars "a", "b", and "c"'),
			'un chars abc',
		].join('\n'),
	)
	.option(
		'-n, --num-results <n:number>',
		'Maximum number of results to return. 0 = unlimited. Default: 30 (or unlimited if stdout is not a TTY).',
	)
	.arguments('<chars:string> [...chars:string]')
	.action((options, ...chars) => {
		let str = chars.join('')

		try {
			str = JSON.parse(`"${
				str
					.replaceAll(
						new RegExp(String.raw`\\x(\p{AHex}{2})`, 'gu'),
						(_, x) => codePointToJsonEscaped(parseInt(x, 16)),
					).replaceAll(
						new RegExp(String.raw`\\u\{(\p{AHex}{1,6})\}`, 'gu'),
						(_, x) => codePointToJsonEscaped(parseInt(x, 16)),
					)
			}"`)
		} catch {
			// just use raw str
		}

		const limit = toLimit(options.numResults)
		const charArr = [...str]

		const body = charArr.slice(0, limit).map((x) => {
			const cp = x.codePointAt(0)!
			const name = unicodeNames.getByCodePoint(cp)!
			return toUnicodeNameData(cp, name)
		}).map((x) => [x.char, x.hex, x.name])

		addTruncatedMessage(charArr.length, body)

		console.info(
			table({
				header: ['Char', 'Hex', 'Name'],
				body,
				columns: [{ maxWidth: 10 }, { maxWidth: 10 }, { minWidth: 60, maxWidth: 60 }],
			}),
		)
	})

if (import.meta.main) {
	await cli.parse()
}

function codePointToJsonEscaped(cp: number) {
	if (cp > 0xffff) {
		cp -= 0x10000
		const high = 0xd800 + (cp >> 10 & 0x3ff)
		const low = 0xdc00 + (cp & 0x3ff)

		return [high, low].map(codeUnitToJsonEscaped).join('')
	}

	return codeUnitToJsonEscaped(cp)
}

function codeUnitToJsonEscaped(cu: number) {
	return String.raw`\u${cu.toString(16).padStart(4, '0')}`
}
