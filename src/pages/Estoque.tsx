import { useProdutos } from '@/hooks/useProdutos';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

export default function Estoque() {
  const { data: produtos = [], isLoading } = useProdutos();
  const [search, setSearch] = useState('');

  const filtered = produtos.filter(p =>
    p.nome_produto.toLowerCase().includes(search.toLowerCase()) ||
    p.codigo_barras.includes(search)
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="text-xl font-bold">Estoque</h1>
      </div>
      <div className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Buscar produto ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading && <p className="text-center text-sm text-muted-foreground py-8">Carregando...</p>}

        <div className="space-y-2">
          {filtered.map(p => {
            const daysToExpiry = p.proxima_validade ? differenceInDays(parseISO(p.proxima_validade), new Date()) : null;
            const isLowStock = p.estoque_total < p.media_venda_mensal;
            const isExpiring = daysToExpiry !== null && daysToExpiry <= 30;

            return (
              <div key={p.id} className={`stat-card ${isLowStock ? 'border-warning/40' : ''} ${isExpiring ? 'border-destructive/40' : ''}`}>
                <div className="flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{p.nome_produto}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.codigo_barras}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className={`text-lg font-display font-bold ${isLowStock ? 'text-warning' : ''}`}>
                      {p.estoque_total}
                    </p>
                    <p className="text-xs text-muted-foreground">un.</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Venda/mês: {p.media_venda_mensal}</span>
                  {p.proxima_validade && (
                    <span className={isExpiring ? 'text-destructive font-medium' : ''}>
                      Venc: {format(parseISO(p.proxima_validade), 'dd/MM/yy')}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && !isLoading && (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhum produto encontrado</p>
          )}
        </div>
      </div>
    </div>
  );
}
