"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FormError, Textarea } from "@/components/ui/field";
import { addVoiceSample, type ActionResult } from "@/lib/profile/actions";

export function VoiceSampleForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(addVoiceSample, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-2">
      <Textarea
        name="text"
        required
        aria-label="An email you wrote"
        placeholder="Paste an email you wrote before. Drafts will try to sound like you."
      />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Add sample"}
        </Button>
        <FormError message={state && !state.ok ? state.error : null} />
      </div>
    </form>
  );
}
