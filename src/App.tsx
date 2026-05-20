import { lazy, Suspense, useEffect } from "react";
import { analytics } from "@/services/analytics";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthModalProvider } from "@/contexts/AuthModalContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";

// Lazy-loaded routes: keep landing (Index) eager for fastest LCP, defer the rest.
const AnalyzePage = lazy(() => import("./pages/AnalyzePage.tsx"));
const AnalysePage = lazy(() => import("./pages/AnalysePage.tsx"));
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
const ClipsPage = lazy(() => import("./pages/ClipsPage.tsx"));
const AffiliationPage = lazy(() => import("./pages/AffiliationPage.tsx"));
const WatchlistPage = lazy(() => import("./pages/WatchlistPage.tsx"));
const SimulatorPage = lazy(() => import("./pages/SimulatorPage.tsx"));
const QuestesPage = lazy(() => import("./pages/QuestesPage.tsx"));
const SettingsPage = lazy(() => import("./pages/SettingsPage.tsx"));
const TwitchAccountsPage = lazy(() => import("./pages/TwitchAccountsPage.tsx"));
const StreamScoreHistoryPage = lazy(() => import("./pages/StreamScoreHistoryPage.tsx"));
const BillingPage = lazy(() => import("./pages/BillingPage.tsx"));
const PricingPage = lazy(() => import("./pages/PricingPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const LegalTermsPage = lazy(() => import("./pages/LegalTermsPage.tsx"));
const LegalPrivacyPage = lazy(() => import("./pages/LegalPrivacyPage.tsx"));
const LegalMentionsPage = lazy(() => import("./pages/LegalMentionsPage.tsx"));
const LegalCookiesPage = lazy(() => import("./pages/LegalCookiesPage.tsx"));
const BlogPage = lazy(() => import("./pages/BlogPage.tsx"));
const BlogArticlePage = lazy(() => import("./pages/BlogArticlePage.tsx"));
const UnsubscribePage = lazy(() => import("./pages/UnsubscribePage.tsx"));
const HelpPage = lazy(() => import("./pages/HelpPage.tsx"));

const queryClient = new QueryClient();

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    analytics.pageView();
  }, [pathname]);
  return null;
};

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
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/analyze" element={<AnalyzePage />} />
                <Route path="/result" element={<ResultPage />} />
                <Route path="/connect-twitch" element={<ConnectTwitchPage />} />
                <Route path="/twitch/callback" element={<TwitchCallbackPage />} />
                <Route path="/unsubscribe" element={<UnsubscribePage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analyse"
                  element={
                    <ProtectedRoute>
                      <AnalysePage />
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
                  path="/classements"
                  element={
                    <ProtectedRoute>
                      <LeadersPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/streamer/:login" element={<StreamerProfilePage />} />
                <Route
                  path="/watchlist"
                  element={
                    <ProtectedRoute>
                      <WatchlistPage />
                    </ProtectedRoute>
                  }
                />
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
                <Route
                  path="/clips"
                  element={
                    <ProtectedRoute>
                      <ClipsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/progression"
                  element={
                    <ProtectedRoute>
                      <AffiliationPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/quetes"
                  element={
                    <ProtectedRoute>
                      <QuestesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/simulator"
                  element={
                    <ProtectedRoute>
                      <SimulatorPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings/twitch-accounts"
                  element={
                    <ProtectedRoute>
                      <TwitchAccountsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/streamscore"
                  element={
                    <ProtectedRoute>
                      <StreamScoreHistoryPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/billing"
                  element={
                    <ProtectedRoute>
                      <BillingPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/pricing" element={<PricingPage />} />
                <Route
                  path="/help"
                  element={
                    <ProtectedRoute>
                      <HelpPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<BlogArticlePage />} />
                <Route path="/legal/terms" element={<LegalTermsPage />} />
                <Route path="/legal/privacy" element={<LegalPrivacyPage />} />
                <Route path="/legal/mentions" element={<LegalMentionsPage />} />
                <Route path="/legal/cookies" element={<LegalCookiesPage />} />
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
