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
import Recharge from "./pages/Recharge";
import RollX from "./pages/RollX";
function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={Login} />
      <Route path={"/admin"} component={AdminDashboard} />
      {/* 游戏页面 */}
      <Route path={"/rollx"} component={RollX} />
      <Route path={"/roll"} component={RollRoom} />
      <Route path={"/roll/:id"} component={RollRoomDetail} />
      {/* 底部导航页面 */}
      <Route path={"/profile"} component={Profile} />
      <Route path={"/share"} component={Share} />
      <Route path={"/bag"} component={Bag} />
      <Route path={"/recharge"} component={Recharge} />
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
