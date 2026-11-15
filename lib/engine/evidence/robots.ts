/**
 * A small robots.txt reader: the groups that apply to our user agent (or
 * "*"), and whether a path is disallowed. Longest matching rule wins, and
 * Allow beats Disallow on a tie, as in RFC 9309.
 */
export function robotsAllows(robotsTxt: string, path: string, agent: string): boolean {
  const lines = robotsTxt.split(/\r?\n/).map((l) => l.replace(/#.*/, "").trim());
  type Rule = { allow: boolean; pattern: string };
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;
  let lastWasAgent = false;
  for (const line of lines) {
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();
    if (field === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((field === "allow" || field === "disallow") && current) {
      if (value || field === "allow") current.rules.push({ allow: field === "allow", pattern: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  const name = agent.toLowerCase();
  const specific = groups.filter((g) => g.agents.some((a) => a !== "*" && name.includes(a)));
  const applicable = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));
  const rules = applicable.flatMap((g) => g.rules);

  const matches = (pattern: string) => {
    const re = new RegExp(
      "^" + pattern.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*").replace(/\\\$$/, "$"),
    );
    return re.test(path);
  };
  let best: Rule | null = null;
  for (const rule of rules) {
    if (!rule.pattern || !matches(rule.pattern)) continue;
    if (!best || rule.pattern.length > best.pattern.length || (rule.pattern.length === best.pattern.length && rule.allow)) {
      best = rule;
    }
  }
  return best ? best.allow : true;
}
