"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/common/page-header";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { ProtectedRoute } from "@/components/auth/protected-route-v2";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import {
  Target as TargetIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Repeat,
  Activity,
  Calendar,
} from "lucide-react";
import { FALLBACK_DASHBOARD, FALLBACK_OBJECTIVES, FALLBACK_UPDATES, FALLBACK_CYCLES } from "@/lib/fallback-data";

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  pending_review: "قيد المراجعة",
  approved: "معتمد",
  returned: "مُعاد",
  closed: "مغلق",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "hsl(220, 14%, 60%)",
  pending_review: "hsl(45, 90%, 50%)",
  approved: "hsl(155, 55%, 45%)",
  returned: "hsl(0, 70%, 55%)",
  closed: "hsl(210, 50%, 40%)",
};

const TYPE_LABELS: Record<string, string> = {
  institutional: "مؤسسي",
  supporting: "تنظيمي",
  individual: "فردي",
};

const TYPE_COLORS = ["hsl(155, 55%, 45%)", "hsl(45, 90%, 50%)", "hsl(210, 50%, 50%)"];

export default function DashboardPage() {
  return (
    <ProtectedRoute requiredPermissions={["dashboard.view"]}>
      <Dashboard />
    </ProtectedRoute>
  );
}

function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [objectives, setObjectives] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [dashRes, objRes, updRes, cycRes] = await Promise.all([
          fetch("/api/dashboard", { credentials: "same-origin", cache: "no-store" }),
          fetch("/api/objectives", { credentials: "same-origin", cache: "no-store" }),
          fetch("/api/updates", { credentials: "same-origin", cache: "no-store" }),
          fetch("/api/cycles", { credentials: "same-origin", cache: "no-store" }),
        ]);
        const [dashData, objData, updData, cycData] = await Promise.all([
          dashRes.json(),
          objRes.json(),
          updRes.json(),
          cycRes.json(),
        ]);
        if (!mounted) return;
        if (dashData.success) setData(dashData);
        if (objData.success) setObjectives(objData.objectives);
        if (updData.success) setUpdates(updData.updates);
        if (cycData.success) setCycles(cycData.cycles);
      } catch {
        if (mounted) {
          setData(FALLBACK_DASHBOARD);
          setObjectives(FALLBACK_OBJECTIVES);
          setUpdates(FALLBACK_UPDATES);
          setCycles(FALLBACK_CYCLES);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <Breadcrumbs items={[{ label: "الرئيسية", href: "/app" }, { label: "لوحة المعلومات" }]} />
        <PageHeader title="لوحة المعلومات" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const totalCount = objectives.length;
  const approvedCount = objectives.filter((o: any) => o.status === "approved").length;
  const pendingCount = objectives.filter((o: any) => o.status === "pending_review").length;
  const draftCount = objectives.filter((o: any) => o.status === "draft").length;
  const returnedCount = objectives.filter((o: any) => o.status === "returned").length;

  const approvedPct = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;
  const draftPct = totalCount > 0 ? Math.round((draftCount / totalCount) * 100) : 0;
  const pendingPct = totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0;

  const statusData = (Object.keys(STATUS_LABELS) as string[]).map((status) => ({
    name: STATUS_LABELS[status],
    value: objectives.filter((o: any) => o.status === status).length,
    color: STATUS_COLORS[status],
  })).filter((d) => d.value > 0);

  const typeData = (Object.keys(TYPE_LABELS) as string[]).map((type, i) => ({
    name: TYPE_LABELS[type],
    value: objectives.filter((o: any) => o.type === type).length,
    color: TYPE_COLORS[i],
  })).filter((d) => d.value > 0);

  const pendingReview = objectives.filter((o: any) => o.status === "pending_review");
  const needsAttention = objectives.filter((o: any) => o.status === "draft" || o.status === "returned");
  const activeCycles = cycles.filter((c: any) => c.status === "active");
  const recentUpdates = updates.slice(0, 5);

  const activeCycle = activeCycles[0];
  let cycleProgress = 0;
  let daysRemaining = 0;
  if (activeCycle) {
    const now = new Date();
    const start = new Date(activeCycle.startDate);
    const end = new Date(activeCycle.endDate);
    const totalMs = end.getTime() - start.getTime();
    const elapsedMs = now.getTime() - start.getTime();
    cycleProgress = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));
    daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  const approvedOfTotalPct = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: "الرئيسية", href: "/app" }, { label: "لوحة المعلومات" }]} />
      <PageHeader title="لوحة المعلومات" />

      {/* KPI */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={<TargetIcon className="size-5" />} label="إجمالي الأهداف" value={totalCount} subValue={`${approvedPct}% معتمدة`} href="/app/objectives" />
        <KpiCard icon={<CheckCircle2 className="size-5" />} label="معتمدة" value={approvedCount} subValue={`${approvedPct}%`} color="text-success" bg="bg-success/10" href="/app/objectives" />
        <KpiCard icon={<Clock className="size-5" />} label="بانتظار المراجعة" value={pendingCount} subValue={`${pendingPct}%`} color="text-warning" bg="bg-warning/10" href="/app/reviews" />
        <KpiCard icon={<AlertTriangle className="size-5" />} label="مسودات + مُعاد" value={draftCount + returnedCount} subValue={`${draftPct}% مسودات`} color="text-destructive" bg="bg-destructive/10" href="/app/objectives" />
      </div>

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">توزيع حالات الأهداف</CardTitle></CardHeader>
          <CardContent>
            {statusData.length === 0 ? <div className="h-60 flex items-center justify-center text-sm text-muted-foreground">لا توجد أهداف.</div> : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                    label={(e: any) => `${e.value} (${totalCount > 0 ? Math.round((e.value / totalCount) * 100) : 0}%)`}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ textAlign: "right", direction: "rtl", fontSize: "12px" }} />
                  <Legend wrapperStyle={{ fontSize: "12px", direction: "rtl" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">توزيع أنواع الأهداف</CardTitle></CardHeader>
          <CardContent>
            {typeData.length === 0 ? <div className="h-60 flex items-center justify-center text-sm text-muted-foreground">لا توجد أهداف.</div> : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={typeData}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ textAlign: "right", direction: "rtl", fontSize: "12px" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {typeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Smart lists */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="size-4 text-warning" />بانتظار المراجعة ({pendingReview.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            {pendingReview.length === 0 ? <p className="text-sm text-muted-foreground p-4 text-center">لا توجد أهداف بانتظار المراجعة.</p> : (
              <div className="divide-y divide-border">
                {pendingReview.map((o: any) => (
                  <Link key={o.id} href={`/app/objectives/${o.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-muted/30">
                    <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{o.title}</div><div className="text-[10px] text-muted-foreground mt-0.5">{o.ownerName ?? "—"} • {o.orgUnitName ?? "—"}</div></div>
                    <Badge variant="warning" className="text-[10px] shrink-0">قيد المراجعة</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="size-4 text-destructive" />تحتاج متابعة ({needsAttention.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            {needsAttention.length === 0 ? <p className="text-sm text-muted-foreground p-4 text-center">لا توجد حالات تحتاج متابعة.</p> : (
              <div className="divide-y divide-border">
                {needsAttention.map((o: any) => (
                  <Link key={o.id} href={`/app/objectives/${o.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-muted/30">
                    <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{o.title}</div><div className="text-[10px] text-muted-foreground mt-0.5">{o.ownerName ?? "—"} • {o.orgUnitName ?? "—"}</div></div>
                    <Badge variant={o.status === "draft" ? "secondary" : "danger"} className="text-[10px] shrink-0">{STATUS_LABELS[o.status] ?? o.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Updates + Cycles */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="size-4" />آخر تحديثات الإنجاز</CardTitle></CardHeader>
          <CardContent className="p-0">
            {recentUpdates.length === 0 ? <p className="text-sm text-muted-foreground p-4 text-center">لا توجد تحديثات.</p> : (
              <div className="divide-y divide-border">
                {recentUpdates.map((u: any) => (
                  <Link key={u.id} href={`/app/objectives/${u.objectiveId}`} className="flex items-center justify-between gap-3 p-3 hover:bg-muted/30">
                    <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{u.objectiveTitle ?? "—"}</div><div className="text-[10px] text-muted-foreground mt-0.5">{u.keyResultTitle ?? "—"} • {u.requesterName ?? "—"}</div></div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs tabular-nums text-muted-foreground">{u.requestedValue ?? 0}</span>
                      <Badge variant={u.status === "approved" ? "success" : u.status === "rejected" ? "danger" : "info"} className="text-[10px]">{u.status === "approved" ? "معتمد" : u.status === "rejected" ? "مُعاد" : "بانتظار"}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Repeat className="size-4" />الدورات النشطة ({activeCycles.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            {activeCycles.length === 0 ? <p className="text-sm text-muted-foreground p-4 text-center">لا توجد دورات نشطة.</p> : (
              <div className="divide-y divide-border">
                {activeCycles.map((c: any) => {
                  const cycleObjs = objectives.filter((o: any) => o.cycleId === c.id || o.cycleName === c.name);
                  const cycleApproved = cycleObjs.filter((o: any) => o.status === "approved").length;
                  const cycleApprovedPct = cycleObjs.length > 0 ? Math.round((cycleApproved / cycleObjs.length) * 100) : 0;
                  return (
                    <Link key={c.id} href={`/app/cycles/${c.id}`} className="block p-3 hover:bg-muted/30">
                      <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{c.name}</span><Badge variant="success" className="text-[10px]">نشطة</Badge></div>
                      <div className="text-[10px] text-muted-foreground mt-1">{new Date(c.startDate).toLocaleDateString("ar-EG")} — {new Date(c.endDate).toLocaleDateString("ar-EG")}</div>
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1"><span>معتمدة: {cycleApproved}/{cycleObjs.length}</span><span>{cycleApprovedPct}%</span></div>
                        <Progress value={cycleApprovedPct} className="h-1.5" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cycle progress bar */}
      {activeCycle && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="size-4" />{activeCycle.name}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5"><span>التقدّم الزمني</span><span className="tabular-nums">{cycleProgress}%</span></div>
              <Progress value={cycleProgress} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="text-center"><div className="text-lg font-bold text-foreground tabular-nums">{cycleProgress}%</div><div className="text-[10px] text-muted-foreground">الزمن المنقضي</div></div>
              <div className="text-center"><div className="text-lg font-bold text-foreground tabular-nums">{daysRemaining}</div><div className="text-[10px] text-muted-foreground">يوم متبقي</div></div>
              <div className="text-center"><div className="text-lg font-bold text-success tabular-nums">{approvedOfTotalPct}%</div><div className="text-[10px] text-muted-foreground">أهداف معتمدة</div></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, subValue, href, color = "text-primary", bg = "bg-primary/10" }: { icon: React.ReactNode; label: string; value: number | string; subValue?: string; href?: string; color?: string; bg?: string; }) {
  const content = (
    <div className="rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all">
      <div className="flex size-9 items-center justify-center rounded-md ${bg} ${color}">
        <span className={`flex size-9 items-center justify-center rounded-md ${bg} ${color}`}>{icon}</span>
      </div>
      <div className="mt-3 space-y-0.5">
        <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}{subValue && <span className="text-[10px] text-muted-foreground/70 mr-1">• {subValue}</span>}</div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
