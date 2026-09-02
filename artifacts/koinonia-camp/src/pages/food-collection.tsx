import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Lock, Check, Utensils } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";
const TOKEN_STORAGE_KEY = "admin_token";

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable — falls back to cookie auth where supported.
  }
}

function authHeaders(): HeadersInit {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface MealStatus {
  key: string;
  label: string;
  choice: string | null;
  collected: boolean;
  collectedAt: string | null;
}

interface Registrant {
  referenceNumber: string;
  fullName: string;
  phoneNumber: string;
  mealSelectionsSubmittedAt: string | null;
  meals: MealStatus[];
}

function FoodCollectionLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token) setStoredToken(data.token);
        onSuccess();
      } else {
        setError("Incorrect password");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-sm w-full border-none shadow-sm">
        <CardContent className="p-8">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-center mb-1">Food Collection</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Enter the admin password to continue
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FoodCollection() {
  const [authed, setAuthed] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Registrant[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Registrant | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  React.useEffect(() => {
    fetch(`${API_URL}/api/registrations/stats`, {
      credentials: "include",
      headers: authHeaders(),
    })
      .then((res) => {
        if (res.ok) setAuthed(true);
        else setStoredToken(null);
      })
      .finally(() => setCheckingAuth(false));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setSearching(true);
    setSelected(null);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/food-collection/search?q=${encodeURIComponent(query.trim())}`,
        { credentials: "include", headers: authHeaders() },
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } finally {
      setSearching(false);
    }
  };

  const handleToggle = async (slotKey: string) => {
    if (!selected) return;
    setToggling(slotKey);
    try {
      const res = await fetch(
        `${API_URL}/api/admin/food-collection/${encodeURIComponent(
          selected.referenceNumber,
        )}/toggle`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ slotKey }),
        },
      );
      if (res.ok) {
        const updated = await res.json();
        setSelected(updated);
        setResults((prev) =>
          prev.map((r) =>
            r.referenceNumber === updated.referenceNumber ? updated : r,
          ),
        );
      }
    } finally {
      setToggling(null);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authed) {
    return <FoodCollectionLogin onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            Food Collection
          </h1>
          <p className="text-muted-foreground text-sm">
            Search a name, phone, or reference number
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-9 h-11 bg-white"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <Button type="submit" className="h-11" disabled={searching}>
            {searching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Search"
            )}
          </Button>
        </form>

        {!selected && results.length > 0 && (
          <div className="space-y-2">
            {results.map((r) => (
              <button
                key={r.referenceNumber}
                onClick={() => setSelected(r)}
                className="w-full text-left bg-white border rounded-xl p-4 hover:border-primary transition-colors"
              >
                <p className="font-medium text-foreground">{r.fullName}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {r.referenceNumber} · {r.phoneNumber}
                </p>
                {!r.mealSelectionsSubmittedAt && (
                  <p className="text-xs text-amber-700 mt-1">
                    Hasn't submitted meal choices yet
                  </p>
                )}
              </button>
            ))}
          </div>
        )}

        {selected && (
          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <button
                onClick={() => setSelected(null)}
                className="text-xs text-primary font-medium mb-4"
              >
                ← Back to results
              </button>
              <p className="font-bold text-lg text-foreground">
                {selected.fullName}
              </p>
              <p className="text-xs text-muted-foreground font-mono mb-5">
                {selected.referenceNumber}
              </p>

              {!selected.mealSelectionsSubmittedAt ? (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  This person hasn't submitted their meal choices yet —
                  nothing to check off.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selected.meals.map((meal) => (
                    <button
                      key={meal.key}
                      onClick={() => handleToggle(meal.key)}
                      disabled={toggling === meal.key}
                      className={`aspect-square rounded-xl border-2 p-3 flex flex-col items-center justify-center text-center transition-colors ${
                        meal.collected
                          ? "border-primary bg-primary/10"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      {toggling === meal.key ? (
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      ) : meal.collected ? (
                        <Check className="w-6 h-6 text-primary mb-1" />
                      ) : (
                        <Utensils className="w-5 h-5 text-muted-foreground mb-1" />
                      )}
                      <span className="text-[11px] font-medium text-foreground leading-tight">
                        {meal.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                        {meal.choice}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
