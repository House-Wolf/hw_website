"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";

type Ship = { id: string; name: string; model: string; ownerName: string; ready: boolean };
const label = (ship: Ship) => `${ship.name} · ${ship.model} · ${ship.ownerName}`;

export default function ShipPicker({ ships, value, onChange, disabled }: { ships: Ship[]; value: string; onChange: (id: string) => void; disabled: boolean }) {
  const id = useId(), list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false), [search, setSearch] = useState(""), [active, setActive] = useState(0);
  const selected = ships.find((ship) => ship.id === value);
  const terms = search.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = ships.filter((ship) => terms.every((term) => label(ship).toLocaleLowerCase().includes(term)));
  const expanded = open && !disabled;
  const activeIndex = Math.min(active, matches.length - 1);
  useEffect(() => { if (expanded) list.current?.children[activeIndex]?.scrollIntoView({ block: "nearest" }); }, [activeIndex, expanded]);
  function choose(ship: Ship) { onChange(ship.id); setOpen(false); setSearch(""); }
  return <div className="relative min-w-0 flex-1">
    <label htmlFor={id} className="block text-sm">Attach verified ship</label>
    <div className="relative mt-1">
      <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
      <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={`${id}-ships`} aria-activedescendant={expanded && activeIndex >= 0 ? `${id}-ship-${activeIndex}` : undefined} aria-describedby={`${id}-hint`} autoComplete="off" disabled={disabled}
        className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background-card)] py-3 pl-10 pr-11 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-steel-light"
        placeholder="Search ship name, model or owner…" value={expanded ? search : selected ? label(selected) : ""}
        onFocus={() => { setSearch(""); setActive(0); setOpen(true); }}
        onBlur={() => setOpen(false)}
        onChange={(e) => { setSearch(e.target.value); setActive(0); setOpen(true); onChange(""); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!expanded) { setSearch(""); setOpen(true); setActive(0); }
            else setActive((index) => matches.length ? (index + (e.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length : 0);
          } else if (e.key === "Enter" && expanded) { e.preventDefault(); if (matches[activeIndex]) choose(matches[activeIndex]); }
          else if (e.key === "Escape" && expanded) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
        }} />
      {selected || (expanded && search) ? <button type="button" aria-label="Clear ship selection" disabled={disabled} className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded text-foreground-muted hover:text-foreground" onMouseDown={(e) => e.preventDefault()} onClick={() => { onChange(""); setSearch(""); setActive(0); setOpen(true); }}><X size={17} /></button> : <ChevronDown size={17} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted" />}
    </div>
    <p id={`${id}-hint`} className="mt-2 text-xs text-foreground-muted">Type to filter, then choose a ship. Use arrow keys and Enter to select.</p>
    {expanded && <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--background-card)] shadow-xl">
      <p role="status" className="border-b border-[var(--border-default)] px-4 py-2 text-xs text-foreground-muted">{matches.length ? `${matches.length} matching ${matches.length === 1 ? "ship" : "ships"}` : "No matching ships. Try another name, model or owner."}</p>
      <ul id={`${id}-ships`} ref={list} role="listbox" aria-label="Verified fleet ships" className="max-h-72 overflow-y-auto overscroll-contain p-1">
        {matches.map((ship, index) => <li key={ship.id} id={`${id}-ship-${index}`} role="option" aria-selected={ship.id === value}
          className={`cursor-pointer rounded-lg px-3 py-3 ${index === activeIndex ? "bg-steel/20 ring-1 ring-inset ring-steel/40" : "hover:bg-steel/10"}`}
          onMouseDown={(e) => e.preventDefault()} onMouseMove={() => setActive(index)} onClick={() => choose(ship)}>
          <span className="block break-words text-sm font-semibold">{ship.name}</span>
          <span className="mt-0.5 block break-words text-xs text-foreground-muted">{ship.model} · {ship.ownerName}</span>
          {!ship.ready && <span className="mt-1 block text-xs text-amber-200">Not ready</span>}
        </li>)}
      </ul>
    </div>}
  </div>;
}
