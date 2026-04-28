import { useProdutos } from '@/hooks/useProdutos';
import { differenceInDays, parseISO, format } from 'date-fns';
import { AlertTriangle, Calendar, TrendingDown, Package, PackageX } from 'lucide-react';
import { calcularAlerta } from '@/lib/alertUtils';

export default function Alertas() {
  const { data: produtos = [] } = useProdutos();

  const semEstoque = produtos.filter(p => p.estoque_total <= 0);
  const emEstoque = produtos.filter(p => p.estoque_total > 0);

  // Smart alerts based on consumption rate
  const alertas = emEstoque
    .map(p => ({ produto: p, alerta: calcularAlerta(p) }))
    .filter(a => a.alerta.level !== 'normal')
    .sort((a, b) => {
      // Critico first, then by days remaining ascending
      if (a.alerta.level !== b.alerta.level) return a.alerta.level === 'critico' ? -1 : 1;
      return (a.alerta.diasRestantes ?? 0) - (b.alerta.diasRestantes ?? 0);
    });

  const criticos = alertas.filter(a => a.alerta.level === 'critico');
  const atencao = alertas.filter(a => a.alerta.level === 'atencao');

  // Expiry alerts
  const vencendo = emEstoque.filter(p => {
    if (!p.proxima_validade) return false;
    return differenceInDays(parseISO(p.proxima_validade), new Date()) <= 30;
  }).sort((a, b) => {
    const da = differenceInDays(parseISO(a.proxima_validade!), new Date());
    const db = differenceInDays(parseISO(b.proxima_validade!), new Date());
    return da - db;
  });

  return (
    <div className="page-container">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-2xl font-display font-bold">Alertas</h1>
        <p className="text-xs text-muted-foreground mt-1">Produtos para repor</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Critical */}
        <div>
          <h2 className="flex items-center gap-2 text-sm font-display font-semibold text-destructive mb-3 uppercase tracking-wider">
            <TrendingDown size={16} />
            Crítico ({criticos.length})
          </h2>
          {criticos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum alerta crítico</p>
          )}
          {criticos.map(({ produto: p, alerta }) => (
            <div key={p.id} className="stat-card border-destructive/40 mb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {p.imagem_url ? (
                    <img src={p.imagem_url} alt={p.nome_produto} className="h-full w-full object-cover" />
                  ) : (
                    <Package size={18} className="text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.nome_produto}</p>
                  <p className="text-xs text-muted-foreground">
                    Estoque: {p.estoque_total} un. • Média: {p.media_venda_mensal}/mês
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-display font-bold text-destructive">
                    {alerta.diasRestantes !== null ? `${alerta.diasRestantes}d` : p.estoque_total}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{alerta.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Attention */}
        <div>
          <h2 className="flex items-center gap-2 text-sm font-display font-semibold text-warning mb-3 uppercase tracking-wider">
            <AlertTriangle size={16} />
            Atenção ({atencao.length})
          </h2>
          {atencao.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum alerta de atenção</p>
          )}
          {atencao.map(({ produto: p, alerta }) => (
            <div key={p.id} className="stat-card border-warning/40 mb-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {p.imagem_url ? (
                    <img src={p.imagem_url} alt={p.nome_produto} className="h-full w-full object-cover" />
                  ) : (
                    <Package size={18} className="text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.nome_produto}</p>
                  <p className="text-xs text-muted-foreground">
                    Estoque: {p.estoque_total} un. • Média: {p.media_venda_mensal}/mês
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-display font-bold text-warning">
                    {alerta.diasRestantes !== null ? `${alerta.diasRestantes}d` : p.estoque_total}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{alerta.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Expiring */}
        <div>
          <h2 className="flex items-center gap-2 text-sm font-display font-semibold text-destructive mb-3 uppercase tracking-wider">
            <Calendar size={16} />
            Vencendo em 30 dias ({vencendo.length})
          </h2>
          {vencendo.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto vencendo</p>
          )}
          {vencendo.map(p => {
            const days = differenceInDays(parseISO(p.proxima_validade!), new Date());
            return (
              <div key={p.id} className="stat-card border-destructive/40 mb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium">{p.nome_produto}</p>
                    <p className="text-xs text-muted-foreground">
                      Vence: {format(parseISO(p.proxima_validade!), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-display font-bold ${days <= 7 ? 'text-destructive' : 'text-warning'}`}>
                      {days}d
                    </p>
                    <p className="text-xs text-muted-foreground">restantes</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {alertas.length === 0 && vencendo.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Tudo em ordem! Sem alertas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
