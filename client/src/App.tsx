import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";

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
      <Router />
    </QueryClientProvider>
  );
}

export default App;
