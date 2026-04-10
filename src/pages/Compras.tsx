import { useState, useEffect } from 'react';
import { useProdutos, useRegistrarCompra, useProdutoPorCodigo } from '@/hooks/useProdutos';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScanBarcode, Search } from 'lucide-react';
import BarcodeScanner from '@/components/BarcodeScanner';
import { toast } from 'sonner';

export default function Compras() {
  const { data: produtos = [] } = useProdutos();
  const registrar = useRegistrarCompra();
  const buscarPorCodigo = useProdutoPorCodigo();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [showScanner, setShowScanner] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [selectedNome, setSelectedNome] = useState('');
  const [selectedCodigo, setSelectedCodigo] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [validade, setValidade] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (searchParams.get('scan') === 'true') {
      setShowScanner(true);
    }
  }, [searchParams]);

  const suggestions = search.length > 0
    ? produtos.filter(p =>
        p.nome_produto.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo_barras.includes(search)
      ).slice(0, 5)
    : [];

  const selectProduto = (id: string, nome: string, codigo: string) => {
    setSelectedId(id);
    setSelectedNome(nome);
    setSelectedCodigo(codigo);
    setSearch('');
    setShowSuggestions(false);
    setNotFound(false);
  };

  const handleScan = async (code: string) => {
    setShowScanner(false);
    const found = produtos.find(p => p.codigo_barras === code);
    if (found) {
      selectProduto(found.id, found.nome_produto, found.codigo_barras);
      toast.success(`Produto encontrado: ${found.nome_produto}`);
    } else {
      setNotFound(true);
      setSelectedCodigo(code);
      toast.info('Produto não cadastrado');
    }
  };

  const handleSubmit = async () => {
    if (!selectedId || !quantidade) {
      toast.error('Selecione um produto e informe a quantidade');
      return;
    }
    try {
      await registrar.mutateAsync({
        produto_id: selectedId,
        quantidade: parseInt(quantidade),
        data_validade: validade || null,
      });
      toast.success('Compra registrada!');
      setSelectedId('');
      setSelectedNome('');
      setSelectedCodigo('');
      setQuantidade('');
      setValidade('');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar compra');
    }
  };

  return (
    <div className="page-container">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-2xl font-display font-bold">Registrar Compra</h1>
      </div>

      {showScanner && (
        <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      <div className="p-6 space-y-4 max-w-2xl">
        <Button size="xl" className="w-full" variant="outline" onClick={() => setShowScanner(true)}>
          <ScanBarcode size={24} />
          Escanear Código de Barras
        </Button>

        <div className="relative">
          <Label className="text-xs text-muted-foreground mb-1 block">Buscar Produto</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Nome ou código de barras..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              className="pl-10"
            />
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
              {suggestions.map(p => (
                <button
                  key={p.id}
                  className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-0"
                  onClick={() => selectProduto(p.id, p.nome_produto, p.codigo_barras)}
                >
                  <p className="text-sm font-medium">{p.nome_produto}</p>
                  <p className="text-xs text-muted-foreground font-mono">{p.codigo_barras}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedNome && (
          <div className="stat-card border-primary/30">
            <p className="text-sm font-semibold">{selectedNome}</p>
            <p className="text-xs text-muted-foreground font-mono">{selectedCodigo}</p>
          </div>
        )}

        {notFound && !selectedId && (
          <div className="stat-card border-warning/40">
            <p className="text-sm text-warning font-medium">Produto não encontrado no cadastro</p>
            <p className="text-xs text-muted-foreground mb-2">Código: {selectedCodigo}</p>
            <Button size="sm" onClick={() => navigate(`/cadastro?codigo=${selectedCodigo}`)}>
              Cadastrar novo produto
            </Button>
          </div>
        )}

        {selectedId && (
          <>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Quantidade Comprada</Label>
              <Input type="number" inputMode="numeric" placeholder="Ex: 50" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Data de Validade (opcional)</Label>
              <Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)} />
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
