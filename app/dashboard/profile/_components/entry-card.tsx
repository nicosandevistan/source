import { Button } from "@/components/ui/button";
import { ENTRY_TYPE_LABELS, type ProfileEntry } from "@/lib/engine/profile/types";
import { deleteEntry, setUseForMatching } from "@/lib/profile/actions";
import { AliasEditor } from "./alias-editor";
import { EntryForm } from "./entry-form";

const SOURCE_LABELS: Record<ProfileEntry["source"], string> = {
  linkedin_pdf: "LinkedIn PDF",
  linkedin_export: "LinkedIn export",
  resume: "Resume",
  manual: "Added by you",
};

export function EntryCard({ entry }: { entry: ProfileEntry }) {
  const dates = [entry.start_date, entry.end_date ?? (entry.start_date ? "present" : null)]
    .filter(Boolean)
    .join(" – ");

  return (
    <li className="rounded-md border border-neutral-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium break-words">{entry.value}</p>
          <p className="text-xs text-neutral-600">
            {[ENTRY_TYPE_LABELS[entry.type], entry.details, dates].filter(Boolean).join(" · ")}
          </p>
          <p className="text-xs text-neutral-500">
            {SOURCE_LABELS[entry.source]} · about {entry.est_group_size.toLocaleString("en-US")} people
            {entry.aliases.length > 0 && ` · also: ${entry.aliases.join(", ")}`}
          </p>
          {entry.needs_review && (
            <p className="text-xs font-medium text-amber-700">
              {entry.use_for_matching
                ? "Please check this entry."
                : "Not found word-for-word in your file. Check it, then switch matching on."}
            </p>
          )}
        </div>
        <form action={setUseForMatching}>
          <input type="hidden" name="id" value={entry.id} />
          <input type="hidden" name="use" value={entry.use_for_matching ? "false" : "true"} />
          <Button
            type="submit"
            size="sm"
            variant={entry.use_for_matching ? "default" : "outline"}
            aria-pressed={entry.use_for_matching}
          >
            {entry.use_for_matching ? "Used for matching" : "Not used"}
          </Button>
        </form>
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-sm text-neutral-700">Edit, other names, remove</summary>
        <div className="mt-3 space-y-4 border-t border-neutral-200 pt-3">
          <EntryForm mode="edit" entry={entry} />
          <AliasEditor entryId={entry.id} aliases={entry.aliases} />
          <form action={deleteEntry}>
            <input type="hidden" name="id" value={entry.id} />
            <Button type="submit" variant="ghost" size="sm" className="text-red-700 hover:bg-red-50">
              Remove this entry
            </Button>
          </form>
        </div>
      </details>
    </li>
  );
}
