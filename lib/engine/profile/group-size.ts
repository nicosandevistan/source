import { entryTypeToHookType, hookTypes } from "@/config/app";
import type { EntryType } from "./types";

/** Default est_group_size for a new entry; the user can override it. */
export function defaultGroupSize(type: EntryType): number {
  return hookTypes[entryTypeToHookType[type]].defaultGroupSize;
}
