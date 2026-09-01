import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Search,
  Lock,
  CheckCircle2,
  Circle,
  User,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "";
const FOOD_TOKEN_KEY = "food_token";

function getStoredFoodToken(): string | null {
  try {
    return localStorage.getItem(FOOD_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredFoodToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(FOOD_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(FOOD_TOKEN_KEY);
    }
  } catch {
    // localStorage unavailable — falls back to re-entering the passcode
    // each visit, which is a fine degrade for this low-stakes tool.
  }
}

interface MealEntry {
  key: string;
  label: string;
  dish: string | null;
  collectedAt: string | null;
}

interface LookupResult {
  referenceNumber: string;
  fullName: string;
  meals: MealEntry[];
}

function FoodLogin({ onSuccess }: { onSuccess: () => void }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/food/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (res.ok) {
        const data = await res.json();
        setStoredFoodToken(data.token);
        onSuccess();
      } else {
        setError("Incorrect passcode");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-sm w-full border-none shadow-sm">
        <CardContent className="p-8">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-center mb-1">
            Food Collection
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Enter the food-line passcode to continue
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder="Passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              autoFocus
              className="text-center"
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
  const [authed, setAuthed] = useState(() => !!getStoredFoodToken());
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const authHeaders = (): HeadersInit => {
    const token = getStoredFoodToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(
        `${API_URL}/api/food/lookup/${encodeURIComponent(code.trim())}`,
        { headers: authHeaders() },
      );
      if (res.status === 401) {
        setStoredFoodToken(null);
        setAuthed(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Registration not found");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleMeal = async (meal: MealEntry) => {
    if (!result) return;
    setTogglingKey(meal.key);
    try {
      const res = await fetch(
        `${API_URL}/api/food/lookup/${encodeURIComponent(
          result.referenceNumber,
        )}/collect`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({
            slot: meal.key,
            collected: !meal.collectedAt,
          }),
        },
      );
      if (res.status === 401) {
        setStoredFoodToken(null);
        setAuthed(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      }
    } catch {
      // Silently fail the toggle — the square just won't update, and the
      // volunteer can tap again. No need to interrupt the food line with
      // an alert for a transient network hiccup.
    } finally {
      setTogglingKey(null);
    }
  };

  if (!authed) {
    return <FoodLogin onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 p-4">
      <div className="max-w-md mx-auto pt-6">
        <h1 className="text-2xl font-bold text-foreground mb-1 text-center">
          Food Collection
        </h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Enter a reference number to check off meals
        </p>

        <form onSubmit={handleLookup} className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="KOI26-XXXXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              className="pl-9 h-12 font-mono uppercase bg-white"
            />
          </div>
          <Button type="submit" className="h-12 px-5" disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Find"
            )}
          </Button>
        </form>

        {error && (
          <p className="text-sm text-destructive text-center mb-4">{error}</p>
        )}

        {result && (
          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-lg font-bold">{result.fullName}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    {result.referenceNumber}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {result.meals.map((meal) => {
                  const collected = !!meal.collectedAt;
                  const isToggling = togglingKey === meal.key;
                  return (
                    <button
                      key={meal.key}
                      type="button"
                      onClick={() => toggleMeal(meal)}
                      disabled={isToggling}
                      className={`text-left rounded-xl border p-4 transition-colors ${
                        collected
                          ? "bg-emerald-50 border-emerald-300"
                          : "bg-white border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {meal.label}
                        </span>
                        {isToggling ? (
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
                        ) : collected ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        )}
                      </div>
                      <p
                        className={`text-sm leading-snug ${
                          collected
                            ? "text-emerald-800 font-medium"
                            : "text-foreground"
                        }`}
                      >
                        {meal.dish || "—"}
                      </p>
                    </button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                className="w-full mt-6"
                onClick={() => {
                  setResult(null);
                  setCode("");
                }}
              >
                Look up another
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
