import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAtualizarProduto, useProdutoPorCodigo } from '@/hooks/useProdutos';
import { ProdutoComEstoque } from '@/lib/supabase';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

interface Props {
  produto: ProdutoComEstoque;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditarProdutoDialog({ produto, open, onOpenChange }: Props) {
  const atualizar = useAtualizarProduto();
  const buscarPorCodigo = useProdutoPorCodigo();

  const [nome, setNome] = useState(produto.nome_produto);
  const [codigo, setCodigo] = useState(produto.codigo_barras);
  const [precoCompra, setPrecoCompra] = useState(String(produto.preco_compra));
  const [precoVenda, setPrecoVenda] = useState(String(produto.preco_venda));
  const [mediaVenda, setMediaVenda] = useState(String(produto.media_venda_mensal));
  const [codigoDuplicado, setCodigoDuplicado] = useState(false);
  const [duplicateNome, setDuplicateNome] = useState('');

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
      toast.success('Produto atualizado!');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={atualizar.isPending || codigoDuplicado}>
            {atualizar.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
