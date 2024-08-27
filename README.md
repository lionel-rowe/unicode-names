# Unicode Names [![JSR](https://jsr.io/badges/@li/unicode-names)](https://jsr.io/@li/unicode-names)

Like `Names` module from https://github.com/node-unicode/unicode-16.0.0 but with the following changes:
* No runtime dependencies — no reliance on Node APIs or `zlib`, so works in browsers out-of-the-box. Gzip is handled by native `CompressionStream` and `DecompressionStream` APIs.
* Lazy-loaded — if you're only querying code points in the Latin-1 range, you only need to process a couple hundred code points.
* Uses raw binary data — no performance or file size overhead from base64 encoding.

## Usage

### Downloading and writing the binary data

```sh
mkdir -p ./path/to/data
# writes to ./path/to/data/unicode-16.0.0-names.json.gz
deno run -RWN @li/unicode-names/write-data 16.0.0 ./path/to/data
```

### API

`getUnicodeNames` takes binary data from a `Response`, `Blob`, `ArrayBuffer`, or `Uint8Array` (or a promise for any of those) and returns a `UnicodeNames` object which can be used to query the Unicode name data.

```ts
import { fetchByBaseUrl, getUnicodeNames } from '@li/unicode-names'

const unicodeNames = await getUnicodeNames(
    fetch(
        import.meta.resolve('./path/to/data/unicode-16.0.0-names.json.gz'),
        { cache: 'force-cache' },
    ),
)

unicodeNames.getByCodePoint('💩'.codePointAt(0)!) // 'PILE OF POO'
```

### Interactive CLI

```sh
deno run -R @li/unicode-names/cli

Input string: Hello, 🌍!
"H" (U+0048): LATIN CAPITAL LETTER H
"e" (U+0065): LATIN SMALL LETTER E
"l" (U+006C): LATIN SMALL LETTER L
"l" (U+006C): LATIN SMALL LETTER L
"o" (U+006F): LATIN SMALL LETTER O
"," (U+002C): COMMA
" " (U+0020): SPACE
"🌍" (U+1F30D): EARTH GLOBE EUROPE-AFRICA
"!" (U+0021): EXCLAMATION MARK
```
