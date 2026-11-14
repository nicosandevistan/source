"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FormError, Input } from "@/components/ui/field";
import { addTarget, type ActionResult } from "@/lib/plan/actions";

/** Add a firm by name. The list suggests catalog firms; any other name is kept as the user's own pick. */
export function AddFirm({ planId, firmNames }: { planId: string; firmNames: string[] }) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(addTarget, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-1">
      <input type="hidden" name="plan_id" value={planId} />
      <div className="flex flex-wrap gap-2">
        <Input name="name" list="catalog-firms" required maxLength={120} placeholder="Add a firm" aria-label="Firm name" className="max-w-72" />
        <datalist id="catalog-firms">
          {firmNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <Button type="submit" variant="outline" disabled={pending}>
          Add
        </Button>
      </div>
      <FormError message={state && !state.ok ? state.error : null} />
    </form>
  );
}
