import { useState, useRef, useEffect, useMemo } from "react";

/**
 * Searchable select / combobox.
 *
 * Props:
 *  - options:    [{ value, label, sub? }]
 *  - value:      выбранный value (или "")
 *  - onChange:   (value) => void
 *  - placeholder
 *  - emptyText
 *
 * Поиск идёт по подстроке в label, регистронезависимо.
 */
export default function SearchableSelect({
  options = [],
  value = "",
  onChange,
  placeholder = "Выберите...",
  emptyText = "Ничего не найдено",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const selected = options.find((o) => String(o.value) === String(value));

  // Закрытие при клике вне
  useEffect(() => {
    function onClick(e) {
      if (!wrapperRef.current?.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Фильтрация
  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter((o) =>
      String(o.label).toLowerCase().includes(q) ||
      (o.sub && String(o.sub).toLowerCase().includes(q))
    );
  }, [options, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  function pick(opt) {
    onChange(opt.value);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlight];
      if (opt) pick(opt);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Триггер */}
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="w-full px-3 py-2 text-sm text-left rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400 flex justify-between items-center"
      >
        <span className={selected ? "" : "text-zinc-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="text-zinc-400 text-xs ml-2">▾</span>
      </button>

      {/* Дропдаун */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Поиск..."
              className="w-full px-2 py-1.5 text-sm rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 outline-none"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-3 text-xs text-zinc-400 text-center">{emptyText}</div>
            ) : (
              filtered.map((opt, i) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => pick(opt)}
                  onMouseEnter={() => setHighlight(i)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    i === highlight
                      ? "bg-zinc-100 dark:bg-zinc-800"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                  } ${
                    String(opt.value) === String(value)
                      ? "font-medium text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <div>{opt.label}</div>
                  {opt.sub && <div className="text-xs text-zinc-400">{opt.sub}</div>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
