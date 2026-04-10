import { useState, useRef, useEffect } from 'react';
import { Search, ScanBarcode, Plus, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ProdutoComEstoque } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface ProductAutocompleteProps {
  produtos: ProdutoComEstoque[];
  onSelect: (produto: ProdutoComEstoque) => void;
  label?: string;
  placeholder?: string;
  showStock?: boolean;
}

export default function ProductAutocomplete({
  produtos,
  onSelect,
  label = 'Buscar Produto',
  placeholder = 'Nome ou código de barras...',
  showStock = false,
}: ProductAutocompleteProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const suggestions = search.length > 0
    ? produtos.filter(p =>
        p.nome_produto.toLowerCase().includes(search.toLowerCase()) ||
        p.codigo_barras.includes(search)
      ).slice(0, 8)
    : [];

  const noResults = search.length > 1 && suggestions.length === 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (produto: ProdutoComEstoque) => {
    onSelect(produto);
    setSearch('');
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          placeholder={placeholder}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="pl-10"
        />
      </div>

      {open && (suggestions.length > 0 || noResults) && (
        <div className="absolute z-30 w-full mt-1.5 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          {suggestions.map(p => (
            <button
              key={p.id}
              className="w-full text-left px-3 py-2.5 hover:bg-accent/50 transition-colors border-b border-border/50 last:border-0 flex items-center gap-3"
              onClick={() => handleSelect(p)}
            >
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border/50">
                {p.imagem_url ? (
                  <img src={p.imagem_url} alt={p.nome_produto} className="h-full w-full object-cover" />
                ) : (
                  <Package size={18} className="text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{p.nome_produto}</p>
                <p className="text-xs text-muted-foreground font-mono">{p.codigo_barras}</p>
              </div>
              {showStock && (
                <span className="text-sm font-display font-bold text-muted-foreground shrink-0">
                  {p.estoque_total} un.
                </span>
              )}
            </button>
          ))}

          {noResults && (
            <div className="p-4 text-center space-y-3">
              <p className="text-sm text-muted-foreground">Produto não encontrado</p>
              <div className="flex gap-2 justify-center">
                <button
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  onClick={() => navigate('/cadastro')}
                >
                  <Plus size={14} /> Cadastrar novo
                </button>
                <button
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  onClick={() => navigate('/compras?scan=true')}
                >
                  <ScanBarcode size={14} /> Escanear código
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
