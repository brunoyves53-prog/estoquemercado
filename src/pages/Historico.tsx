import { useMovimentacoes } from '@/hooks/useProdutos';
import { format, parseISO } from 'date-fns';
import { ArrowDown, ArrowUp, Settings2 } from 'lucide-react';

const tipoConfig = {
  compra: { label: 'Compra', icon: ArrowDown, color: 'text-success' },
  retirada: { label: 'Retirada', icon: ArrowUp, color: 'text-destructive' },
  ajuste: { label: 'Ajuste', icon: Settings2, color: 'text-muted-foreground' },
};

export default function Historico() {
  const { data: movimentacoes = [], isLoading } = useMovimentacoes();

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="text-xl font-bold">Histórico</h1>
      </div>

      <div className="p-4 space-y-2">
        {isLoading && <p className="text-center text-sm text-muted-foreground py-8">Carregando...</p>}
        {movimentacoes.length === 0 && !isLoading && (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhuma movimentação registrada</p>
        )}
        {movimentacoes.map(m => {
          const config = tipoConfig[m.tipo];
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
                {m.tipo === 'compra' ? '+' : '-'}{m.quantidade}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
