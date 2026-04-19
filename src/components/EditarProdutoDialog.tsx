import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAtualizarProduto, useProdutoPorCodigo, useAtualizarLote } from '@/hooks/useProdutos';
import { ProdutoComEstoque } from '@/lib/supabase';
import { toast } from 'sonner';
import { AlertTriangle, Layers } from 'lucide-react';

interface Props {
  produto: ProdutoComEstoque;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditarProdutoDialog({ produto, open, onOpenChange }: Props) {
  const atualizar = useAtualizarProduto();
  const atualizarLote = useAtualizarLote();
  const buscarPorCodigo = useProdutoPorCodigo();

  const [nome, setNome] = useState(produto.nome_produto);
  const [codigo, setCodigo] = useState(produto.codigo_barras);
  const [precoCompra, setPrecoCompra] = useState(String(produto.preco_compra));
  const [precoVenda, setPrecoVenda] = useState(String(produto.preco_venda));
  const [mediaVenda, setMediaVenda] = useState(String(produto.media_venda_mensal));
  const [codigoDuplicado, setCodigoDuplicado] = useState(false);
  const [duplicateNome, setDuplicateNome] = useState('');

  const lotesAtivos = (produto.lotes || []).filter(l => l.quantidade_lote > 0);
  const [validades, setValidades] = useState<Record<string, string>>(() =>
    Object.fromEntries(lotesAtivos.map(l => [l.id, l.data_validade || '']))
  );

  useEffect(() => {
    setValidades(Object.fromEntries(lotesAtivos.map(l => [l.id, l.data_validade || ''])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produto.id]);

  const verificarCodigo = useCallback(async () => {
    if (codigo.trim() === produto.codigo_barras) {
      setCodigoDuplicado(false);
      return;
    }
    if (!codigo.trim()) return;
    try {
      const existing = await buscarPorCodigo.mutateAsync(codigo.trim());
      if (existing && existing.id !== produto.id) {
        setCodigoDuplicado(true);
        setDuplicateNome(existing.nome_produto);
      } else {
        setCodigoDuplicado(false);
        setDuplicateNome('');
      }
    } catch { /* ignore */ }
  }, [codigo, produto, buscarPorCodigo]);

  const handleSave = async () => {
    if (!nome.trim() || !codigo.trim()) {
      toast.error('Nome e código são obrigatórios');
      return;
    }
    if (codigoDuplicado) {
      toast.error('Código de barras já cadastrado para outro produto');
      return;
    }
    try {
      await atualizar.mutateAsync({
        id: produto.id,
        nome_produto: nome.trim(),
        codigo_barras: codigo.trim(),
        preco_compra: parseFloat(precoCompra) || 0,
        preco_venda: parseFloat(precoVenda) || 0,
        media_venda_mensal: parseFloat(mediaVenda) || 0,
      });

      // Atualizar validades dos lotes que mudaram
      for (const lote of lotesAtivos) {
        const novaValidade = validades[lote.id] || '';
        const antiga = lote.data_validade || '';
        if (novaValidade !== antiga) {
          await atualizarLote.mutateAsync({
            id: lote.id,
            data_validade: novaValidade || null,
          });
        }
      }

      toast.success('Produto atualizado!');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Nome do Produto</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Código de Barras</Label>
            <Input
              value={codigo}
              onChange={(e) => { setCodigo(e.target.value); setCodigoDuplicado(false); }}
              onBlur={verificarCodigo}
            />
            {codigoDuplicado && (
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-2">
                <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive">
                  Código já cadastrado para: <strong>{duplicateNome}</strong>
                </p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Preço Compra</Label>
              <Input type="number" inputMode="decimal" value={precoCompra} onChange={(e) => setPrecoCompra(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Preço Venda</Label>
              <Input type="number" inputMode="decimal" value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Média Venda Mensal</Label>
            <Input type="number" inputMode="numeric" value={mediaVenda} onChange={(e) => setMediaVenda(e.target.value)} />
          </div>

          {lotesAtivos.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Layers size={12} /> Validade por lote
              </Label>
              {lotesAtivos.map(lote => (
                <div key={lote.id} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-16 shrink-0">{lote.quantidade_lote} un.</span>
                  <Input
                    type="date"
                    value={validades[lote.id] || ''}
                    onChange={(e) => setValidades(prev => ({ ...prev, [lote.id]: e.target.value }))}
                    className="flex-1"
                  />
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground">Para gestão completa de lotes (quantidade, exclusão), use o botão "Lotes".</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={atualizar.isPending || atualizarLote.isPending || codigoDuplicado}>
            {atualizar.isPending || atualizarLote.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
