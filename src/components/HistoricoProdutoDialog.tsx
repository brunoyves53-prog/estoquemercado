import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useMovimentacoesProduto } from '@/hooks/useProdutos';
import { ProdutoComEstoque } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { ArrowDownCircle, ArrowUpCircle, RefreshCw } from 'lucide-react';

const tipoConfig: Record<string, { label: string; icon: typeof ArrowUpCircle; className: string }> = {
  compra: { label: 'Compra', icon: ArrowDownCircle, className: 'text-success' },
  retirada: { label: 'Retirada', icon: ArrowUpCircle, className: 'text-destructive' },
  ajuste: { label: 'Ajuste', icon: RefreshCw, className: 'text-warning' },
};

interface Props {
  produto: ProdutoComEstoque;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HistoricoProdutoDialog({ produto, open, onOpenChange }: Props) {
  const { data: movimentacoes = [], isLoading } = useMovimentacoesProduto(open ? produto.id : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Histórico — {produto.nome_produto}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>}
          {!isLoading && movimentacoes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma movimentação encontrada</p>
          )}
          {movimentacoes.map((m) => {
            const config = tipoConfig[m.tipo] || tipoConfig.ajuste;
            const Icon = config.icon;
            const isPositive = m.tipo === 'compra' || (m.tipo === 'ajuste' && m.quantidade > 0);
            return (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <Icon size={18} className={config.className} />
                  <div>
                    <p className="text-sm font-medium">{config.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(parseISO(m.data_movimentacao), 'dd/MM/yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${isPositive ? 'text-success' : 'text-destructive'}`}>
                  {isPositive ? '+' : ''}{m.quantidade}
                </span>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
