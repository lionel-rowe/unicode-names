/**
 * The Unicode version to use.
 */
export type UnicodeVersion = `${bigint}.${bigint}.${bigint}`

export const UNICODE_VERSION_REGEX = /^\d+\.\d+\.\d+$/i

export function isUnicodeVersion(v: string | undefined | null): v is UnicodeVersion {
	return UNICODE_VERSION_REGEX.test(v ?? '')
}
