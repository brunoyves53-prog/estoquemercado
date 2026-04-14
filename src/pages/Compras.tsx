import { useState, useEffect } from 'react';
import { useProdutos, useRegistrarCompra } from '@/hooks/useProdutos';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScanBarcode, Package } from 'lucide-react';
import BarcodeScanner from '@/components/BarcodeScanner';
import ProductAutocomplete from '@/components/ProductAutocomplete';
import { toast } from 'sonner';
import { ProdutoComEstoque } from '@/lib/supabase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Compras() {
  const { data: produtos = [] } = useProdutos();
  const registrar = useRegistrarCompra();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [showScanner, setShowScanner] = useState(false);
  const [selected, setSelected] = useState<ProdutoComEstoque | null>(null);
  const [quantidade, setQuantidade] = useState('');
  const [validade, setValidade] = useState('');
  const [cicloReposicao, setCicloReposicao] = useState('30');
  const [notFoundCode, setNotFoundCode] = useState('');

  useEffect(() => {
    if (searchParams.get('scan') === 'true') {
      setShowScanner(true);
    }
  }, [searchParams]);

  const handleScan = (code: string) => {
    setShowScanner(false);
    const found = produtos.find(p => p.codigo_barras === code);
    if (found) {
      setSelected(found);
      setNotFoundCode('');
      toast.success(`Produto encontrado: ${found.nome_produto}`);
    } else {
      setNotFoundCode(code);
      toast.info('Produto não cadastrado');
    }
  };

  const handleSubmit = async () => {
    if (!selected || !quantidade) {
      toast.error('Selecione um produto e informe a quantidade');
      return;
    }
    try {
      await registrar.mutateAsync({
        produto_id: selected.id,
        quantidade: parseInt(quantidade),
        data_validade: validade || null,
        ciclo_reposicao: parseInt(cicloReposicao) || 30,
      });
      toast.success('Compra registrada!');
      setSelected(null);
      setQuantidade('');
      setValidade('');
      setCicloReposicao('30');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar compra');
    }
  };

  return (
    <div className="page-container">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-2xl font-display font-bold">Registrar Compra</h1>
        <p className="text-xs text-muted-foreground mt-1">Entrada de estoque com lote, validade e ciclo</p>
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
          onSelect={(p) => { setSelected(p); setNotFoundCode(''); }}
        />

        {selected && (
          <div className="stat-card border-primary/30 flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border/50">
              {selected.imagem_url ? (
                <img src={selected.imagem_url} alt={selected.nome_produto} className="h-full w-full object-cover" />
              ) : (
                <Package size={20} className="text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold">{selected.nome_produto}</p>
              <p className="text-xs text-muted-foreground font-mono">{selected.codigo_barras}</p>
            </div>
          </div>
        )}

        {notFoundCode && !selected && (
          <div className="stat-card border-warning/40">
            <p className="text-sm text-warning font-medium">Produto não encontrado no cadastro</p>
            <p className="text-xs text-muted-foreground mb-2">Código: {notFoundCode}</p>
            <Button size="sm" onClick={() => navigate(`/cadastro?codigo=${notFoundCode}`)}>
              Cadastrar novo produto
            </Button>
          </div>
        )}

        {selected && (
          <>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Quantidade Comprada</Label>
              <Input type="number" inputMode="numeric" placeholder="Ex: 50" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Data de Validade (opcional)</Label>
              <Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Ciclo de Reposição</Label>
              <Select value={cicloReposicao} onValueChange={setCicloReposicao}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="15">15 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="45">45 dias</SelectItem>
                  <SelectItem value="60">60 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="xl" className="w-full" onClick={handleSubmit} disabled={registrar.isPending}>
              {registrar.isPending ? 'Registrando...' : 'Registrar Compra'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
