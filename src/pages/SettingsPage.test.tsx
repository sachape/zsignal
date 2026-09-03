import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { PlanTier } from "@/lib/planAccess";

// La page ne monte qu'en session authentifiée : on isole l'arbre de ses
// dépendances réseau pour couvrir le rendu réel de la section « Plan actuel ».
const planState = { plan: "free" as PlanTier, isPro: false, isGrowth: false, loading: false };

vi.mock("@/hooks/usePlan", () => ({ usePlan: () => planState }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { email: "streamer@example.com" }, deleteAccount: vi.fn() }),
}));
vi.mock("@/hooks/useTwitchConnection", () => ({
  useTwitchConnection: () => ({ account: null, isConnected: false }),
}));
vi.mock("@/hooks/usePageMeta", () => ({ usePageMeta: () => {} }));
vi.mock("@/components/AppShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/AccountMenu", () => ({ default: () => <div /> }));

const SettingsPage = (await import("./SettingsPage")).default;

const renderPage = () =>
  render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  );

describe("SettingsPage — section Plan actuel", () => {
  beforeEach(() => {
    Object.assign(planState, { plan: "free", isPro: false, isGrowth: false, loading: false });
  });

  it("affiche le plan gratuit et propose de passer au Pro", () => {
    renderPage();
    expect(screen.getByText("Plan Gratuit")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Passer au Pro" })).toBeInTheDocument();
  });

  it("affiche le plan réel d'un abonné Growth, pas « Gratuit »", () => {
    Object.assign(planState, { plan: "growth", isPro: true, isGrowth: true });
    renderPage();
    expect(screen.getByText("Plan Growth")).toBeInTheDocument();
    expect(screen.queryByText("Plan Gratuit")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gérer mon abonnement" })).toBeInTheDocument();
  });

  it("n'affiche aucun plan tant que la résolution est en cours", () => {
    Object.assign(planState, { plan: "free", loading: true });
    renderPage();
    expect(screen.queryByText("Plan Gratuit")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Passer au Pro" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Chargement du plan")).toBeInTheDocument();
  });
});
