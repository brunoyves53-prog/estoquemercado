import { useProdutos } from '@/hooks/useProdutos';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Search, Pencil, PackagePlus, History, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { ProdutoComEstoque } from '@/lib/supabase';
import { useExcluirProduto } from '@/hooks/useProdutos';
import EditarProdutoDialog from '@/components/EditarProdutoDialog';
import AjustarEstoqueDialog from '@/components/AjustarEstoqueDialog';
import HistoricoProdutoDialog from '@/components/HistoricoProdutoDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

type DialogType = 'editar' | 'ajustar' | 'historico' | 'excluir';

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

        {!isLoading && (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="hidden sm:table-cell">Código</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="hidden md:table-cell text-right">P. Compra</TableHead>
                  <TableHead className="hidden md:table-cell text-right">P. Venda</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Venda/Mês</TableHead>
                  <TableHead className="hidden sm:table-cell">Validade</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => {
                  const daysToExpiry = p.proxima_validade ? differenceInDays(parseISO(p.proxima_validade), new Date()) : null;
                  const isLowStock = p.estoque_total < p.media_venda_mensal;
                  const isExpiring = daysToExpiry !== null && daysToExpiry <= 30;

                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{p.nome_produto}</p>
                        <p className="text-xs text-muted-foreground sm:hidden font-mono">{p.codigo_barras}</p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-xs text-muted-foreground">
                        {p.codigo_barras}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${isLowStock ? 'text-warning' : ''}`}>
                          {p.estoque_total}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right text-sm">
                        R$ {Number(p.preco_compra).toFixed(2)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right text-sm">
                        R$ {Number(p.preco_venda).toFixed(2)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-right text-sm">
                        {p.media_venda_mensal}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {p.proxima_validade ? (
                          <span className={isExpiring ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                            {format(parseISO(p.proxima_validade), 'dd/MM/yy')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <TooltipProvider delayDuration={300}>
                          <div className="flex items-center justify-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(p, 'editar')}>
                                  <Pencil size={15} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(p, 'ajustar')}>
                                  <PackagePlus size={15} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ajustar estoque</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDialog(p, 'historico')}>
                                  <History size={15} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver histórico</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => openDialog(p, 'excluir')}>
                                  <Trash2 size={15} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Excluir</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhum produto encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
                Tem certeza que deseja excluir <strong>{selectedProduto.nome_produto}</strong>? Todos os lotes e movimentações relacionados serão removidos. Esta ação não pode ser desfeita.
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
