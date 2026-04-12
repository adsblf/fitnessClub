import { useState, useEffect, useRef } from "react";
import { clientsApi } from "../api/clients";

export default function ClientSearchAutocomplete({ onSelect, placeholder = "Поиск клиента по ФИО..." }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const debounceTimer = useRef(null);

  useEffect(() => {
    // Дебаунс поиска
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    debounceTimer.current = setTimeout(() => {
      clientsApi
        .search(query, 10)
        .then((r) => {
          setResults(r.data.data);
          setShowDropdown(true);
        })
        .catch(() => {
          setResults([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  const handleSelect = (client) => {
    setQuery(client.full_name);
    setShowDropdown(false);
    onSelect(client);
  };

  const handleInputBlur = () => {
    // Небольшая задержка перед закрытием, чтобы позволить клику на элементе
    setTimeout(() => {
      setShowDropdown(false);
    }, 200);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length > 0 && setShowDropdown(true)}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-400"
      />

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-2 text-sm text-zinc-400">Поиск...</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-sm text-zinc-400">Клиенты не найдены</div>
          ) : (
            results.map((client) => (
              <div
                key={client.person_id}
                onClick={() => handleSelect(client)}
                className="px-3 py-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
              >
                <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                  {client.full_name}
                </div>
                <div className="text-xs text-zinc-500 flex items-center gap-2">
                  {client.phone && <span>{client.phone}</span>}
                  {client.active_membership && (
                    <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-100 px-2 py-0.5 rounded">
                      {client.remaining_visits} визитов
                    </span>
                  )}
                  {!client.active_membership && (
                    <span className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 px-2 py-0.5 rounded">
                      Нет абонемента
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

