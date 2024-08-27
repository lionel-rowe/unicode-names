export type Streamable = Blob | ArrayBuffer | Uint8Array | Response

function convert(C: new (x: CompressionFormat) => GenericTransformStream) {
	return (data: Blob | BufferSource | Response) =>
		new Response((data instanceof Response ? data.body! : new Blob([data]).stream()).pipeThrough(new C('gzip')))
}

export const gzip = convert(CompressionStream)
export const gunzip = convert(DecompressionStream)
