import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import RollRoom from "./pages/RollRoom";
import RollRoomDetail from "./pages/RollRoomDetail";
import Profile from "./pages/Profile";
import Share from "./pages/Share";
import Bag from "./pages/Bag";
import Backpack from "./pages/Backpack";
import Recharge from "./pages/Recharge";
import Deposit from "./pages/Deposit";
import RollX from "./pages/RollX";
import CustomerService from "./pages/CustomerService";
import AgentLogin from "./pages/AgentLogin";
import AgentDashboard from "./pages/AgentDashboard";
import Shop from "./pages/Shop";
import Arena from "./pages/Arena";
import ArenaRoom from "./pages/ArenaRoom";
import ArenaHistory from "./pages/ArenaHistory";
import UncrossableRush from "./pages/UncrossableRush";
import DingDong from "./pages/DingDong";
import SteamSettings from "./pages/SteamSettings";
import SecurityPassword from "./pages/SecurityPassword";
import MyRecords from "./pages/MyRecords";
import VipPage from "./pages/VipPage";
import Mailbox from "./pages/Mailbox";
function Router() {
  return (
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
      <Route path={"/steam-settings"} component={SteamSettings} />
      <Route path={"/security-password"} component={SecurityPassword} />
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
