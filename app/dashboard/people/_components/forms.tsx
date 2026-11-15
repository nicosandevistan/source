"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FormError, Input, Label, Textarea } from "@/components/ui/field";
import { addPage, addPerson, addText, type ActionResult } from "@/lib/people/actions";

function useResetOnSuccess(state: ActionResult | null) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return ref;
}

/** Add someone by hand (spec "Manual" adapter). */
export function AddPersonForm({ company }: { company?: string }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(addPerson, null);
  const ref = useResetOnSuccess(state);
  const uid = company ?? "any";
  return (
    <form ref={ref} action={formAction} className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor={`${uid}-name`}>Full name</Label>
        <Input id={`${uid}-name`} name="full_name" required maxLength={200} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${uid}-company`}>Where they work</Label>
        <Input id={`${uid}-company`} name="company" required maxLength={200} defaultValue={company} />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={`${uid}-title`}>Title (optional)</Label>
        <Input id={`${uid}-title`} name="title" maxLength={300} placeholder="Associate" />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor={`${uid}-text`}>What you read about them (optional)</Label>
        <Textarea id={`${uid}-text`} name="text" className="min-h-24" maxLength={50000} placeholder="Paste their bio or profile text. It is checked word for word before anything is shown." />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          Add person
        </Button>
        <FormError message={state && !state.ok ? state.error : null} />
      </div>
    </form>
  );
}

/** Add a public page about someone, or paste text from a page that can't be fetched. */
export function EvidenceForms({ personId }: { personId: string }) {
  return (
    <div className="grid gap-3">
      <AddPageForm personId={personId} />
      <details>
        <summary className="cursor-pointer text-xs text-neutral-600">Or paste text instead (for LinkedIn or pages that won&apos;t load)</summary>
        <AddTextForm personId={personId} />
      </details>
    </div>
  );
}

function AddPageForm({ personId }: { personId: string }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(addPage, null);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={formAction} className="space-y-1">
      <input type="hidden" name="person_id" value={personId} />
      <div className="flex flex-wrap gap-2">
        <Input name="url" required maxLength={2000} placeholder="Link to a bio, team page or article" aria-label="Page link" className="max-w-96" />
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Reading…" : "Add page"}
        </Button>
      </div>
      <FormError message={state && !state.ok ? state.error : null} />
    </form>
  );
}

function AddTextForm({ personId }: { personId: string }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(addText, null);
  const ref = useResetOnSuccess(state);
  return (
    <form ref={ref} action={formAction} className="mt-2 space-y-1">
      <input type="hidden" name="person_id" value={personId} />
      <Textarea name="text" required className="min-h-24" maxLength={50000} aria-label="Text about them" />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        Save text
      </Button>
      <FormError message={state && !state.ok ? state.error : null} />
    </form>
  );
}
