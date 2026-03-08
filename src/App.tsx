import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MobileNav from "./components/MobileNav";
import Dashboard from "./pages/Dashboard";
import Estoque from "./pages/Estoque";
import Compras from "./pages/Compras";
import Retiradas from "./pages/Retiradas";
import Alertas from "./pages/Alertas";
import Cadastro from "./pages/Cadastro";
import Historico from "./pages/Historico";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/compras" element={<Compras />} />
          <Route path="/retiradas" element={<Retiradas />} />
          <Route path="/alertas" element={<Alertas />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <MobileNav />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
