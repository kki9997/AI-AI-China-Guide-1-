import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/use-auth";

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
import NotFound from "@/pages/not-found";

// Protected Route Wrapper
function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!user) {
    // Redirect handled in effect or by showing AuthPage, 
    // but cleaner to just render AuthPage here if unauthenticated
    return <AuthPage />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected Routes */}
      <Route path="/">
        {() => <ProtectedRoute component={MapView} />}
      </Route>
      <Route path="/spots">
        {() => <ProtectedRoute component={SpotsList} />}
      </Route>
      <Route path="/spots/:id">
        {() => <ProtectedRoute component={SpotDetail} />}
      </Route>
      <Route path="/chat">
        {() => <ProtectedRoute component={ChatPage} />}
      </Route>
      <Route path="/guides">
        {() => <ProtectedRoute component={GuidesPage} />}
      </Route>
      <Route path="/book/:id">
        {() => <ProtectedRoute component={BookingPage} />}
      </Route>
      <Route path="/booking/success">
        {() => <ProtectedRoute component={BookingSuccessPage} />}
      </Route>
      <Route path="/booking/cancel">
        {() => <ProtectedRoute component={GuidesPage} />}
      </Route>
      <Route path="/bookings">
        {() => <ProtectedRoute component={BookingsListPage} />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={ProfilePage} />}
      </Route>

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
