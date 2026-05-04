export const ReservedSuperProps = [
  '$environment',
  '$service',
  '$session_id',
  'distinct_id',
  'request_id',
  '$group',
] as const

export type ReservedSuperProp = (typeof ReservedSuperProps)[number]

export function isReservedKey(key: string): boolean {
  return (ReservedSuperProps as readonly string[]).includes(key)
}
