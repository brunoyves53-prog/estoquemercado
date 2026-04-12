import { useProdutos } from '@/hooks/useProdutos';
import { useMovimentacoes } from '@/hooks/useProdutos';
import { Package, AlertTriangle, TrendingDown, Calendar, ShoppingCart, ArrowDownToLine, ScanBarcode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calcularAlerta } from '@/lib/alertUtils';
export default function Dashboard() {
  const { data: produtos = [] } = useProdutos();
  const { data: movimentacoes = [] } = useMovimentacoes();
  const navigate = useNavigate();

  const emEstoque = produtos.filter(p => p.estoque_total > 0);
  const totalProdutos = emEstoque.length;
  const totalEstoque = emEstoque.reduce((s, p) => s + p.estoque_total, 0);
  const alertas = emEstoque.filter(p => calcularAlerta(p).level !== 'normal').length;
  const vencendo = emEstoque.filter(p => {
    if (!p.proxima_validade) return false;
    return differenceInDays(parseISO(p.proxima_validade), new Date()) <= 30;
  }).length;

  const ultimasMovs = movimentacoes.slice(0, 5);

  return (
    <div className="page-container">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-2xl font-display font-bold">Gestão de Estoque</h1>
        <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package size={16} />
              <span className="text-xs font-medium">Produtos</span>
            </div>
            <p className="text-3xl font-display font-bold">{totalProdutos}</p>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package size={16} />
              <span className="text-xs font-medium">Itens em Estoque</span>
            </div>
            <p className="text-3xl font-display font-bold">{totalEstoque}</p>
          </div>
          <div className="stat-card border-warning/30">
            <div className="flex items-center gap-2 text-warning mb-1">
              <TrendingDown size={16} />
              <span className="text-xs font-medium">Repor</span>
            </div>
            <p className="text-3xl font-display font-bold text-warning">{alertas}</p>
          </div>
          <div className="stat-card border-destructive/30">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <Calendar size={16} />
              <span className="text-xs font-medium">Vencendo (30d)</span>
            </div>
            <p className="text-3xl font-display font-bold text-destructive">{vencendo}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-4">
          <button onClick={() => navigate('/compras')} className="action-button bg-primary text-primary-foreground">
            <ShoppingCart size={28} />
            <span className="text-sm">Compra</span>
          </button>
          <button onClick={() => navigate('/retiradas')} className="action-button bg-accent text-accent-foreground">
            <ArrowDownToLine size={28} />
            <span className="text-sm">Retirada</span>
          </button>
          <button onClick={() => navigate('/compras?scan=true')} className="action-button bg-secondary text-secondary-foreground">
            <ScanBarcode size={28} />
            <span className="text-sm">Escanear</span>
          </button>
        </div>

        {/* Alerts summary */}
        {(alertas > 0 || vencendo > 0) && (
          <button onClick={() => navigate('/alertas')} className="w-full stat-card border-warning/40 flex items-center gap-3">
            <AlertTriangle size={20} className="text-warning shrink-0" />
            <div className="text-left">
              <p className="text-sm font-medium">Atenção necessária</p>
              <p className="text-xs text-muted-foreground">
                {alertas > 0 && `${alertas} produto(s) para repor`}
                {alertas > 0 && vencendo > 0 && ' • '}
                {vencendo > 0 && `${vencendo} produto(s) vencendo`}
              </p>
            </div>
          </button>
        )}

        {/* Recent movements */}
        <div>
          <h2 className="text-sm font-display font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Últimas Movimentações</h2>
          <div className="space-y-2">
            {ultimasMovs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma movimentação registrada</p>}
            {ultimasMovs.map((m) => (
              <div key={m.id} className="stat-card flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{m.produtos?.nome_produto}</p>
                  <p className="text-xs text-muted-foreground">{format(parseISO(m.data_movimentacao), "dd/MM/yy HH:mm")}</p>
                </div>
                <span className={`text-sm font-display font-semibold ${m.tipo === 'compra' ? 'text-success' : m.tipo === 'retirada' ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {m.tipo === 'compra' ? '+' : '-'}{m.quantidade}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
