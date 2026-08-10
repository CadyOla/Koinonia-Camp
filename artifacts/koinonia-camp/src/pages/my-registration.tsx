import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Tent, Bus, Utensils, User } from "lucide-react";

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
}

export default function MyRegistration() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<RegistrationData | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${API_URL}/api/my-registration/${encodeURIComponent(code.trim())}`,
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

  if (data) {
    const needsRoomSelection =
      data.accommodationPreference === "Resident" && !data.roomAssignment;
    const needsPayment =
      data.accommodationPreference === "Non-Resident" &&
      data.paymentStatus?.toLowerCase() !== "completed";

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
                <span className="font-medium">You haven't picked a room yet</span> — Tap here to select and pay GHs100 to register! 
            Successful registration will display your room here after 15mins.
              </a>
            )}

            {needsPayment && (
              <a
                href={HQ_ROOM_SELECTION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100 transition-colors"
              >
                <span className="font-medium">Complete your registration for Koinonia '26</span>{" "}
                — tap to register and pay GHS100!
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
            <Input
              placeholder="KOI26-XXXXXX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              className="text-center font-mono uppercase"
            />
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
