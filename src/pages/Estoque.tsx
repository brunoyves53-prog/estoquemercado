import { useProdutos, useExcluirProduto } from '@/hooks/useProdutos';
import { format, parseISO, differenceInDays, isValid } from 'date-fns';
import { Search, Pencil, PackagePlus, History, Trash2, Package, AlertTriangle, Clock } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProdutoComEstoque } from '@/lib/supabase';
import EditarProdutoDialog from '@/components/EditarProdutoDialog';
import AjustarEstoqueDialog from '@/components/AjustarEstoqueDialog';
import HistoricoProdutoDialog from '@/components/HistoricoProdutoDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

type DialogType = 'editar' | 'ajustar' | 'historico' | 'excluir';

function getAlertInfo(produto: ProdutoComEstoque) {
  const consumoDiario = produto.media_venda_mensal > 0 ? produto.media_venda_mensal / 30 : 0;
  const diasRestantes = consumoDiario > 0 ? Math.floor(produto.estoque_total / consumoDiario) : null;

  if (diasRestantes !== null) {
    if (diasRestantes <= 3) return { level: 'critico' as const, diasRestantes, label: `Acaba em ${diasRestantes}d` };
    if (diasRestantes <= 7) return { level: 'atencao' as const, diasRestantes, label: `Acaba em ${diasRestantes}d` };
    return { level: 'normal' as const, diasRestantes, label: `~${diasRestantes}d restantes` };
  }

  // Fallback sem média
  if (produto.estoque_total <= 5) return { level: 'critico' as const, diasRestantes: null, label: 'Estoque crítico' };
  if (produto.estoque_total <= 10) return { level: 'atencao' as const, diasRestantes: null, label: 'Estoque baixo' };
  return { level: 'normal' as const, diasRestantes: null, label: '' };
}

const alertStyles = {
  critico: 'border-destructive/50 bg-destructive/5',
  atencao: 'border-warning/50 bg-warning/5',
  normal: 'border-border',
};

const alertBadgeStyles = {
  critico: 'bg-destructive text-destructive-foreground',
  atencao: 'bg-warning text-warning-foreground',
  normal: 'bg-muted text-muted-foreground',
};

function ProductCard({ produto, onAction }: { produto: ProdutoComEstoque; onAction: (type: DialogType) => void }) {
  const parsedDate = produto.proxima_validade ? parseISO(produto.proxima_validade) : null;
  const validDate = parsedDate && isValid(parsedDate) ? parsedDate : null;
  const daysToExpiry = validDate ? differenceInDays(validDate, new Date()) : null;
  const isExpiring = daysToExpiry !== null && daysToExpiry <= 30;
  const alert = getAlertInfo(produto);

  return (
    <div className={`rounded-xl border bg-card p-4 space-y-3 transition-colors ${alertStyles[alert.level]}`}>
      {/* Header: image + name + stock + alert */}
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
          <p className={`text-lg font-display font-bold ${alert.level === 'critico' ? 'text-destructive' : alert.level === 'atencao' ? 'text-warning' : 'text-foreground'}`}>
            {produto.estoque_total}
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">un.</p>
        </div>
      </div>

      {/* Alert badge */}
      {alert.label && (
        <div className="flex items-center gap-1.5">
          {alert.level !== 'normal' && <AlertTriangle size={12} className={alert.level === 'critico' ? 'text-destructive' : 'text-warning'} />}
          {alert.level === 'normal' && alert.label && <Clock size={12} className="text-muted-foreground" />}
          <span className={`text-xs font-medium ${alert.level === 'critico' ? 'text-destructive' : alert.level === 'atencao' ? 'text-warning' : 'text-muted-foreground'}`}>
            {alert.label}
          </span>
        </div>
      )}

      {/* Prices + média - always visible */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-muted/50 rounded-lg px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Compra</p>
          <p className="text-sm font-semibold">R$ {Number(produto.preco_compra).toFixed(2)}</p>
        </div>
        <div className="bg-muted/50 rounded-lg px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Venda</p>
          <p className="text-sm font-semibold">R$ {Number(produto.preco_venda).toFixed(2)}</p>
        </div>
        <div className="bg-muted/50 rounded-lg px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Média/Mês</p>
          <p className="text-sm font-semibold">{produto.media_venda_mensal} un.</p>
        </div>
      </div>

      {/* Actions - always visible */}
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
  );
}

export default function Estoque() {
  const { data: produtos = [], isLoading } = useProdutos();
  const [search, setSearch] = useState('');
  const [selectedProduto, setSelectedProduto] = useState<ProdutoComEstoque | null>(null);
  const [dialogType, setDialogType] = useState<DialogType | null>(null);
  const excluir = useExcluirProduto();

  // Only show products with stock > 0
  const emEstoque = produtos.filter(p => p.estoque_total > 0);

  const filtered = emEstoque.filter(p =>
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
        <p className="text-xs text-muted-foreground mt-1">
          {filtered.length} produto{filtered.length !== 1 ? 's' : ''} em estoque
          {produtos.length > emEstoque.length && (
            <span> · {produtos.length - emEstoque.length} cadastrado{produtos.length - emEstoque.length !== 1 ? 's' : ''} sem estoque</span>
          )}
        </p>
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
          <p className="text-center text-sm text-muted-foreground py-8">
            {emEstoque.length === 0 ? 'Nenhum produto em estoque. Registre uma compra para adicionar.' : 'Nenhum produto encontrado'}
          </p>
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
