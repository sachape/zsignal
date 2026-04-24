import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthModalProvider } from "@/contexts/AuthModalContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";

// Lazy-loaded routes: keep landing (Index) eager for fastest LCP, defer the rest.
const AnalyzePage = lazy(() => import("./pages/AnalyzePage.tsx"));
const ResultPage = lazy(() => import("./pages/ResultPage.tsx"));
const ConnectTwitchPage = lazy(() => import("./pages/ConnectTwitchPage.tsx"));
const TwitchCallbackPage = lazy(() => import("./pages/TwitchCallbackPage.tsx"));
const AuthPage = lazy(() => import("./pages/AuthPage.tsx"));
const DashboardPage = lazy(() => import("./pages/DashboardPage.tsx"));
const WeeklyPlanPage = lazy(() => import("./pages/WeeklyPlanPage.tsx"));
const CompetitorsPage = lazy(() => import("./pages/CompetitorsPage.tsx"));
const PlaybooksPage = lazy(() => import("./pages/PlaybooksPage.tsx"));
const PlaybookDetailPage = lazy(() => import("./pages/PlaybookDetailPage.tsx"));
const StreamerProfilePage = lazy(() => import("./pages/StreamerProfilePage.tsx"));
const LeadersPage = lazy(() => import("./pages/LeadersPage.tsx"));
const LastLivePage = lazy(() => import("./pages/LastLivePage.tsx"));
const LivesPage = lazy(() => import("./pages/LivesPage.tsx"));
const LiveDetailPage = lazy(() => import("./pages/LiveDetailPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AuthModalProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/analyze" element={<AnalyzePage />} />
                <Route path="/result" element={<ResultPage />} />
                <Route path="/connect-twitch" element={<ConnectTwitchPage />} />
                <Route path="/twitch/callback" element={<TwitchCallbackPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/plan"
                  element={
                    <ProtectedRoute>
                      <WeeklyPlanPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/competitors"
                  element={
                    <ProtectedRoute>
                      <CompetitorsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/playbooks" element={<PlaybooksPage />} />
                <Route path="/playbooks/:slug" element={<PlaybookDetailPage />} />
                <Route
                  path="/leaders"
                  element={
                    <ProtectedRoute>
                      <LeadersPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/streamer/:login" element={<StreamerProfilePage />} />
                <Route
                  path="/lives"
                  element={
                    <ProtectedRoute>
                      <LivesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lives/last"
                  element={
                    <ProtectedRoute>
                      <LastLivePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/lives/:id"
                  element={
                    <ProtectedRoute>
                      <LiveDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthModalProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
