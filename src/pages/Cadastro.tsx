import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCadastrarProduto } from '@/hooks/useProdutos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Cadastro() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const cadastrar = useCadastrarProduto();

  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState(searchParams.get('codigo') || '');
  const [precoCompra, setPrecoCompra] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [mediaVenda, setMediaVenda] = useState('');

  const handleSubmit = async () => {
    if (!nome || !codigo) {
      toast.error('Nome e código de barras são obrigatórios');
      return;
    }
    try {
      await cadastrar.mutateAsync({
        nome_produto: nome.trim(),
        codigo_barras: codigo.trim(),
        preco_compra: parseFloat(precoCompra) || 0,
        preco_venda: parseFloat(precoVenda) || 0,
        media_venda_mensal: parseFloat(mediaVenda) || 0,
      });
      toast.success('Produto cadastrado!');
      setNome('');
      setCodigo('');
      setPrecoCompra('');
      setPrecoVenda('');
      setMediaVenda('');
    } catch (err: any) {
      if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
        toast.error('Já existe um produto com este nome ou código de barras');
      } else {
        toast.error(err.message || 'Erro ao cadastrar');
      }
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="text-xl font-bold">Cadastrar Produto</h1>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Nome do Produto *</Label>
          <Input placeholder="Ex: Arroz Integral 1kg" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Código de Barras *</Label>
          <Input placeholder="Ex: 7891234567890" value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Preço de Compra</Label>
            <Input type="number" inputMode="decimal" placeholder="0.00" value={precoCompra} onChange={(e) => setPrecoCompra(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Preço de Venda</Label>
            <Input type="number" inputMode="decimal" placeholder="0.00" value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Média de Venda Mensal</Label>
          <Input type="number" inputMode="numeric" placeholder="Ex: 30" value={mediaVenda} onChange={(e) => setMediaVenda(e.target.value)} />
        </div>
        <Button
          size="xl"
          className="w-full"
          onClick={handleSubmit}
          disabled={cadastrar.isPending}
        >
          {cadastrar.isPending ? 'Cadastrando...' : 'Cadastrar Produto'}
        </Button>
      </div>
    </div>
  );
}
