import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layers, Save, Trash2, Calendar } from 'lucide-react';
import { ProdutoComEstoque, Lote } from '@/lib/supabase';
import { useAtualizarLote, useExcluirLote } from '@/hooks/useProdutos';
import { format, parseISO, isValid } from 'date-fns';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Props {
  produto: ProdutoComEstoque;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type LoteEdit = { quantidade_lote: number; data_validade: string };

export default function GerenciarLotesDialog({ produto, open, onOpenChange }: Props) {
  const [edits, setEdits] = useState<Record<string, LoteEdit>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const atualizar = useAtualizarLote();
  const excluir = useExcluirLote();

  useEffect(() => {
    if (open) {
      const init: Record<string, LoteEdit> = {};
      (produto.lotes || []).forEach(l => {
        init[l.id] = {
          quantidade_lote: l.quantidade_lote,
          data_validade: l.data_validade || '',
        };
      });
      setEdits(init);
    }
  }, [open, produto.lotes]);

  const lotes = produto.lotes || [];
  const totalEditado = Object.values(edits).reduce((sum, e) => sum + Math.max(0, Number(e.quantidade_lote) || 0), 0);

  const isDirty = (lote: Lote) => {
    const e = edits[lote.id];
    if (!e) return false;
    return Number(e.quantidade_lote) !== lote.quantidade_lote || (e.data_validade || null) !== lote.data_validade;
  };

  const handleSave = async (lote: Lote) => {
    const e = edits[lote.id];
    if (!e) return;
    try {
      await atualizar.mutateAsync({
        id: lote.id,
        quantidade_lote: Math.max(0, Number(e.quantidade_lote) || 0),
        data_validade: e.data_validade || null,
      });
      toast.success('Lote atualizado!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar');
    }
  };

  const handleDelete = async (loteId: string) => {
    try {
      await excluir.mutateAsync(loteId);
      toast.success('Lote excluído!');
      setConfirmDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers size={18} className="text-primary" />
              Lotes — {produto.nome_produto}
            </DialogTitle>
            <DialogDescription>
              Edite quantidade e validade de cada lote. O estoque total é a soma de todos os lotes.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <span className="text-sm text-muted-foreground">Estoque total (após edições)</span>
            <span className="text-2xl font-display font-bold text-primary">{totalEditado} un.</span>
          </div>

          {lotes.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhum lote cadastrado. Registre uma compra para criar lotes.
            </p>
          )}

          <div className="space-y-3">
            {lotes.map((lote) => {
              const e = edits[lote.id] || { quantidade_lote: lote.quantidade_lote, data_validade: lote.data_validade || '' };
              const dataCompra = parseISO(lote.data_compra);
              return (
                <div key={lote.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar size={12} />
                      Compra: {isValid(dataCompra) ? format(dataCompra, 'dd/MM/yyyy') : '—'}
                      <Badge variant="outline" className="text-[10px] ml-1">
                        Ciclo: {lote.ciclo_reposicao}d
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setConfirmDelete(lote.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Quantidade</Label>
                      <Input
                        type="number"
                        min={0}
                        value={e.quantidade_lote}
                        onChange={(ev) =>
                          setEdits((prev) => ({
                            ...prev,
                            [lote.id]: { ...e, quantidade_lote: Number(ev.target.value) },
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Validade</Label>
                      <Input
                        type="date"
                        value={e.data_validade}
                        onChange={(ev) =>
                          setEdits((prev) => ({
                            ...prev,
                            [lote.id]: { ...e, data_validade: ev.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="w-full gap-1.5"
                    disabled={!isDirty(lote) || atualizar.isPending}
                    onClick={() => handleSave(lote)}
                  >
                    <Save size={14} /> Salvar alterações
                  </Button>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lote</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o lote e suas movimentações. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
