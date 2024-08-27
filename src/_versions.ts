import type { UnicodeVersion } from './types.ts'

export const UNICODE_VERSIONS = ['16.0.0', '15.1.0'] as const
export const isUnicodeVersion = (v: string): v is UnicodeVersion => UNICODE_VERSIONS.includes(v as UnicodeVersion)
