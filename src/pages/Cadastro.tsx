import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCadastrarProduto, useProdutoPorCodigo } from '@/hooks/useProdutos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScanBarcode, AlertTriangle, CheckCircle2 } from 'lucide-react';
import BarcodeScanner from '@/components/BarcodeScanner';
import { toast } from 'sonner';

export default function Cadastro() {
  const [searchParams] = useSearchParams();
  const cadastrar = useCadastrarProduto();
  const buscarPorCodigo = useProdutoPorCodigo();

  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState(searchParams.get('codigo') || '');
  const [precoCompra, setPrecoCompra] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [mediaVenda, setMediaVenda] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [codigoStatus, setCodigoStatus] = useState<'idle' | 'checking' | 'available' | 'duplicate'>('idle');
  const [duplicateNome, setDuplicateNome] = useState('');

  const verificarCodigo = useCallback(async (code: string) => {
    if (!code.trim()) { setCodigoStatus('idle'); return; }
    setCodigoStatus('checking');
    try {
      const produto = await buscarPorCodigo.mutateAsync(code.trim());
      if (produto) { setCodigoStatus('duplicate'); setDuplicateNome(produto.nome_produto); }
      else { setCodigoStatus('available'); setDuplicateNome(''); }
    } catch { setCodigoStatus('idle'); }
  }, [buscarPorCodigo]);

  const handleScan = useCallback((code: string) => {
    setShowScanner(false);
    setCodigo(code);
    toast.success(`Código capturado: ${code}`);
    verificarCodigo(code);
  }, [verificarCodigo]);

  const handleCodigoChange = (value: string) => { setCodigo(value); setCodigoStatus('idle'); setDuplicateNome(''); };
  const handleCodigoBlur = () => { verificarCodigo(codigo); };

  const handleSubmit = async () => {
    if (!nome || !codigo) { toast.error('Nome e código de barras são obrigatórios'); return; }
    if (codigoStatus === 'duplicate') { toast.error('Este código de barras já está cadastrado.'); return; }
    try {
      await cadastrar.mutateAsync({
        nome_produto: nome.trim(),
        codigo_barras: codigo.trim(),
        preco_compra: parseFloat(precoCompra) || 0,
        preco_venda: parseFloat(precoVenda) || 0,
        media_venda_mensal: parseFloat(mediaVenda) || 0,
      });
      toast.success('Produto cadastrado!');
      setNome(''); setCodigo(''); setPrecoCompra(''); setPrecoVenda(''); setMediaVenda(''); setCodigoStatus('idle');
    } catch (err: any) {
      if (err.message?.includes('unique') || err.message?.includes('duplicate')) {
        toast.error('Já existe um produto com este nome ou código de barras');
      } else { toast.error(err.message || 'Erro ao cadastrar'); }
    }
  };

  return (
    <div className="page-container">
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-2xl font-display font-bold">Cadastrar Produto</h1>
      </div>

      {showScanner && (
        <BarcodeScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      <div className="p-6 space-y-4 max-w-2xl">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Nome do Produto *</Label>
          <Input placeholder="Ex: Arroz Integral 1kg" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Código de Barras *</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: 7891234567890"
              value={codigo}
              onChange={(e) => handleCodigoChange(e.target.value)}
              onBlur={handleCodigoBlur}
              className="flex-1"
            />
            <Button variant="outline" size="icon" className="shrink-0 h-10 w-12" onClick={() => setShowScanner(true)} type="button">
              <ScanBarcode size={20} />
            </Button>
          </div>

          {codigoStatus === 'duplicate' && (
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-3">
              <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">
                Este código já está cadastrado para: <strong>{duplicateNome}</strong>
              </p>
            </div>
          )}
          {codigoStatus === 'available' && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-success/10 border border-success/30 p-2">
              <CheckCircle2 size={14} className="text-success shrink-0" />
              <p className="text-xs text-success">Código disponível</p>
            </div>
          )}
        </div>

        <Button size="xl" variant="outline" className="w-full" onClick={() => setShowScanner(true)} type="button">
          <ScanBarcode size={24} />
          Escanear Código de Barras
        </Button>

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
        <Button size="xl" className="w-full" onClick={handleSubmit} disabled={cadastrar.isPending || codigoStatus === 'duplicate'}>
          {cadastrar.isPending ? 'Cadastrando...' : 'Cadastrar Produto'}
        </Button>
      </div>
    </div>
  );
}
