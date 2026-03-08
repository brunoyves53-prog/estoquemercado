import { useProdutos } from '@/hooks/useProdutos';
import { differenceInDays, parseISO, format } from 'date-fns';
import { AlertTriangle, Calendar, TrendingDown } from 'lucide-react';

export default function Alertas() {
  const { data: produtos = [] } = useProdutos();

  const estoqueBaixo = produtos.filter(p => p.estoque_total < p.media_venda_mensal && p.media_venda_mensal > 0);
  const vencendo = produtos.filter(p => {
    if (!p.proxima_validade) return false;
    return differenceInDays(parseISO(p.proxima_validade), new Date()) <= 30;
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="text-xl font-bold">Alertas</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Low stock */}
        <div>
          <h2 className="flex items-center gap-2 text-sm font-display font-semibold text-warning mb-2">
            <TrendingDown size={16} />
            Estoque Baixo ({estoqueBaixo.length})
          </h2>
          {estoqueBaixo.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum alerta de estoque baixo</p>
          )}
          {estoqueBaixo.map(p => (
            <div key={p.id} className="stat-card border-warning/40 mb-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{p.nome_produto}</p>
                  <p className="text-xs text-muted-foreground">Média mensal: {p.media_venda_mensal}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-display font-bold text-warning">{p.estoque_total}</p>
                  <p className="text-xs text-muted-foreground">em estoque</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Expiring */}
        <div>
          <h2 className="flex items-center gap-2 text-sm font-display font-semibold text-destructive mb-2">
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

        {estoqueBaixo.length === 0 && vencendo.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Tudo em ordem! Sem alertas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
