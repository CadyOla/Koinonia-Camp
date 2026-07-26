import React, { useState } from "react";
import { 
  useListRegistrations, 
  useGetRegistrationStats 
} from "@workspace/api-client-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { 
  Users, Tent, Utensils, Bus, Search, FileSpreadsheet
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useDebounce } from "@/hooks/use-debounce";

export default function AdminDashboard() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  
  const [filters, setFilters] = useState({
    branch: "all",
    accommodation: "all",
    feeding: "all",
    transport: "all",
  });

  const queryParams = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(filters.branch !== "all" ? { branch: filters.branch } : {}),
    ...(filters.accommodation !== "all" ? { accommodation: filters.accommodation } : {}),
    ...(filters.feeding !== "all" ? { feeding: filters.feeding } : {}),
    ...(filters.transport !== "all" ? { transport: filters.transport } : {}),
  };

  const { data: stats, isLoading: isLoadingStats } = useGetRegistrationStats();
  const { data: registrations, isLoading: isLoadingRegs } = useListRegistrations(queryParams);

  const handleExport = () => {
    if (!registrations || registrations.length === 0) return;

    const exportData = registrations.map(r => ({
      "Reference": r.referenceNumber,
      "Full Name": r.fullName,
      "Phone": r.phoneNumber,
      "Email": r.email || "N/A",
      "Gender": r.gender,
      "Branch": r.branch,
      "Ministries": r.ministries.join(", "),
      "Emergency Contact": r.emergencyContactName,
      "Emergency Phone": r.emergencyContactNumber,
      "Accommodation": r.accommodationPreference,
      "Room Type": r.roomTypePreference || "N/A",
      "Feeding": r.feedingPreference,
      "Transport": r.transportPreference,
      "Date Registered": format(new Date(r.createdAt), "MMM d, yyyy h:mm a"),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");
    
    // Auto-size columns slightly
    const wscols = [
      { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 10 },
      { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }
    ];
    worksheet['!cols'] = wscols;

    XLSX.writeFile(workbook, `Koinonia_Camp_Registrations_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
    <Card className="border-none shadow-sm hover-elevate transition-all">
      <CardContent className="p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-bold tracking-tight text-foreground">
            {isLoadingStats ? "..." : value ?? 0}
          </h3>
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Camp Dashboard</h1>
            <p className="text-muted-foreground">Koinonia 2026 Registration Overview</p>
          </div>
          <Button onClick={handleExport} className="bg-primary hover:bg-primary/90 text-white rounded-xl shadow-sm">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>

        {/* Stats Grid */}
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
          {/* Main Table Area */}
          <Card className="lg:col-span-2 border-none shadow-sm flex flex-col h-[700px]">
            <CardHeader className="border-b px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-white z-10 rounded-t-xl">
              <CardTitle className="text-lg font-semibold">Registrations</CardTitle>
              
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
                  onValueChange={(val) => setFilters(f => ({...f, branch: val}))}
                >
                  <SelectTrigger className="w-full sm:w-[140px] h-10">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {stats?.byBranch?.map(b => (
                      <SelectItem key={b.label} value={b.label}>{b.label}</SelectItem>
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
                      <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                        Loading registrations...
                      </TableCell>
                    </TableRow>
                  ) : registrations?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
                        No registrations found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    registrations?.map((reg) => (
                      <TableRow key={reg.id} className="hover:bg-gray-50/50 border-b-gray-100">
                        <TableCell className="font-mono text-xs font-medium pl-6 text-primary">
                          {reg.referenceNumber}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{reg.fullName}</div>
                          <div className="text-xs text-muted-foreground">{reg.phoneNumber}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-white font-normal text-xs">{reg.branch}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="secondary" className={`text-[10px] uppercase tracking-wider font-semibold ${reg.accommodationPreference === 'Resident' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'}`}>
                              {reg.accommodationPreference === 'Resident' ? 'Res' : 'Non-Res'}
                            </Badge>
                            <Badge variant="secondary" className={`text-[10px] uppercase tracking-wider font-semibold ${reg.feedingPreference === 'Church Feeding' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {reg.feedingPreference === 'Church Feeding' ? 'Ch. Food' : 'Self Food'}
                            </Badge>
                            <Badge variant="secondary" className={`text-[10px] uppercase tracking-wider font-semibold ${reg.transportPreference === 'Church Bus' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                              {reg.transportPreference === 'Church Bus' ? 'Bus' : 'Self Trans'}
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

          {/* Breakdowns Sidebar */}
          <div className="space-y-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="border-b px-6 py-4 bg-gray-50/30">
                <CardTitle className="text-sm font-semibold text-foreground uppercase tracking-wider">By Branch</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[300px] overflow-y-auto">
                  {isLoadingStats ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
                  ) : stats?.byBranch?.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">No data</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {stats?.byBranch.map(b => (
                        <div key={b.label} className="flex items-center justify-between p-4 hover:bg-gray-50/50">
                          <span className="text-sm font-medium text-foreground">{b.label}</span>
                          <span className="text-sm font-bold text-primary bg-primary/5 px-2 py-1 rounded-md">{b.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader className="border-b px-6 py-4 bg-gray-50/30">
                <CardTitle className="text-sm font-semibold text-foreground uppercase tracking-wider">By Ministry</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[300px] overflow-y-auto">
                  {isLoadingStats ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
                  ) : stats?.byMinistry?.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">No data</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {stats?.byMinistry.map(m => (
                        <div key={m.label} className="flex items-center justify-between p-4 hover:bg-gray-50/50">
                          <span className="text-sm font-medium text-foreground line-clamp-1 flex-1 pr-4">{m.label}</span>
                          <span className="text-sm font-bold text-primary bg-primary/5 px-2 py-1 rounded-md">{m.count}</span>
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
