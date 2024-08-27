export type Streamable = Blob | ArrayBuffer | Uint8Array | Response | ReadableStream<Uint8Array>

export function toReadableStream(data: Streamable): ReadableStream<Uint8Array> {
	return data instanceof ReadableStream ? data : data instanceof Response ? data.body! : new Response(data).body!
}

function convert(C: new (x: CompressionFormat) => GenericTransformStream) {
	return (data: Streamable) => new Response(toReadableStream(data).pipeThrough(new C('gzip')))
}

export const gzip = convert(CompressionStream)
export const gunzip = convert(DecompressionStream)
