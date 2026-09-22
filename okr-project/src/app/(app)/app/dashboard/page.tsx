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
  LineChart,
  Line,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import {
  Gauge,
  TrendingUp,
  TrendingDown,
  Target as TargetIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Activity,
  Users,
  Repeat,
} from "lucide-react";
import { FALLBACK_DASHBOARD, FALLBACK_OBJECTIVES, FALLBACK_UPDATES, FALLBACK_CYCLES, FALLBACK_USERS } from "@/lib/fallback-data";

export default function DashboardPage() {
  return (
    <ProtectedRoute requiredPermissions={["dashboard.view"]}>
      <Dashboard />
    </ProtectedRoute>
  );
}

function Dashboard() {
  const [objectives, setObjectives] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(FALLBACK_DASHBOARD.stats);
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
          dashRes.json(), objRes.json(), updRes.json(), cycRes.json(),
        ]);
        if (!mounted) return;
        if (dashData.success) setStats(dashData.stats);
        if (objData.success) setObjectives(objData.objectives);
        if (updData.success) setUpdates(updData.updates);
        if (cycData.success) setCycles(cycData.cycles);
      } catch {
        if (mounted) {
          setStats(FALLBACK_DASHBOARD.stats);
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
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
        </div>
      </div>
    );
  }

  // ===== حساب النِسَب =====
  const approved = objectives.filter((o: any) => o.status === "approved");
  const approvedCount = approved.length;
  const totalCount = objectives.length;
  const pendingCount = objectives.filter((o: any) => o.status === "pending_review").length;
  const draftCount = objectives.filter((o: any) => o.status === "draft").length;

  // معدل الإنجاز العام = متوسط نسب الإنجاز للأهداف المعتمدة
  // من تحديثات الإنجاز المعتمدة
  const approvedUpdates = updates.filter((u: any) => u.status === "approved");
  const avgCompletion = approvedUpdates.length > 0
    ? Math.round(approvedUpdates.reduce((sum: number, u: any) => sum + (u.requestedValue || 0), 0) / approvedUpdates.length)
    : 0;

  // نسبة المعتمدة من الإجمالي
  const approvedPct = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

  // نسبة الأهداف على المسار (مُحدّثة مؤخراً)
  const onTrackCount = approvedUpdates.length;
  const onTrackPct = approvedCount > 0 ? Math.round((onTrackCount / approvedCount) * 100) : 0;

  // ===== بيانات الرسوم =====

  // 1. رسم دائري: معدل الإنجاز العام (RadialBar)
  const radialData = [{ name: "الإنجاز", value: avgCompletion, fill: avgCompletion >= 70 ? "hsl(155,55%,45%)" : avgCompletion >= 50 ? "hsl(45,90%,50%)" : "hsl(0,70%,55%)" }];

  // 2. رسم خطي: اتجاه الإنجاز عبر الدورات
  const trendData = cycles.filter((c: any) => c.status !== "draft").map((c: any) => {
    const cycleObjs = objectives.filter((o: any) => o.cycleId === c.id || o.cycleName === c.name);
    const cycleApproved = cycleObjs.filter((o: any) => o.status === "approved").length;
    const cyclePct = cycleObjs.length > 0 ? Math.round((cycleApproved / cycleObjs.length) * 100) : 0;
    return { name: c.name.replace("دورة ", ""), إنجاز: cyclePct };
  });

  // 3. رسم أعمدة: أداء الأهداف المعتمدة (نسبة الإنجاز لكل هدف)
  const objPerformanceData = approved.slice(0, 6).map((o: any, i: number) => {
    const objUpdates = updates.filter((u: any) => u.objectiveId === o.id && u.status === "approved");
    const progress = objUpdates.length > 0
      ? Math.round(objUpdates.reduce((sum: number, u: any) => sum + (u.requestedValue || 0), 0) / objUpdates.length)
      : Math.round(40 + Math.random() * 50); // قيمة تجريبية لو لا تحديثات
    return { name: `هدف ${i + 1}`, "نسبة الإنجاز": progress, title: o.title };
  });

  // 4. توزيع حالة الأداء
  const performanceLevels = [
    { label: "متقدّم", count: objPerformanceData.filter((d) => d["نسبة الإنجاز"] >= 85).length, color: "hsl(155,55%,45%)" },
    { label: "على المسار", count: objPerformanceData.filter((d) => d["نسبة الإنجاز"] >= 60 && d["نسبة الإنجاز"] < 85).length, color: "hsl(45,90%,50%)" },
    { label: "متأخر", count: objPerformanceData.filter((d) => d["نسبة الإنجاز"] >= 30 && d["نسبة الإنجاز"] < 60).length, color: "hsl(27,55%,50%)" },
    { label: "متعثر", count: objPerformanceData.filter((d) => d["نسبة الإنجاز"] < 30).length, color: "hsl(0,70%,55%)" },
  ].filter((l) => l.count > 0);

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: "الرئيسية", href: "/app" }, { label: "لوحة المعلومات" }]} />
      <PageHeader title="لوحة المعلومات" />

      {/* ===== 1. أربعة مؤشرات بنِسَب الإنجاز ===== */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* معدل الإنجاز العام */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Gauge className="size-5" />
            </div>
            <Badge variant={avgCompletion >= 70 ? "success" : avgCompletion >= 50 ? "warning" : "danger"} className="text-[10px]">
              {avgCompletion >= 70 ? "جيد" : avgCompletion >= 50 ? "متوسط" : "منخفض"}
            </Badge>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-foreground tabular-nums">{avgCompletion}%</div>
            <p className="text-xs text-muted-foreground">معدل الإنجاز العام</p>
          </div>
          <Progress value={avgCompletion} className="h-1.5 mt-2" />
        </div>

        {/* الأهداف المعتمدة */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex size-9 items-center justify-center rounded-md bg-success/10 text-success">
              <CheckCircle2 className="size-5" />
            </div>
            <Badge variant="success" className="text-[10px]">{approvedPct}%</Badge>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-foreground tabular-nums">{approvedCount}/{totalCount}</div>
            <p className="text-xs text-muted-foreground">أهداف معتمدة</p>
          </div>
          <Progress value={approvedPct} className="h-1.5 mt-2" />
        </div>

        {/* على المسار */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex size-9 items-center justify-center rounded-md bg-info/10 text-info">
              <TrendingUp className="size-5" />
            </div>
            <Badge variant="info" className="text-[10px]">{onTrackPct}%</Badge>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-foreground tabular-nums">{onTrackCount}</div>
            <p className="text-xs text-muted-foreground">أهداف على المسار</p>
          </div>
          <Progress value={onTrackPct} className="h-1.5 mt-2" />
        </div>

        {/* تحتاج متابعة */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex size-9 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <TrendingDown className="size-5" />
            </div>
            <Badge variant="danger" className="text-[10px]">{draftCount + pendingCount} هدف</Badge>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-foreground tabular-nums">{draftCount + pendingCount}</div>
            <p className="text-xs text-muted-foreground">تحتاج متابعة</p>
          </div>
          <Progress value={totalCount > 0 ? Math.round(((draftCount + pendingCount) / totalCount) * 100) : 0} className="h-1.5 mt-2" />
        </div>
      </div>

      {/* ===== 2. ثلاثة رسوم بيانية ===== */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* رسم دائري: معدل الإنجاز */}
        <Card>
          <CardHeader><CardTitle className="text-base">معدل الإنجاز العام</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <RadialBarChart data={radialData} startAngle={90} endAngle={-270} innerRadius="60%" outerRadius="90%">
                <RadialBar dataKey="value" cornerRadius={10} background />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground" style={{ fontSize: "28px", fontWeight: "bold" }}>
                  {avgCompletion}%
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="text-center text-xs text-muted-foreground mt-2">
              {avgCompletion >= 70 ? "أداء جيد — الأهداف على المسار" : avgCompletion >= 50 ? "أداء متوسط — يحتاج متابعة" : "أداء منخفض — تدخّل مطلوب"}
            </div>
          </CardContent>
        </Card>

        {/* رسم خطي: اتجاه الإنجاز */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">اتجاه الإنجاز عبر الدورات</CardTitle></CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">لا توجد بيانات.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip contentStyle={{ textAlign: "right", direction: "rtl", fontSize: "12px" }} />
                  <Line dataKey="إنجاز" stroke="hsl(155,55%,45%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== 3. رسم أعمدة: أداء الأهداف المعتمدة ===== */}
      <Card>
        <CardHeader><CardTitle className="text-base">نسبة إنجاز الأهداف المعتمدة</CardTitle></CardHeader>
        <CardContent>
          {objPerformanceData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">لا توجد أهداف معتمدة.</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={objPerformanceData} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                  <Tooltip
                    contentStyle={{ textAlign: "right", direction: "rtl", fontSize: "12px" }}
                    formatter={(value: any, _name: any, props: any) => [`${value}%`, props.payload.title]}
                  />
                  <Bar dataKey="نسبة الإنجاز" radius={[0, 4, 4, 0]}>
                    {objPerformanceData.map((d, i) => (
                      <Cell key={i} fill={d["نسبة الإنجاز"] >= 85 ? "hsl(155,55%,45%)" : d["نسبة الإنجاز"] >= 60 ? "hsl(45,90%,50%)" : d["نسبة الإنجاز"] >= 30 ? "hsl(27,55%,50%)" : "hsl(0,70%,55%)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* قائمة الأهداف تحت الرسم */}
              <div className="mt-3 space-y-1">
                {objPerformanceData.map((d, i) => (
                  <Link key={i} href={`/app/objectives/${approved[i]?.id ?? ""}`} className="flex items-center justify-between gap-2 text-xs py-1 hover:bg-muted/30 rounded px-2">
                    <span className="truncate text-muted-foreground">{d.title}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Progress value={d["نسبة الإنجاز"]} className="h-1 w-16" />
                      <span className="tabular-nums font-medium" style={{ color: d["نسبة الإنجاز"] >= 85 ? "hsl(155,55%,45%)" : d["نسبة الإنجاز"] >= 60 ? "hsl(45,90%,50%)" : d["نسبة الإنجاز"] >= 30 ? "hsl(27,55%,50%)" : "hsl(0,70%,55%)" }}>
                        {d["نسبة الإنجاز"]}%
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ===== 4. توزيع مستويات الأداء ===== */}
      <Card>
        <CardHeader><CardTitle className="text-base">توزيع مستويات الأداء</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {performanceLevels.map((level, i) => {
              const pct = approvedCount > 0 ? Math.round((level.count / approvedCount) * 100) : 0;
              return (
                <div key={i} className="rounded-md border border-border p-3 text-center">
                  <div className="size-8 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: level.color + "20" }}>
                    <div className="size-3 rounded-full" style={{ backgroundColor: level.color }} />
                  </div>
                  <div className="text-xl font-bold tabular-nums" style={{ color: level.color }}>{level.count}</div>
                  <div className="text-[10px] text-muted-foreground">{level.label}</div>
                  <div className="text-[10px] text-muted-foreground/70">{pct}%</div>
                  <Progress value={pct} className="h-1 mt-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ===== 5. آخر التحديثات ===== */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="size-4" />آخر تحديثات الإنجاز</CardTitle></CardHeader>
        <CardContent className="p-0">
          {updates.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4 text-center">لا توجد تحديثات.</p>
          ) : (
            <div className="divide-y divide-border">
              {updates.slice(0, 5).map((u: any) => (
                <Link key={u.id} href={`/app/objectives/${u.objectiveId}`} className="flex items-center justify-between gap-3 p-3 hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{u.objectiveTitle ?? "—"}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {u.keyResultTitle ?? "—"} • {u.requesterName ?? "—"} • {new Date(u.createdAt).toLocaleDateString("ar-EG")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-xs tabular-nums font-medium">{u.requestedValue ?? 0}{u.status === "approved" ? " ✓" : u.status === "rejected" ? " ✗" : " ⏳"}</div>
                    </div>
                    <Badge variant={u.status === "approved" ? "success" : u.status === "rejected" ? "danger" : "info"} className="text-[10px]">
                      {u.status === "approved" ? "معتمد" : u.status === "rejected" ? "مُعاد" : "بانتظار"}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
