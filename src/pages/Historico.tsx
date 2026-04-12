import { useState, useMemo } from 'react';
import { useProdutos, useMovimentacoes } from '@/hooks/useProdutos';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowDown, ArrowUp, Settings2, Search, CalendarIcon, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const tipoConfig: Record<string, { label: string; icon: typeof ArrowDown; color: string }> = {
  compra: { label: 'Compra', icon: ArrowDown, color: 'text-success' },
  retirada: { label: 'Retirada', icon: ArrowUp, color: 'text-destructive' },
  ajuste: { label: 'Ajuste', icon: Settings2, color: 'text-muted-foreground' },
};

export default function Historico() {
  const { data: produtos = [] } = useProdutos();
  const { data: movimentacoes = [], isLoading } = useMovimentacoes();
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(new Date()));

  const filtered = useMemo(() => {
    return movimentacoes.filter(m => {
      // Filter by search
      const productName = m.produtos?.nome_produto || '';
      if (search && !productName.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Filter by date range
      if (dateFrom || dateTo) {
        const movDate = parseISO(m.data_movimentacao);
        const from = dateFrom || new Date(0);
        const to = dateTo || new Date(9999, 11, 31);
        if (!isWithinInterval(movDate, { start: from, end: to })) {
          return false;
        }
      }
      return true;
    });
  }, [movimentacoes, search, dateFrom, dateTo]);

  const summary = useMemo(() => {
    let compras = 0;
    let retiradas = 0;
    let ajustes = 0;
    filtered.forEach(m => {
      if (m.tipo === 'compra') compras += m.quantidade;
      else if (m.tipo === 'retirada') retiradas += m.quantidade;
      else ajustes += Math.abs(m.quantidade);
    });
    return { compras, retiradas, ajustes };
  }, [filtered]);

  return (
    <div className="page-container">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-2xl font-display font-bold">Histórico</h1>
      </div>

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left text-xs gap-1.5", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon size={14} />
                  {dateFrom ? format(dateFrom, 'dd/MM/yy') : 'De'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left text-xs gap-1.5", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon size={14} />
                  {dateTo ? format(dateTo, 'dd/MM/yy') : 'Até'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Compras</p>
            <p className="text-lg font-display font-bold text-success">+{summary.compras}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Retiradas</p>
            <p className="text-lg font-display font-bold text-destructive">-{summary.retiradas}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ajustes</p>
            <p className="text-lg font-display font-bold text-muted-foreground">{summary.ajustes}</p>
          </div>
        </div>

        {/* List */}
        {isLoading && <p className="text-center text-sm text-muted-foreground py-8">Carregando...</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhuma movimentação encontrada</p>
        )}

        <div className="space-y-2">
          {filtered.map(m => {
            const config = tipoConfig[m.tipo] || tipoConfig.ajuste;
            const Icon = config.icon;
            return (
              <div key={m.id} className="stat-card flex items-center gap-3 py-3">
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${m.tipo === 'compra' ? 'bg-success/10' : m.tipo === 'retirada' ? 'bg-destructive/10' : 'bg-muted'}`}>
                  <Icon size={16} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.produtos?.nome_produto}</p>
                  <p className="text-xs text-muted-foreground">
                    {config.label} • {format(parseISO(m.data_movimentacao), 'dd/MM/yy HH:mm')}
                  </p>
                </div>
                <span className={`text-sm font-display font-bold ${config.color}`}>
                  {m.tipo === 'compra' ? '+' : m.tipo === 'retirada' ? '-' : ''}{m.quantidade}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
