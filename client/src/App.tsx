import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";

import HomePage from "@/pages/HomePage";
import MapView from "@/pages/MapView";
import SpotsList from "@/pages/SpotsList";
import SpotDetail from "@/pages/SpotDetail";
import ChatPage from "@/pages/ChatPage";
import ProfilePage from "@/pages/ProfilePage";
import AuthPage from "@/pages/AuthPage";
import GuidesPage from "@/pages/GuidesPage";
import BookingPage from "@/pages/BookingPage";
import BookingSuccessPage from "@/pages/BookingSuccessPage";
import BookingsListPage from "@/pages/BookingsListPage";
import BookingCancelPage from "@/pages/BookingCancelPage";
import RemindersPage from "@/pages/RemindersPage";
import DesignFrame from "@/pages/DesignFrame";
import RoutePage from "@/pages/RoutePage";
import CheckinPage from "@/pages/CheckinPage";
import GuideRegisterPage from "@/pages/GuideRegisterPage";
import NotFound from "@/pages/not-found";

// Handles OAuth callback params (?auth_success=wechat etc.)
function OAuthCallbackHandler() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("auth_success");
    const error = params.get("auth_error");

    if (success) {
      const providerName = success === "wechat" ? "微信" : "支付宝";
      // Re-fetch user from server (cookie already set by backend)
      fetch("/api/auth/phone/me").then(r => r.json()).then(d => {
        if (d.user) {
          localStorage.setItem("app_user", JSON.stringify(d.user));
          toast({ title: `${providerName}登录成功`, description: `欢迎，${d.user.nickname}` });
        }
      }).catch(() => {});
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (error) {
      const messages: Record<string, string> = {
        wechat_failed: "微信登录失败，请重试",
        alipay_failed: "支付宝登录失败，请重试",
        alipay_rsa_required: "支付宝登录需要进一步配置，请使用手机号登录",
      };
      toast({ title: "登录失败", description: messages[error] || "请重试", variant: "destructive" });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/map" component={MapView} />
      <Route path="/spots" component={SpotsList} />
      <Route path="/spots/:id" component={SpotDetail} />
      <Route path="/chat" component={ChatPage} />
      <Route path="/guides" component={GuidesPage} />
      <Route path="/book/:id" component={BookingPage} />
      <Route path="/booking/success" component={BookingSuccessPage} />
      <Route path="/booking/cancel" component={BookingCancelPage} />
      <Route path="/bookings" component={BookingsListPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/reminders" component={RemindersPage} />
      <Route path="/routes" component={RoutePage} />
      <Route path="/checkin" component={CheckinPage} />
      <Route path="/guide/register" component={GuideRegisterPage} />
      <Route path="/design" component={DesignFrame} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <OAuthCallbackHandler />
      <Router />
    </QueryClientProvider>
  );
}

export default App;
