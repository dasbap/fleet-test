import { ROUTE_PATHS } from "@/navigation/routePaths";

type RoutePreloadTask = {
  test: (pathname: string) => boolean;
  preload: () => Promise<unknown>;
};

const isDashboardPath = (pathname: string) => pathname.startsWith("/dashboard");
const heavyDashboardPaths = [
  ROUTE_PATHS.dashboardReports,
  ROUTE_PATHS.dashboardTracking,
] as const;

const dashboardLeafTasks: RoutePreloadTask[] = [
  { test: (p) => p === "/dashboard" || p === "/dashboard/", preload: () => import("@/features/home/screens/MobileHomePage") },
  { test: (p) => p.startsWith("/dashboard/reports"), preload: () => import("@/pages/Reports") },
  { test: (p) => p.startsWith("/dashboard/maintenance"), preload: () => import("@/pages/Maintenance") },
  { test: (p) => p.startsWith("/dashboard/incidents/declare"), preload: () => import("@/features/incidents/screens/DeclareIncidentPage") },
  { test: (p) => p.startsWith("/dashboard/incidents"), preload: () => import("@/pages/Incidents") },
  { test: (p) => p.startsWith("/dashboard/vehicles/"), preload: () => import("@/features/fleet/screens/FleetVehicleDetailPage") },
  { test: (p) => p.startsWith("/dashboard/vehicles"), preload: () => import("@/features/fleet/screens/MobileFleetPage") },
  { test: (p) => p.startsWith("/dashboard/drivers/scores"), preload: () => import("@/features/drivers/screens/DriverScoresPage") },
  { test: (p) => p.startsWith("/dashboard/drivers"), preload: () => import("@/pages/Drivers") },
  { test: (p) => p.startsWith("/dashboard/shift") || p.startsWith("/dashboard/closure"), preload: () => import("@/pages/ShiftClosure") },
  { test: (p) => p.startsWith("/dashboard/settings"), preload: () => import("@/pages/Settings") },
  { test: (p) => p.startsWith("/dashboard/invitations"), preload: () => import("@/pages/Invitations") },
  { test: (p) => p.startsWith("/dashboard/teams"), preload: () => import("@/pages/Teams") },
  { test: (p) => p.startsWith("/dashboard/finances"), preload: () => import("@/pages/Finances") },
  { test: (p) => p.startsWith("/dashboard/collections"), preload: () => import("@/pages/Collections") },
  { test: (p) => p.startsWith("/dashboard/operations"), preload: () => import("@/features/operations/screens/MobileOperationsPage") },
  { test: (p) => p.startsWith("/dashboard/alerts/"), preload: () => import("@/features/alerts/screens/IncidentAlertDetailPage") },
  { test: (p) => p.startsWith("/dashboard/alerts"), preload: () => import("@/features/alerts/screens/MobileAlertsPage") },
  { test: (p) => p.startsWith("/dashboard/tutorials/"), preload: () => import("@/features/tutorials/screens/TutorialPlayerPage") },
  { test: (p) => p.startsWith("/dashboard/tutorials"), preload: () => import("@/features/tutorials/screens/TutorialsListPage") },
  { test: (p) => p.startsWith("/dashboard/profile"), preload: () => import("@/features/account/screens/MobileAccountPage") },
  { test: (p) => p.startsWith("/dashboard/my-vehicle"), preload: () => import("@/features/fleet/screens/MobileDriverFleetPage") },
  { test: (p) => p.startsWith("/dashboard/history"), preload: () => import("@/pages/History") },
  { test: (p) => p.startsWith("/dashboard/scan"), preload: () => import("@/pages/Scan") },
];

const devDashboardWarmupTasks: Array<() => Promise<unknown>> = [
  () => import("@/features/home/screens/MobileHomePage"),
  () => import("@/features/fleet/screens/MobileFleetPage"),
  () => import("@/pages/Maintenance"),
  () => import("@/features/alerts/screens/MobileAlertsPage"),
  () => import("@/pages/Drivers"),
  () => import("@/features/operations/screens/MobileOperationsPage"),
  () => import("@/pages/Teams"),
  () => import("@/pages/Invitations"),
  () => import("@/pages/Settings"),
  () => import("@/features/account/screens/MobileAccountPage"),
  () => import("@/pages/Finances"),
  () => import("@/pages/Collections"),
];

const rootTasks: RoutePreloadTask[] = [
  { test: (p) => p === "/", preload: () => import("@/pages/Index") },
  { test: (p) => p.startsWith("/auth"), preload: () => import("@/features/auth/screens/AuthPage") },
  { test: (p) => p.startsWith("/login"), preload: () => import("@/features/auth/screens/MobileLoginScreen") },
  { test: (p) => p.startsWith("/onboarding"), preload: () => import("@/components/auth/OnboardingRoute") },
  { test: (p) => p.startsWith("/start"), preload: () => import("@/components/auth/TenantBootstrapRoute") },
];

const hasFastConnection = () => {
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  };
  if (nav.connection?.saveData) return false;
  const networkType = nav.connection?.effectiveType;
  if (!networkType) return true;
  return networkType === "4g";
};

const scheduleIdle = (task: () => void, idleTimeoutMs = 1200) => {
  if ("requestIdleCallback" in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback(task, {
      timeout: idleTimeoutMs,
    });
    return;
  }
  window.setTimeout(task, 0);
};

function runPreloadTasksInIdleSlices(tasks: Array<() => Promise<unknown>>): void {
  let index = 0;

  const runNext = () => {
    const task = tasks[index];
    index += 1;
    if (!task) return;

    void task().finally(() => {
      if (index < tasks.length) {
        scheduleIdle(runNext);
      }
    });
  };

  scheduleIdle(runNext);
}

export function preloadRouteChunksForPath(pathname: string) {
  const normalizedPath = pathname || "/";

  if (!hasFastConnection()) {
    return;
  }

  const tasks: Array<() => Promise<unknown>> = [];

  if (isDashboardPath(normalizedPath)) {
    tasks.push(() => import("@/components/dashboard/DashboardLayout"));
    const isHeavyPath = heavyDashboardPaths.some((prefix) => normalizedPath.startsWith(prefix));
    const matchedDashboardTask = isHeavyPath
      ? undefined
      : dashboardLeafTasks.find((task) => task.test(normalizedPath));
    if (matchedDashboardTask) tasks.push(matchedDashboardTask.preload);
    if (import.meta.env.DEV) tasks.push(...devDashboardWarmupTasks);
  } else {
    const matchedRootTask = rootTasks.find((task) => task.test(normalizedPath));
    if (matchedRootTask) tasks.push(matchedRootTask.preload);
  }

  if (tasks.length === 0) return;
  runPreloadTasksInIdleSlices([...new Set(tasks)]);
}
