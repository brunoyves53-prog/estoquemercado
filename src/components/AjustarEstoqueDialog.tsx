import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAjustarEstoque } from '@/hooks/useProdutos';
import { ProdutoComEstoque } from '@/lib/supabase';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props {
  produto: ProdutoComEstoque;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AjustarEstoqueDialog({ produto, open, onOpenChange }: Props) {
  const ajustar = useAjustarEstoque();
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada');
  const [quantidade, setQuantidade] = useState('');

  const handleSubmit = async () => {
    const qty = parseInt(quantidade);
    if (!qty || qty <= 0) {
      toast.error('Informe uma quantidade válida');
      return;
    }
    if (tipo === 'saida' && qty > produto.estoque_total) {
      toast.error('Quantidade maior que o estoque disponível');
      return;
    }
    try {
      await ajustar.mutateAsync({ produto_id: produto.id, quantidade: qty, tipo_ajuste: tipo });
      toast.success(`Ajuste de ${tipo === 'entrada' ? 'entrada' : 'saída'} registrado!`);
      setQuantidade('');
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao ajustar estoque');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajustar Estoque</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">{produto.nome_produto}</p>
            <p className="text-xs text-muted-foreground">Estoque atual: <strong>{produto.estoque_total}</strong> un.</p>
          </div>
          <Tabs value={tipo} onValueChange={(v) => setTipo(v as 'entrada' | 'saida')}>
            <TabsList className="w-full">
              <TabsTrigger value="entrada" className="flex-1">Entrada</TabsTrigger>
              <TabsTrigger value="saida" className="flex-1">Saída</TabsTrigger>
            </TabsList>
          </Tabs>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Quantidade</Label>
            <Input
              type="number"
              inputMode="numeric"
              placeholder="Ex: 10"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={ajustar.isPending}>
            {ajustar.isPending ? 'Ajustando...' : 'Confirmar Ajuste'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
