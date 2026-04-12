import { useProdutos, useExcluirProduto } from '@/hooks/useProdutos';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { Search, Pencil, PackagePlus, History, Trash2, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProdutoComEstoque } from '@/lib/supabase';
import EditarProdutoDialog from '@/components/EditarProdutoDialog';
import AjustarEstoqueDialog from '@/components/AjustarEstoqueDialog';
import HistoricoProdutoDialog from '@/components/HistoricoProdutoDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

type DialogType = 'editar' | 'ajustar' | 'historico' | 'excluir';

function ProductCard({ produto, onAction }: { produto: ProdutoComEstoque; onAction: (type: DialogType) => void }) {
  const [expanded, setExpanded] = useState(false);
  const parsedDate = produto.proxima_validade ? parseISO(produto.proxima_validade) : null;
  const validDate = parsedDate && isValid(parsedDate) ? parsedDate : null;
  const daysToExpiry = validDate ? differenceInDays(validDate, new Date()) : null;
  const isLowStock = produto.estoque_total < produto.media_venda_mensal;
  const isExpiring = daysToExpiry !== null && daysToExpiry <= 30;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      {/* Header: image + name + stock */}
      <div className="flex items-start gap-3">
        <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border/50">
          {produto.imagem_url ? (
            <img src={produto.imagem_url} alt={produto.nome_produto} className="h-full w-full object-cover" />
          ) : (
            <Package size={24} className="text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{produto.nome_produto}</p>
          <p className="text-xs text-muted-foreground font-mono">{produto.codigo_barras}</p>
          {validDate && (
            <p className={`text-xs mt-0.5 ${isExpiring ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
              Val: {format(validDate, 'dd/MM/yy')}
              {isExpiring && ` (${daysToExpiry}d)`}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className={`text-lg font-display font-bold ${isLowStock ? 'text-warning' : 'text-foreground'}`}>
            {produto.estoque_total}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">un.</p>
        </div>
      </div>

      {/* Prices row - always visible */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/50 rounded-lg px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Compra</p>
          <p className="text-sm font-semibold">R$ {Number(produto.preco_compra).toFixed(2)}</p>
        </div>
        <div className="bg-muted/50 rounded-lg px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Venda</p>
          <p className="text-sm font-semibold">R$ {Number(produto.preco_venda).toFixed(2)}</p>
        </div>
      </div>

      {/* Expandable: média mensal + actions */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Menos detalhes' : 'Média mensal & ações'}
      </button>

      {expanded && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="bg-muted/50 rounded-lg px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Média Venda/Mês</p>
            <p className="text-sm font-semibold">{produto.media_venda_mensal} un.</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => onAction('editar')}>
              <Pencil size={13} /> Editar
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => onAction('ajustar')}>
              <PackagePlus size={13} /> Ajustar
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-xs" onClick={() => onAction('historico')}>
              <History size={13} /> Histórico
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive shrink-0" onClick={() => onAction('excluir')}>
              <Trash2 size={13} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Estoque() {
  const { data: produtos = [], isLoading } = useProdutos();
  const [search, setSearch] = useState('');
  const [selectedProduto, setSelectedProduto] = useState<ProdutoComEstoque | null>(null);
  const [dialogType, setDialogType] = useState<DialogType | null>(null);
  const excluir = useExcluirProduto();

  const filtered = produtos.filter(p =>
    p.nome_produto.toLowerCase().includes(search.toLowerCase()) ||
    p.codigo_barras.includes(search)
  );

  const openDialog = (produto: ProdutoComEstoque, type: DialogType) => {
    setSelectedProduto(produto);
    setDialogType(type);
  };

  const closeDialog = () => {
    setSelectedProduto(null);
    setDialogType(null);
  };

  return (
    <div className="page-container">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-2xl font-display font-bold">Estoque</h1>
        <p className="text-xs text-muted-foreground mt-1">{filtered.length} produto{filtered.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            placeholder="Buscar produto ou código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading && <p className="text-center text-sm text-muted-foreground py-8">Carregando...</p>}

        {!isLoading && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Nenhum produto encontrado</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(p => (
              <ProductCard
                key={p.id}
                produto={p}
                onAction={(type) => openDialog(p, type)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedProduto && dialogType === 'editar' && (
        <EditarProdutoDialog produto={selectedProduto} open onOpenChange={(o) => !o && closeDialog()} />
      )}
      {selectedProduto && dialogType === 'ajustar' && (
        <AjustarEstoqueDialog produto={selectedProduto} open onOpenChange={(o) => !o && closeDialog()} />
      )}
      {selectedProduto && dialogType === 'historico' && (
        <HistoricoProdutoDialog produto={selectedProduto} open onOpenChange={(o) => !o && closeDialog()} />
      )}
      {selectedProduto && dialogType === 'excluir' && (
        <AlertDialog open onOpenChange={(o) => !o && closeDialog()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir produto</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir <strong>{selectedProduto.nome_produto}</strong>? Todos os lotes e movimentações relacionados serão removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  try {
                    await excluir.mutateAsync(selectedProduto.id);
                    toast.success('Produto excluído!');
                    closeDialog();
                  } catch (err: any) {
                    toast.error(err.message || 'Erro ao excluir');
                  }
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
