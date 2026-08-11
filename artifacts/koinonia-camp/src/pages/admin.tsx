import React, { useState, useEffect } from "react";
import {
  useListRegistrations,
  useGetRegistrationStats,
  getGetRegistrationStatsQueryKey,
  getListRegistrationsQueryKey,
  setAuthTokenGetter,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import {
  Users,
  Tent,
  Utensils,
  Bus,
  Search,
  FileSpreadsheet,
  Lock,
  Loader2,
  Send,
  BellRing,
  Wallet,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";

const API_URL = import.meta.env.VITE_API_URL || "";

// ---------------------------------------------------------------------------
// Bearer token auth (fixes Safari/iOS blocking cross-site cookies between
// the frontend and backend, which live on different onrender.com subdomains)
// ---------------------------------------------------------------------------
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
    // localStorage unavailable (e.g. private mode) — auth will fall back
    // to the cookie path on browsers where that works.
  }
}

// Registers the token getter once at module load so every generated
// hook (useGetRegistrationStats, useListRegistrations, etc.) automatically
// attaches "Authorization: Bearer <token>" to its requests.
setAuthTokenGetter(() => getStoredToken());

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
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
        if (data.token) {
          setStoredToken(data.token);
        }
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
          <h1 className="text-xl font-bold text-center mb-1">Admin Access</h1>
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

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [backfillResult, setBackfillResult] = useState<{
    total: number;
    sent: number;
    failed: number;
  } | null>(null);
  const [roomInviteLoading, setRoomInviteLoading] = useState(false);
  const [roomInviteResult, setRoomInviteResult] = useState<{
    total: number;
    sent: number;
    failed: number;
  } | null>(null);
  const [paymentReminderLoading, setPaymentReminderLoading] = useState(false);
  const [paymentReminderResult, setPaymentReminderResult] = useState<{
    total: number;
    sent: number;
    failed: number;
  } | null>(null);
  const [hqSyncLoading, setHqSyncLoading] = useState(false);
  const [hqSyncResult, setHqSyncResult] = useState<{
    fetched: number;
    matched: number;
    updated: number;
    reassigned: number;
    unmatched: string[];
  } | null>(null);

  const [filters, setFilters] = useState({
    branch: "all",
    accommodation: "all",
    feeding: "all",
    transport: "all",
  });

  useEffect(() => {
    // Try fetching stats once to see if we're already logged in.
    // Sends the stored bearer token (if any) so this works on Safari,
    // where the cross-site session cookie is blocked. Falls back to the
    // cookie automatically on browsers that do support it.
    const token = getStoredToken();
    fetch(`${API_URL}/api/registrations/stats`, {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
      .then((res) => {
        if (res.ok) {
          setAuthed(true);
        } else {
          // Stale/invalid token — clear it so the login screen shows cleanly.
          setStoredToken(null);
        }
      })
      .finally(() => setCheckingAuth(false));
  }, []);

  const queryParams = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(filters.branch !== "all" ? { branch: filters.branch } : {}),
    ...(filters.accommodation !== "all"
      ? { accommodation: filters.accommodation }
      : {}),
    ...(filters.feeding !== "all" ? { feeding: filters.feeding } : {}),
    ...(filters.transport !== "all" ? { transport: filters.transport } : {}),
  };

  const { data: stats, isLoading: isLoadingStats } = useGetRegistrationStats({
    query: { enabled: authed, queryKey: getGetRegistrationStatsQueryKey() },
    request: { credentials: "include" },
  });
  const { data: registrations, isLoading: isLoadingRegs } =
    useListRegistrations(queryParams, {
      query: {
        enabled: authed,
        queryKey: getListRegistrationsQueryKey(queryParams),
      },
      request: { credentials: "include" },
    });

  const handleExport = () => {
    if (!registrations || registrations.length === 0) return;

    const exportData = registrations.map((r) => ({
      Reference: r.referenceNumber,
      "Full Name": r.fullName,
      Phone: r.phoneNumber,
      Email: r.email || "N/A",
      Gender: r.gender,
      Branch: r.branch,
      Ministries: r.ministries.join(", "),
      "Emergency Contact": r.emergencyContactName,
      "Emergency Phone": r.emergencyContactNumber,
      Accommodation: r.accommodationPreference,
      "Room Type": r.roomTypePreference || "N/A",
      Feeding: r.feedingPreference,
      Transport: r.transportPreference,
      "Date Registered": format(new Date(r.createdAt), "MMM d, yyyy h:mm a"),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");

    const wscols = [
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 25 },
      { wch: 10 },
      { wch: 20 },
      { wch: 30 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
    ];
    worksheet["!cols"] = wscols;

    XLSX.writeFile(
      workbook,
      `Koinonia_Camp_Registrations_${format(new Date(), "yyyy-MM-dd")}.xlsx`,
    );
  };

  const handleBackfillSms = async () => {
    const confirmed = window.confirm(
      "This will text every registrant who hasn't been sent an SMS yet. This uses real SMS credits and cannot be undone. Continue?",
    );
    if (!confirmed) return;

    setBackfillLoading(true);
    setBackfillResult(null);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_URL}/api/admin/backfill-sms`, {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        setBackfillResult({
          total: data.total,
          sent: data.sent,
          failed: data.failed,
        });
      } else {
        alert("Backfill failed to start. Check the backend logs.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setBackfillLoading(false);
    }
  };

  const handleRoomInviteSms = async () => {
    const confirmed = window.confirm(
      "This will text every Accra Main resident who hasn't picked a room yet, inviting them to select one. This uses real SMS credits and cannot be undone. Continue?",
    );
    if (!confirmed) return;

    setRoomInviteLoading(true);
    setRoomInviteResult(null);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_URL}/api/admin/send-room-invite-sms`, {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        setRoomInviteResult({
          total: data.total,
          sent: data.sent,
          failed: data.failed,
        });
      } else {
        alert("Room invite send failed to start. Check the backend logs.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setRoomInviteLoading(false);
    }
  };

  const handlePaymentReminderSms = async () => {
    const confirmed = window.confirm(
      "This will text every Accra Main non-resident who hasn't paid yet, reminding them to pay GHS100. This uses real SMS credits and cannot be undone. Continue?",
    );
    if (!confirmed) return;

    setPaymentReminderLoading(true);
    setPaymentReminderResult(null);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_URL}/api/admin/send-payment-reminder-sms`, {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        setPaymentReminderResult({
          total: data.total,
          sent: data.sent,
          failed: data.failed,
        });
      } else {
        alert("Payment reminder send failed to start. Check the backend logs.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setPaymentReminderLoading(false);
    }
  };

  const handleHqSync = async () => {
    setHqSyncLoading(true);
    setHqSyncResult(null);
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_URL}/api/admin/sync-hq-registrations`, {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.ok) {
        const data = await res.json();
        setHqSyncResult({
          fetched: data.fetched,
          matched: data.matched,
          updated: data.updated,
          reassigned: data.reassigned ?? 0,
          unmatched: data.unmatched ?? [],
        });
      } else {
        alert("HQ sync failed to start. Check the backend logs.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setHqSyncLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
    <Card className="border-none shadow-sm hover-elevate transition-all">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">
            {title}
          </p>
          <h3 className="text-3xl font-bold tracking-tight text-foreground">
            {isLoadingStats ? "..." : (value ?? 0)}
          </h3>
        </div>
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClass}`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </CardContent>
    </Card>
  );

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authed) {
    return <AdminLogin onSuccess={() => setAuthed(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">
              Camp Dashboard
            </h1>
            <p className="text-muted-foreground">
              Koinonia 2026 Registration Overview
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                onClick={handleHqSync}
                disabled={hqSyncLoading}
                variant="outline"
                className="rounded-xl shadow-sm"
              >
                {hqSyncLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Sync HQ Rooms
              </Button>
              <Button
                onClick={handleBackfillSms}
                disabled={backfillLoading}
                variant="outline"
                className="rounded-xl shadow-sm"
              >
                {backfillLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send SMS Backfill
              </Button>
              <Button
                onClick={handleRoomInviteSms}
                disabled={roomInviteLoading}
                variant="outline"
                className="rounded-xl shadow-sm"
              >
                {roomInviteLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BellRing className="w-4 h-4 mr-2" />
                )}
                Invite to Select Room
              </Button>
              <Button
                onClick={handlePaymentReminderSms}
                disabled={paymentReminderLoading}
                variant="outline"
                className="rounded-xl shadow-sm"
              >
                {paymentReminderLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wallet className="w-4 h-4 mr-2" />
                )}
                Remind Non-Residents to Pay
              </Button>
              <Button
                onClick={handleExport}
                className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export to Excel
              </Button>
            </div>
            {hqSyncResult && (
              <p className="text-xs text-muted-foreground">
                HQ sync done: {hqSyncResult.matched} matched, {hqSyncResult.updated} updated ({hqSyncResult.reassigned} switched Resident/Non-Resident), out of {hqSyncResult.fetched} fetched.
              </p>
            )}
            {backfillResult && (
              <p className="text-xs text-muted-foreground">
                Backfill done: {backfillResult.sent} sent, {backfillResult.failed} failed, out of {backfillResult.total}.
              </p>
            )}
            {roomInviteResult && (
              <p className="text-xs text-muted-foreground">
                Room invites done: {roomInviteResult.sent} sent, {roomInviteResult.failed} failed, out of {roomInviteResult.total}.
              </p>
            )}
            {paymentReminderResult && (
              <p className="text-xs text-muted-foreground">
                Payment reminders done: {paymentReminderResult.sent} sent, {paymentReminderResult.failed} failed, out of {paymentReminderResult.total}.
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Registered"
            value={stats?.total}
            icon={Users}
            colorClass="bg-primary/10 text-primary"
          />
          <StatCard
            title="Residents"
            value={stats?.resident}
            icon={Tent}
            colorClass="bg-secondary/20 text-secondary-foreground"
          />
          <StatCard
            title="Church Feeding"
            value={stats?.churchFeeding}
            icon={Utensils}
            colorClass="bg-green-100 text-green-700"
          />
          <StatCard
            title="Church Bus"
            value={stats?.churchBus}
            icon={Bus}
            colorClass="bg-purple-100 text-purple-700"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-none shadow-sm flex flex-col h-[700px]">
            <CardHeader className="border-b px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-white z-10 rounded-t-xl">
              <CardTitle className="text-lg font-semibold">
                Registrations
              </CardTitle>

              <div className="flex flex-col sm:flex-row gap-2 flex-1 sm:justify-end">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search name or phone..."
                    className="pl-9 h-10 bg-gray-50 border-transparent focus-visible:ring-secondary focus-visible:bg-white"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select
                  value={filters.branch}
                  onValueChange={(val) =>
                    setFilters((f) => ({ ...f, branch: val }))
                  }
                >
                  <SelectTrigger className="w-full sm:w-[140px] h-10">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {stats?.byBranch?.map((b) => (
                      <SelectItem key={b.label} value={b.label}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-auto">
              <Table>
                <TableHeader className="bg-gray-50/50 sticky top-0 z-10 shadow-sm backdrop-blur-sm">
                  <TableRow className="border-none">
                    <TableHead className="w-[100px] pl-6">Ref</TableHead>
                    <TableHead>Registrant</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Logistics</TableHead>
                    <TableHead className="text-right pr-6">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingRegs ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-48 text-center text-muted-foreground"
                      >
                        Loading registrations...
                      </TableCell>
                    </TableRow>
                  ) : registrations?.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-48 text-center text-muted-foreground"
                      >
                        No registrations found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    registrations?.map((reg) => (
                      <TableRow
                        key={reg.id}
                        className="hover:bg-gray-50/50 border-b-gray-100"
                      >
                        <TableCell className="font-mono text-xs font-medium pl-6 text-primary">
                          {reg.referenceNumber}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {reg.fullName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {reg.phoneNumber}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-white font-normal text-xs"
                          >
                            {reg.branch}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] uppercase tracking-wider font-semibold ${reg.accommodationPreference === "Resident" ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-600"}`}
                            >
                              {reg.accommodationPreference === "Resident"
                                ? "Res"
                                : "Non-Res"}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] uppercase tracking-wider font-semibold ${reg.feedingPreference === "Church Feeding" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                            >
                              {reg.feedingPreference === "Church Feeding"
                                ? "Ch. Food"
                                : "Self Food"}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] uppercase tracking-wider font-semibold ${reg.transportPreference === "Church Bus" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}
                            >
                              {reg.transportPreference === "Church Bus"
                                ? "Bus"
                                : "Self Trans"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground pr-6 whitespace-nowrap">
                          {format(new Date(reg.createdAt), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b px-6 py-4 bg-gray-50/30">
                <CardTitle className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  By Branch
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[300px] overflow-y-auto">
                  {isLoadingStats ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      Loading...
                    </div>
                  ) : stats?.byBranch?.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No data
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {stats?.byBranch.map((b) => (
                        <div
                          key={b.label}
                          className="flex items-center justify-between p-4 hover:bg-gray-50/50"
                        >
                          <span className="text-sm font-medium text-foreground">
                            {b.label}
                          </span>
                          <span className="text-sm font-bold text-primary bg-primary/5 px-2 py-1 rounded-md">
                            {b.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="border-b px-6 py-4 bg-gray-50/30">
                <CardTitle className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  By Ministry
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[300px] overflow-y-auto">
                  {isLoadingStats ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      Loading...
                    </div>
                  ) : stats?.byMinistry?.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No data
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {stats?.byMinistry.map((m) => (
                        <div
                          key={m.label}
                          className="flex items-center justify-between p-4 hover:bg-gray-50/50"
                        >
                          <span className="text-sm font-medium text-foreground line-clamp-1 flex-1 pr-4">
                            {m.label}
                          </span>
                          <span className="text-sm font-bold text-primary bg-primary/5 px-2 py-1 rounded-md">
                            {m.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
