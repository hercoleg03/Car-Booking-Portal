import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import Login from "@/pages/login";

// Pages
import Inventario from "@/pages/inventario";
import Calendario from "@/pages/calendario";
import Prenotazioni from "@/pages/prenotazioni";
import Contratti from "@/pages/contratti";
import Clienti from "@/pages/clienti";
import StoricoVetture from "@/pages/storico-vetture";

const queryClient = new QueryClient();

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-foreground border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Inventario} />
        <Route path="/inventario" component={Inventario} />
        <Route path="/calendario" component={Calendario} />
        <Route path="/prenotazioni" component={Prenotazioni} />
        <Route path="/contratti" component={Contratti} />
        <Route path="/clienti" component={Clienti} />
        <Route path="/storico-vetture" component={StoricoVetture} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AuthGate />
            </WouterRouter>
            <Toaster />
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
