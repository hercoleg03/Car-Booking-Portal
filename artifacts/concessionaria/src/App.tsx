import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";

// Pages
import Inventario from "@/pages/inventario";
import Calendario from "@/pages/calendario";
import Prenotazioni from "@/pages/prenotazioni";
import Contratti from "@/pages/contratti";
import Clienti from "@/pages/clienti";
import StoricoVetture from "@/pages/storico-vetture";

const queryClient = new QueryClient();

function Router() {
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
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
