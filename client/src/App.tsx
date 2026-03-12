import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// ── 核心页面（首屏必须，同步加载）──────────────────────────────
import NotFound from "@/pages/NotFound";
import Home from "./pages/Home";
import Login from "./pages/Login";

// ── 其余页面懒加载（按需加载，减少首屏 JS 体积）────────────────
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const RollRoom = lazy(() => import("./pages/RollRoom"));
const RollRoomDetail = lazy(() => import("./pages/RollRoomDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const Share = lazy(() => import("./pages/Share"));
const Bag = lazy(() => import("./pages/Bag"));
const Backpack = lazy(() => import("./pages/Backpack"));
const Recharge = lazy(() => import("./pages/Recharge"));
const Deposit = lazy(() => import("./pages/Deposit"));
const RollX = lazy(() => import("./pages/RollX"));
const CustomerService = lazy(() => import("./pages/CustomerService"));
const AgentLogin = lazy(() => import("./pages/AgentLogin"));
const AgentDashboard = lazy(() => import("./pages/AgentDashboard"));
const Shop = lazy(() => import("./pages/Shop"));
const Arena = lazy(() => import("./pages/Arena"));
const ArenaRoom = lazy(() => import("./pages/ArenaRoom"));
const ArenaHistory = lazy(() => import("./pages/ArenaHistory"));
const UncrossableRush = lazy(() => import("./pages/UncrossableRush"));
const DingDong = lazy(() => import("./pages/DingDong"));
const Vortex = lazy(() => import("./pages/Vortex"));
const MyRecords = lazy(() => import("./pages/MyRecords"));
const VipPage = lazy(() => import("./pages/VipPage"));
const Mailbox = lazy(() => import("./pages/Mailbox"));

/** 全局页面切换 Loading 占位 */
function PageLoader() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0d0621",
        zIndex: 9999,
      }}
    >
      {/* 背景光晕 */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(100,30,200,0.25) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      {/* 加载圆圈 */}
      <div
        style={{
          position: "relative",
          width: 56,
          height: 56,
          border: "3px solid rgba(120,60,220,0.2)",
          borderTop: "3px solid #a855f7",
          borderRight: "3px solid rgba(168,85,247,0.5)",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
          boxShadow: "0 0 20px rgba(168,85,247,0.4)",
        }}
      />
      {/* 加载文字 */}
      <div style={{
        marginTop: 16,
        color: "rgba(168,85,247,0.7)",
        fontSize: 13,
        letterSpacing: 2,
        fontWeight: 500,
      }}>
        加载中...
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/login"} component={Login} />
        <Route path={"/admin"} component={AdminDashboard} />
        {/* 游戏页面 */}
        <Route path={"/arena"} component={Arena} />
        <Route path={"/arena/:id"} component={ArenaRoom} />
        <Route path={"/arena-history"} component={ArenaHistory} />
        <Route path={"/rollx"} component={RollX} />
        <Route path={"/rush"} component={UncrossableRush} />
        <Route path={"/dingdong"} component={DingDong} />
        <Route path={"/vortex"} component={Vortex} />
        <Route path={"/roll"} component={RollRoom} />
        <Route path={"/roll/:id"} component={RollRoomDetail} />
        {/* 底部导航页面 */}
        <Route path={"/profile"} component={Profile} />
        <Route path={"/share"} component={Share} />
        <Route path={"/bag"} component={Bag} />
        <Route path={"/backpack"} component={Backpack} />
        <Route path={"/recharge"} component={Deposit} />
        <Route path={"/shop"} component={Shop} />
        {/* 个人设置页面 */}
        <Route path={"/my-records"} component={MyRecords} />
        <Route path={"/vip"} component={VipPage} />
        <Route path={"/mailbox"} component={Mailbox} />
        {/* 客服系统 */}
        <Route path={"/kefu"} component={CustomerService} />
        <Route path={"/agent/login"} component={AgentLogin} />
        <Route path={"/agent"} component={AgentDashboard} />
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster richColors position="top-center" />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
