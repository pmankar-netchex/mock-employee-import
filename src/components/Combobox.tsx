"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

export type ComboboxOption = {
  value: string;
  label?: string; // defaults to value
  group?: string; // optional optgroup label
  hint?: string; // small secondary text (e.g. "match 92%")
  disabled?: boolean;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  emptyText?: string;
  size?: "sm" | "md";
  className?: string;
  // Optional inline append at the bottom of the panel (e.g. "Clear")
  onClear?: () => void;
  // Number of items to render — we cap to keep keyboard nav snappy on huge lists.
  maxItems?: number;
};

export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Pick one…",
  emptyText = "No matches.",
  size = "sm",
  className = "",
  onClear,
  maxItems = 200,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, maxItems);
    return options
      .filter((o) => {
        const hay = `${o.label ?? o.value} ${o.group ?? ""} ${o.hint ?? ""}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, maxItems);
  }, [options, query, maxItems]);

  // Group filtered items for rendering while preserving order.
  const grouped = useMemo(() => {
    const out: { group: string | undefined; items: ComboboxOption[] }[] = [];
    let current: { group: string | undefined; items: ComboboxOption[] } | null =
      null;
    for (const opt of filtered) {
      if (!current || current.group !== opt.group) {
        current = { group: opt.group, items: [] };
        out.push(current);
      }
      current.items.push(opt);
    }
    return out;
  }, [filtered]);

  // Flat list aligned with filtered for keyboard nav.
  const flat = filtered;

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
      setActiveIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll active item into view.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(
      `[data-cb-index="${activeIndex}"]`,
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const commit = useCallback(
    (opt: ComboboxOption | undefined) => {
      if (!opt || opt.disabled) return;
      onChange(opt.value);
      setOpen(false);
      setQuery("");
    },
    [onChange],
  );

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit(flat[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
    }
  }

  const sizeCls =
    size === "md" ? "px-3 py-2 text-sm" : "px-2 py-1 text-sm";

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full text-left rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 hover:border-zinc-400 dark:hover:border-zinc-600 flex items-center justify-between gap-2 ${sizeCls}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className={
            selected
              ? "text-zinc-900 dark:text-zinc-100 truncate"
              : "text-zinc-400 truncate"
          }
        >
          {selected ? selected.label ?? selected.value : placeholder}
        </span>
        <svg
          aria-hidden
          className="shrink-0 text-zinc-400"
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[260px] rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg">
          <div className="p-1.5 border-b border-zinc-100 dark:border-zinc-800">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              placeholder="Search…"
              className="w-full rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
          <div
            ref={listRef}
            className="max-h-72 overflow-auto py-1"
            role="listbox"
          >
            {grouped.length === 0 && (
              <div className="px-3 py-4 text-xs text-zinc-500 text-center">
                {emptyText}
              </div>
            )}
            {grouped.map((g, gi) => (
              <div key={`g-${gi}`}>
                {g.group && (
                  <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                    {g.group}
                  </div>
                )}
                {g.items.map((opt) => {
                  const flatIdx = flat.indexOf(opt);
                  const isActive = flatIdx === activeIndex;
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      data-cb-index={flatIdx}
                      onMouseEnter={() => setActiveIndex(flatIdx)}
                      onClick={() => commit(opt)}
                      disabled={opt.disabled}
                      role="option"
                      aria-selected={isSelected}
                      className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between gap-2 ${
                        isActive
                          ? "bg-zinc-100 dark:bg-zinc-800"
                          : ""
                      } ${
                        isSelected
                          ? "text-zinc-900 dark:text-zinc-50 font-medium"
                          : "text-zinc-700 dark:text-zinc-300"
                      } disabled:opacity-50`}
                    >
                      <span className="truncate">{opt.label ?? opt.value}</span>
                      {opt.hint && (
                        <span className="shrink-0 text-[11px] text-zinc-400">
                          {opt.hint}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {onClear && (
            <button
              type="button"
              onClick={() => {
                onClear();
                setOpen(false);
                setQuery("");
              }}
              className="w-full px-3 py-2 text-xs text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-t border-zinc-100 dark:border-zinc-800 text-left"
            >
              Clear selection
            </button>
          )}
        </div>
      )}
    </div>
  );
}
