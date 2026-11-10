"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FormError, Input, Label, Select } from "@/components/ui/field";
import { ENTRY_TYPES, ENTRY_TYPE_LABELS, type EntryType, type ProfileEntry } from "@/lib/engine/profile/types";
import { addEntry, updateEntry, type ActionResult } from "@/lib/profile/actions";

type Props =
  | { mode: "add"; type?: EntryType; placeholder?: string; entry?: undefined }
  | { mode: "edit"; entry: ProfileEntry; type?: undefined; placeholder?: undefined };

/** Add or edit one profile entry. With a fixed `type`, the kind selector is hidden. */
export function EntryForm({ mode, entry, type, placeholder }: Props) {
  const action = mode === "add" ? addEntry : updateEntry;
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const uid = entry?.id ?? `new-${type ?? "any"}`;

  useEffect(() => {
    if (mode === "add" && state?.ok) formRef.current?.reset();
  }, [mode, state]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-3 sm:grid-cols-2">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      {type ? (
        <input type="hidden" name="type" value={type} />
      ) : (
        <div className="space-y-1">
          <Label htmlFor={`${uid}-type`}>Kind</Label>
          <Select id={`${uid}-type`} name="type" defaultValue={entry?.type ?? "program"}>
            {ENTRY_TYPES.map((t) => (
              <option key={t} value={t}>
                {ENTRY_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div className={`space-y-1 ${type ? "sm:col-span-2" : ""}`}>
        <Label htmlFor={`${uid}-value`}>Name</Label>
        <Input
          id={`${uid}-value`}
          name="value"
          required
          maxLength={200}
          defaultValue={entry?.value}
          placeholder={placeholder}
        />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={`${uid}-details`}>Note (title, major, cohort…)</Label>
        <Input id={`${uid}-details`} name="details" maxLength={500} defaultValue={entry?.details ?? ""} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${uid}-start`}>Start</Label>
        <Input id={`${uid}-start`} name="start_date" placeholder="Jun 2024" defaultValue={entry?.start_date ?? ""} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${uid}-end`}>End</Label>
        <Input id={`${uid}-end`} name="end_date" placeholder="Aug 2024" defaultValue={entry?.end_date ?? ""} />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={`${uid}-size`}>About how many people were in this group?</Label>
        <Input
          id={`${uid}-size`}
          name="est_group_size"
          inputMode="numeric"
          placeholder="Leave blank for a typical size"
          defaultValue={entry?.est_group_size ?? ""}
        />
        <p className="text-xs text-neutral-600">Smaller groups make rarer, stronger connections.</p>
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : mode === "add" ? "Add" : "Save"}
        </Button>
        <FormError message={state && !state.ok ? state.error : null} />
        {mode === "edit" && state?.ok && <span className="text-sm text-green-700">Saved</span>}
      </div>
    </form>
  );
}
