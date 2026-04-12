import { useProdutos } from '@/hooks/useProdutos';
import { differenceInDays, parseISO, format } from 'date-fns';
import { AlertTriangle, Calendar, Clock, ShieldCheck, ShoppingCart } from 'lucide-react';

function getAlertInfo(produto: { estoque_total: number; media_venda_mensal: number }) {
  const consumoDiario = produto.media_venda_mensal > 0 ? produto.media_venda_mensal / 30 : 0;
  const diasRestantes = consumoDiario > 0 ? Math.floor(produto.estoque_total / consumoDiario) : null;

  if (diasRestantes !== null) {
    if (diasRestantes <= 3) return { level: 'critico' as const, diasRestantes, label: `Acaba em ${diasRestantes} dias` };
    if (diasRestantes <= 7) return { level: 'atencao' as const, diasRestantes, label: `Acaba em ${diasRestantes} dias` };
    return { level: 'normal' as const, diasRestantes, label: '' };
  }

  if (produto.estoque_total <= 5) return { level: 'critico' as const, diasRestantes: null, label: 'Estoque crítico' };
  if (produto.estoque_total <= 10) return { level: 'atencao' as const, diasRestantes: null, label: 'Estoque baixo' };
  return { level: 'normal' as const, diasRestantes: null, label: '' };
}

export default function Alertas() {
  const { data: produtos = [] } = useProdutos();

  const emEstoque = produtos.filter(p => p.estoque_total > 0);

  const produtosComAlerta = emEstoque
    .map(p => ({ ...p, alert: getAlertInfo(p) }))
    .filter(p => p.alert.level !== 'normal')
    .sort((a, b) => {
      if (a.alert.level === 'critico' && b.alert.level !== 'critico') return -1;
      if (a.alert.level !== 'critico' && b.alert.level === 'critico') return 1;
      const daysA = a.alert.diasRestantes ?? 999;
      const daysB = b.alert.diasRestantes ?? 999;
      return daysA - daysB;
    });

  const vencendo = emEstoque.filter(p => {
    if (!p.proxima_validade) return false;
    return differenceInDays(parseISO(p.proxima_validade), new Date()) <= 30;
  }).sort((a, b) => {
    const dA = differenceInDays(parseISO(a.proxima_validade!), new Date());
    const dB = differenceInDays(parseISO(b.proxima_validade!), new Date());
    return dA - dB;
  });

  const criticos = produtosComAlerta.filter(p => p.alert.level === 'critico');
  const atencao = produtosComAlerta.filter(p => p.alert.level === 'atencao');

  return (
    <div className="page-container">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-2xl font-display font-bold">Alertas</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {produtosComAlerta.length + vencendo.length} alerta{produtosComAlerta.length + vencendo.length !== 1 ? 's' : ''} ativo{produtosComAlerta.length + vencendo.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* Produtos para Repor - Críticos */}
        <div>
          <h2 className="flex items-center gap-2 text-sm font-display font-semibold text-destructive mb-3 uppercase tracking-wider">
            <ShoppingCart size={16} />
            Reposição Urgente ({criticos.length})
          </h2>
          {criticos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto em estado crítico</p>
          )}
          {criticos.map(p => (
            <div key={p.id} className="stat-card border-destructive/40 bg-destructive/5 mb-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{p.nome_produto}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.media_venda_mensal > 0
                      ? `Média: ${p.media_venda_mensal} un/mês`
                      : `Estoque: ${p.estoque_total} un.`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-display font-bold text-destructive">
                    {p.alert.diasRestantes !== null ? `${p.alert.diasRestantes}d` : p.estoque_total}
                  </p>
                  <p className="text-xs text-destructive/80 font-medium">{p.alert.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Atenção */}
        <div>
          <h2 className="flex items-center gap-2 text-sm font-display font-semibold text-warning mb-3 uppercase tracking-wider">
            <AlertTriangle size={16} />
            Atenção ({atencao.length})
          </h2>
          {atencao.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto em atenção</p>
          )}
          {atencao.map(p => (
            <div key={p.id} className="stat-card border-warning/40 bg-warning/5 mb-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{p.nome_produto}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.media_venda_mensal > 0
                      ? `Média: ${p.media_venda_mensal} un/mês`
                      : `Estoque: ${p.estoque_total} un.`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-display font-bold text-warning">
                    {p.alert.diasRestantes !== null ? `${p.alert.diasRestantes}d` : p.estoque_total}
                  </p>
                  <p className="text-xs text-warning/80 font-medium">{p.alert.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Vencendo */}
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

        {produtosComAlerta.length === 0 && vencendo.length === 0 && (
          <div className="text-center py-12">
            <ShieldCheck size={40} className="mx-auto text-accent/50 mb-3" />
            <p className="text-muted-foreground">Tudo em ordem! Sem alertas.</p>
          </div>
        )}
      </div>
    </div>
  );
}
