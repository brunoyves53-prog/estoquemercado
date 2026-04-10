import { useState } from 'react';
import { useProdutos, useRegistrarRetirada } from '@/hooks/useProdutos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';
import { toast } from 'sonner';

export default function Retiradas() {
  const { data: produtos = [] } = useProdutos();
  const retirar = useRegistrarRetirada();

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [selectedNome, setSelectedNome] = useState('');
  const [estoqueAtual, setEstoqueAtual] = useState(0);
  const [quantidade, setQuantidade] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = search.length > 0
    ? produtos.filter(p =>
        p.nome_produto.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo_barras.includes(search)
      ).slice(0, 5)
    : [];

  const selectProduto = (id: string, nome: string, estoque: number) => {
    setSelectedId(id);
    setSelectedNome(nome);
    setEstoqueAtual(estoque);
    setSearch('');
    setShowSuggestions(false);
  };

  const handleSubmit = async () => {
    if (!selectedId || !quantidade) {
      toast.error('Selecione um produto e informe a quantidade');
      return;
    }
    const qty = parseInt(quantidade);
    if (qty > estoqueAtual) {
      toast.error('Quantidade maior que o estoque disponível');
      return;
    }
    try {
      await retirar.mutateAsync({ produto_id: selectedId, quantidade: qty });
      toast.success('Retirada registrada (FEFO aplicado)!');
      setSelectedId('');
      setSelectedNome('');
      setQuantidade('');
      setEstoqueAtual(0);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar retirada');
    }
  };

  return (
    <div className="page-container">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-2xl font-display font-bold">Registrar Retirada</h1>
      </div>

      <div className="p-6 space-y-4 max-w-2xl">
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
                  onClick={() => selectProduto(p.id, p.nome_produto, p.estoque_total)}
                >
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-medium">{p.nome_produto}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.codigo_barras}</p>
                    </div>
                    <span className="text-sm font-display font-bold">{p.estoque_total} un.</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedNome && (
          <>
            <div className="stat-card border-accent/30">
              <p className="text-sm font-semibold">{selectedNome}</p>
              <p className="text-xs text-muted-foreground">Estoque disponível: <span className="font-bold">{estoqueAtual}</span> un.</p>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Quantidade para Retirada</Label>
              <Input type="number" inputMode="numeric" placeholder="Ex: 10" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} max={estoqueAtual} />
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
