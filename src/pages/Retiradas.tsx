import { useState, useEffect } from 'react';
import { useProdutos, useRegistrarRetirada } from '@/hooks/useProdutos';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, ScanBarcode } from 'lucide-react';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import BarcodeScanner from '@/components/BarcodeScanner';
import { toast } from 'sonner';
import { ProdutoComEstoque } from '@/lib/supabase';

export default function Retiradas() {
  const { data: produtos = [] } = useProdutos();
  const retirar = useRegistrarRetirada();
  const [searchParams] = useSearchParams();

  const [selected, setSelected] = useState<ProdutoComEstoque | null>(null);
  const [quantidade, setQuantidade] = useState('');
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (searchParams.get('scan') === 'true') {
      setShowScanner(true);
    }
  }, [searchParams]);

  const handleScan = (code: string) => {
    setShowScanner(false);
    // Reset previous selection
    setSelected(null);
    setQuantidade('');
    const found = produtos.find(p => p.codigo_barras === code);
    if (found) {
      if (found.estoque_total <= 0) {
        toast.error('Produto encontrado, mas sem estoque disponível');
        return;
      }
      setSelected(found);
      toast.success(`Produto encontrado: ${found.nome_produto}`);
    } else {
      toast.error('Produto não encontrado no estoque');
    }
  };

  const handleSubmit = async () => {
    if (!selected || !quantidade) {
      toast.error('Selecione um produto e informe a quantidade');
      return;
    }
    const qty = parseInt(quantidade);
    if (qty > selected.estoque_total) {
      toast.error('Quantidade maior que o estoque disponível');
      return;
    }
    try {
      await retirar.mutateAsync({ produto_id: selected.id, quantidade: qty });
      toast.success('Retirada registrada (FEFO aplicado)!');
      setSelected(null);
      setQuantidade('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar retirada');
    }
  };

  return (
    <div className="page-container">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-2xl font-display font-bold">Registrar Retirada</h1>
      </div>

      {showScanner && (
        <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      <div className="p-6 space-y-4 max-w-2xl">
        <Button size="xl" className="w-full" variant="outline" onClick={() => setShowScanner(true)}>
          <ScanBarcode size={24} />
          Escanear Código de Barras
        </Button>

        <ProductAutocomplete
          produtos={produtos}
          onSelect={setSelected}
          showStock
        />

        {selected && (
          <>
            <div className="stat-card border-accent/30 flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border/50">
                {selected.imagem_url ? (
                  <img src={selected.imagem_url} alt={selected.nome_produto} className="h-full w-full object-cover" />
                ) : (
                  <Package size={20} className="text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">{selected.nome_produto}</p>
                <p className="text-xs text-muted-foreground">Estoque: <span className="font-bold">{selected.estoque_total}</span> un.</p>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Quantidade para Retirada</Label>
              <Input type="number" inputMode="numeric" placeholder="Ex: 10" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} max={selected.estoque_total} />
            </div>

            <Button size="xl" className="w-full" variant="success" onClick={handleSubmit} disabled={retirar.isPending}>
              {retirar.isPending ? 'Registrando...' : 'Confirmar Retirada'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
