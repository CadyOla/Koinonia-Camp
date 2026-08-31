import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Search,
  Tent,
  Bus,
  Utensils,
  User,
  CheckCircle2,
} from "lucide-react";
import { MEAL_SLOTS } from "@/lib/meal-menu";

const API_URL = import.meta.env.VITE_API_URL || "";

// Where residents without a synced room go to pick one on HQ's site.
const HQ_ROOM_SELECTION_URL = "https://koinoniacamp.com/register/accra-main/";

interface RegistrationData {
  referenceNumber: string;
  fullName: string;
  accommodationPreference: string;
  roomTypePreference?: string | null;
  lodgingType?: string | null;
  roomAssignment?: string | null;
  busAssignment?: string | null;
  paymentStatus?: string | null;
  feedingPreference: string;
  transportPreference: string;
  ageCategory: string;
  mealFridayEvening?: string | null;
  mealSaturdayAfternoon?: string | null;
  mealSaturdayEvening?: string | null;
  mealSundayAfternoon?: string | null;
  mealSundayEvening?: string | null;
  mealSelectionsSubmittedAt?: string | null;
}

const REFERENCE_PREFIX = "KOI26-";

// Strips a pasted "KOI26-" prefix (in case someone pastes the full code
// anyway) and keeps only digits, capped at 6 — matching the format
// generateReferenceNumber() produces on the backend.
function sanitizeCodeInput(raw: string): string {
  const withoutPrefix = raw.replace(/^koi26-?/i, "");
  return withoutPrefix.replace(/[^0-9]/g, "").slice(0, 6);
}

export default function MyRegistration() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<RegistrationData | null>(null);
  const [mealSelections, setMealSelections] = useState<Record<string, string>>({});
  const [submittingMeals, setSubmittingMeals] = useState(false);
  const [mealError, setMealError] = useState("");

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setLoading(true);
    setError("");
    try {
      const fullReference = `${REFERENCE_PREFIX}${code}`;
      const res = await fetch(
        `${API_URL}/api/my-registration/${encodeURIComponent(fullReference)}`,
      );
      if (res.ok) {
        const result = await res.json();
        setData(result);
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

  const handleSubmitMeals = async () => {
    if (!data) return;
    setMealError("");
    setSubmittingMeals(true);
    try {
      const res = await fetch(
        `${API_URL}/api/my-registration/${encodeURIComponent(
          data.referenceNumber,
        )}/meals`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mealSelections),
        },
      );
      if (res.ok) {
        const result = await res.json();
        // Merge the confirmed selections straight into local state so the
        // page locks into the read-only confirmation view immediately,
        // without needing a re-lookup.
        setData((prev) => (prev ? { ...prev, ...result } : prev));
      } else {
        const err = await res.json().catch(() => ({}));
        setMealError(err.error || "Something went wrong. Please try again.");
      }
    } catch {
      setMealError("Something went wrong. Please try again.");
    } finally {
      setSubmittingMeals(false);
    }
  };

  if (data) {
    const needsRoomSelection =
      data.accommodationPreference === "Resident" && !data.roomAssignment;
    const needsPayment =
      data.accommodationPreference === "Non-Resident" &&
      data.paymentStatus?.toLowerCase() !== "completed";
    const showsPaymentConfirmed =
      data.accommodationPreference === "Non-Resident" &&
      data.paymentStatus?.toLowerCase() === "completed";

    return (
      <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-none shadow-sm">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-lg font-bold">{data.fullName}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {data.referenceNumber}
                </p>
              </div>
            </div>

            {needsRoomSelection && (
              <a
                href={HQ_ROOM_SELECTION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100 transition-colors"
              >
                <span className="font-medium">Choose your room</span> — tap to
                select and pay GHS100 to register.
              </a>
            )}

            {needsPayment && (
              <a
                href={HQ_ROOM_SELECTION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100 transition-colors"
              >
                <span className="font-medium">Complete your registration</span>{" "}
                — tap to pay GHS100.
              </a>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Tent className="w-4 h-4" /> Accommodation
                </div>
                <span className="text-sm font-medium text-right">
                  {data.accommodationPreference}
                  {data.roomTypePreference
                    ? ` · ${data.roomTypePreference}`
                    : ""}
                </span>
              </div>

              {data.roomAssignment && (
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-sm text-muted-foreground">Room</span>
                  <span className="text-sm font-medium">
                    {data.roomAssignment}
                  </span>
                </div>
              )}

              {showsPaymentConfirmed && (
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <CheckCircle2 className="w-4 h-4" /> Registration
                  </div>
                  <span className="text-sm font-medium text-green-700">
                    Confirmed
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Bus className="w-4 h-4" /> Transport
                </div>
                <span className="text-sm font-medium">
                  {data.transportPreference}
                  {data.busAssignment ? ` · ${data.busAssignment}` : ""}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Utensils className="w-4 h-4" /> Feeding
                </div>
                <span className="text-sm font-medium">
                  {data.feedingPreference}
                </span>
              </div>
            </div>

            {data.feedingPreference === "Church Feeding" && (
              <div className="mt-6 pt-6 border-t">
                {data.mealSelectionsSubmittedAt ? (
                  <>
                    <div className="flex items-center gap-2 mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                      <CheckCircle2 className="w-5 h-5 text-green-700 flex-shrink-0" />
                      <span className="text-sm font-medium text-green-800">
                        Food choices submitted
                      </span>
                    </div>
                    <div className="space-y-3">
                      {MEAL_SLOTS.map((slot) => (
                        <div
                          key={slot.key}
                          className="flex items-center justify-between border-b pb-3 last:border-b-0 last:pb-0"
                        >
                          <span className="text-sm text-muted-foreground">
                            {slot.label}
                          </span>
                          <span className="text-sm font-medium text-right">
                            {(data as any)[slot.key]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-semibold text-foreground mb-1">
                      Choose your meals
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      Select one option per meal, then submit. Choices are
                      final once submitted.
                    </p>
                    <div className="space-y-5">
                      {MEAL_SLOTS.map((slot) => (
                        <div key={slot.key}>
                          <p className="text-sm font-medium mb-2">
                            {slot.label}
                          </p>
                          <RadioGroup
                            value={mealSelections[slot.key] || ""}
                            onValueChange={(val) =>
                              setMealSelections((prev) => ({
                                ...prev,
                                [slot.key]: val,
                              }))
                            }
                            className="space-y-2"
                          >
                            {slot.options.map((option) => (
                              <div
                                key={option}
                                className="flex items-center space-x-3 bg-white border rounded-lg p-3 cursor-pointer [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5"
                              >
                                <RadioGroupItem
                                  value={option}
                                  id={`${slot.key}-${option}`}
                                />
                                <Label
                                  htmlFor={`${slot.key}-${option}`}
                                  className="font-normal cursor-pointer text-sm flex-1"
                                >
                                  {option}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      ))}
                    </div>
                    {mealError && (
                      <p className="text-sm text-destructive mt-4">
                        {mealError}
                      </p>
                    )}
                    <Button
                      className="w-full mt-5"
                      disabled={
                        submittingMeals ||
                        MEAL_SLOTS.some((slot) => !mealSelections[slot.key])
                      }
                      onClick={handleSubmitMeals}
                    >
                      {submittingMeals ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Submit Meal Choices"
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full mt-6"
              onClick={() => setData(null)}
            >
              Look up another
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-sm w-full border-none shadow-sm">
        <CardContent className="p-8">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4 mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-center mb-1">
            My Registration
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Enter your reference number to view your details
          </p>
          <form onSubmit={handleLookup} className="space-y-4">
            <div className="flex items-center rounded-md border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
              <span className="pl-3 pr-1 text-sm font-mono text-muted-foreground select-none">
                {REFERENCE_PREFIX}
              </span>
              <Input
                value={code}
                onChange={(e) => setCode(sanitizeCodeInput(e.target.value))}
                placeholder="000000"
                autoFocus
                inputMode="numeric"
                maxLength={6}
                className="border-0 shadow-none pl-0 font-mono focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Find My Registration"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
