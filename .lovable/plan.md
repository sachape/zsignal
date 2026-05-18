## Plan: Clean up Classements sorting + confirm row timestamp removal

### Scope
Frontend-only edits in `src/pages/LeadersPage.tsx`. No changes to `StreamScoreLeaderboard.tsx` (rows already do not display "Maj il y a X min" — only the footer keeps "Dernière maj", which is out of the "rows" scope per the request). No backend/API/sort-by-score changes.

### Changes

**`src/pages/LeadersPage.tsx`**

1. Track active tab in state: `const [tab, setTab] = useState<"streamscore" | "live">("streamscore");` and wire `<Tabs value={tab} onValueChange={...}>`.
2. Restrict `SortKey` to live-only: `type SortKey = "viewers" | "name"` (drop `"score"`). Update `SORT_COMPARATORS` to remove the `score` entry. Default `sort` state = `"viewers"`.
3. Make the "Tri" `<Select>` block render only when `tab === "live"`. On the StreamScore tab the filter card shows just Catégorie + Langue (grid collapses to 3 cols on lg).
4. In the Tri dropdown, keep only:
   - `viewers` → "Audience live"
   - `name` → "Nom"
   Remove the "Score Live" option.
5. Sort state is naturally tab-aware because Tri is hidden on StreamScore and `StreamScoreLeaderboard` ignores `sort` entirely (it uses backend order). No extra reset needed.

### Confirmations
- "Maj il y a X min" on rows: already removed in prior turn — verified in `StreamScoreLeaderboard.tsx` rows (lines 133–193). Footer "Dernière maj" stays (not a row).
- StreamScore ranking remains backend-driven (`fetchCategoryStreamScoreLeaders` ordered by score desc).
- Score Live tab data flow, API, and live filtering untouched.
- Helper copy in `StreamScoreLeaderboard` (`COPY_DEFAULT`) unchanged — already matches the required text.

### QA
- A: StreamScore tab → no Tri, rows sorted by score, no "Maj il y a X min".
- B: Score Live tab → Tri visible with only Audience live + Nom.
- C: Tab switch toggles Tri visibility cleanly; sort state never affects StreamScore rendering.
- D: `vite build` + tsc clean.
