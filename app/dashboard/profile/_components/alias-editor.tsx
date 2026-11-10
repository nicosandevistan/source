"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormError, Input } from "@/components/ui/field";
import { saveAliases, suggestEntryAliases } from "@/lib/profile/actions";

/**
 * Alternate names for an entry. Suggestions are only proposals: nothing is
 * saved until the user ticks them and presses Save.
 */
export function AliasEditor({ entryId, aliases }: { entryId: string; aliases: string[] }) {
  const [chosen, setChosen] = useState<string[]>(aliases);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const options = [...new Set([...aliases, ...suggested, ...chosen])];
  const toggle = (alias: string) => {
    setSaved(false);
    setChosen((c) => (c.includes(alias) ? c.filter((a) => a !== alias) : [...c, alias]));
  };

  function suggest() {
    setError(null);
    startTransition(async () => {
      const result = await suggestEntryAliases(entryId);
      if (!result.ok) setError(result.error);
      else if (result.aliases.length === 0) setError("No other names found.");
      else setSuggested(result.aliases);
    });
  }

  function addTyped() {
    const value = typed.trim();
    if (!value) return;
    setSaved(false);
    setChosen((c) => (c.includes(value) ? c : [...c, value]));
    setTyped("");
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveAliases(entryId, chosen);
      if (result.ok) setSaved(true);
      else setError(result.error);
    });
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Other names this goes by</p>
      {options.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {options.map((alias) => (
            <li key={alias}>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-2.5 py-1 text-xs">
                <input type="checkbox" checked={chosen.includes(alias)} onChange={() => toggle(alias)} />
                {alias}
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTyped();
            }
          }}
          placeholder="Type another name"
          aria-label="Another name"
          className="max-w-56"
        />
        <Button type="button" variant="outline" size="sm" onClick={addTyped}>
          Add
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={suggest} disabled={pending}>
          Suggest names
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          Save names
        </Button>
        {saved && <span className="text-sm text-green-700">Saved</span>}
      </div>
      <FormError message={error} />
    </div>
  );
}
