import { useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCadastrarProduto, useProdutoPorCodigo } from '@/hooks/useProdutos';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScanBarcode, AlertTriangle, CheckCircle2, Package, Loader2, Camera, ImagePlus } from 'lucide-react';
import BarcodeScanner from '@/components/BarcodeScanner';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface OpenFoodFactsResult {
  nome: string;
  marca: string;
  imagemUrl: string | null;
}

async function buscarCosmos(codigo: string): Promise<OpenFoodFactsResult | null> {
  try {
    const res = await supabase.functions.invoke('cosmos-lookup', {
      body: { barcode: codigo },
    });
    if (res.error) return null;
    const data = res.data;
    if (data?.found && data.nome) {
      return { nome: data.nome, marca: data.marca || '', imagemUrl: data.imagemUrl || null };
    }
  } catch { /* continue */ }
  return null;
}

async function buscarOpenFoodFacts(codigo: string): Promise<OpenFoodFactsResult | null> {
  // World
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${codigo}.json`);
    if (res.ok) {
      const json = await res.json();
      if (json.status === 1 && json.product) {
        const p = json.product;
        const nome = p.product_name || p.product_name_pt || '';
        if (nome) return { nome, marca: p.brands || '', imagemUrl: p.image_url || p.image_front_url || null };
      }
    }
  } catch { /* continue */ }
  // BR
  try {
    const res = await fetch(`https://br.openfoodfacts.org/api/v2/product/${codigo}.json`);
    if (res.ok) {
      const json = await res.json();
      if (json.status === 1 && json.product) {
        const p = json.product;
        const nome = p.product_name || p.product_name_pt || '';
        if (nome) return { nome, marca: p.brands || '', imagemUrl: p.image_url || p.image_front_url || null };
      }
    }
  } catch { /* continue */ }
  // Open Beauty Facts
  try {
    const res = await fetch(`https://world.openbeautyfacts.org/api/v2/product/${codigo}.json`);
    if (res.ok) {
      const json = await res.json();
      if (json.status === 1 && json.product) {
        const p = json.product;
        const nome = p.product_name || '';
        if (nome) return { nome, marca: p.brands || '', imagemUrl: p.image_url || p.image_front_url || null };
      }
    }
  } catch { /* continue */ }
  return null;
}

async function buscarProdutoExterno(codigo: string): Promise<OpenFoodFactsResult | null> {
  // 1) Cosmos Bluesoft (priority for Brazil)
  const cosmos = await buscarCosmos(codigo);
  if (cosmos) return cosmos;

  // 2) Open Food Facts + Open Beauty Facts
  const off = await buscarOpenFoodFacts(codigo);
  if (off) return off;

  return null;
}

async function salvarProdutoAutomaticamente(
  codigo: string,
  result: OpenFoodFactsResult
) {
  try {
    const nome = result.nome.trim();
    if (!nome || !codigo.trim()) return;

    // Check if already exists
    const { data: existing } = await supabase
      .from('produtos')
      .select('id, imagem_url')
      .eq('codigo_barras', codigo.trim())
      .maybeSingle();

    if (existing) {
      // Update empty fields only
      if (!existing.imagem_url && result.imagemUrl) {
        await supabase
          .from('produtos')
          .update({ imagem_url: result.imagemUrl })
          .eq('id', existing.id);
      }
      return;
    }

    // Auto-save new product
    await supabase.from('produtos').insert({
      nome_produto: nome,
      codigo_barras: codigo.trim(),
      imagem_url: result.imagemUrl || null,
      preco_compra: 0,
      preco_venda: 0,
      media_venda_mensal: 0,
    });
  } catch {
    // Silent fail - don't interrupt user flow
  }
}

export default function Cadastro() {
  const [searchParams] = useSearchParams();
  const cadastrar = useCadastrarProduto();
  const buscarPorCodigo = useProdutoPorCodigo();

  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState(searchParams.get('codigo') || '');
  const [precoCompra, setPrecoCompra] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [mediaVenda, setMediaVenda] = useState('');
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);
  const [marca, setMarca] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [codigoStatus, setCodigoStatus] = useState<'idle' | 'checking' | 'available' | 'duplicate'>('idle');
  const [duplicateNome, setDuplicateNome] = useState('');
  const [buscandoAPI, setBuscandoAPI] = useState(false);
  const [produtoNaoEncontrado, setProdutoNaoEncontrado] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const resetarFormulario = useCallback(() => {
    setNome('');
    setImagemUrl(null);
    setMarca('');
    setPrecoCompra('');
    setPrecoVenda('');
    setMediaVenda('');
    setCodigoStatus('idle');
    setDuplicateNome('');
    setProdutoNaoEncontrado(false);
  }, []);

  const buscarNaAPI = useCallback(async (code: string) => {
    setBuscandoAPI(true);
    setProdutoNaoEncontrado(false);
    try {
      const result = await buscarProdutoExterno(code);
      if (result) {
        if (result.nome) setNome(result.nome);
        if (result.imagemUrl) setImagemUrl(result.imagemUrl);
        if (result.marca) setMarca(result.marca);
        toast.success('Produto encontrado na base externa!');
        // Auto-save in background
        salvarProdutoAutomaticamente(code, result);
      } else {
        setProdutoNaoEncontrado(true);
        toast.info('Produto não encontrado. Tire uma foto ou cadastre manualmente.');
      }
    } catch {
      // silently fail
    } finally {
      setBuscandoAPI(false);
    }
  }, []);

  const handlePhotoCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('product-photos')
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-photos')
        .getPublicUrl(fileName);

      setImagemUrl(publicUrl);
      setProdutoNaoEncontrado(false);
      toast.success('Foto capturada com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao enviar foto: ' + (err.message || 'Tente novamente'));
    } finally {
      setUploadingPhoto(false);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  }, []);

  const verificarCodigo = useCallback(async (code: string) => {
    if (!code.trim()) { setCodigoStatus('idle'); return; }
    setCodigoStatus('checking');
    try {
      const produto = await buscarPorCodigo.mutateAsync(code.trim());
      if (produto) {
        setCodigoStatus('duplicate');
        setDuplicateNome(produto.nome_produto);
      } else {
        setCodigoStatus('available');
        setDuplicateNome('');
        buscarNaAPI(code.trim());
      }
    } catch {
      setCodigoStatus('idle');
    }
  }, [buscarPorCodigo, buscarNaAPI]);

  const handleScan = useCallback((code: string) => {
    setShowScanner(false);
    resetarFormulario();
    setCodigo(code);
    toast.success(`Código capturado: ${code}`);
    verificarCodigo(code);
  }, [verificarCodigo, resetarFormulario]);

  const handleCodigoChange = (value: string) => {
    setCodigo(value);
    setCodigoStatus('idle');
    setDuplicateNome('');
    setImagemUrl(null);
    setMarca('');
    setProdutoNaoEncontrado(false);
  };
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
        imagem_url: imagemUrl || null,
      });
      toast.success('Produto cadastrado!');
      setNome(''); setCodigo(''); setPrecoCompra(''); setPrecoVenda(''); setMediaVenda('');
      setImagemUrl(null); setMarca(''); setCodigoStatus('idle'); setProdutoNaoEncontrado(false);
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
        {/* Product preview from API */}
        {(imagemUrl || buscandoAPI) && (
          <div className="stat-card border-primary/30 flex flex-col items-center gap-3 py-5">
            {buscandoAPI ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Buscando produto...</span>
              </div>
            ) : (
              <>
                <div className="h-24 w-24 rounded-xl bg-muted flex items-center justify-center overflow-hidden border border-border/50">
                  {imagemUrl ? (
                    <img src={imagemUrl} alt={nome} className="h-full w-full object-cover" />
                  ) : (
                    <Package size={32} className="text-muted-foreground" />
                  )}
                </div>
                {nome && <p className="text-sm font-semibold text-center">{nome}</p>}
                {marca && <p className="text-xs text-muted-foreground">{marca}</p>}
              </>
            )}
          </div>
        )}

        {/* Photo capture when product not found */}
        {produtoNaoEncontrado && !imagemUrl && !buscandoAPI && (
          <div className="stat-card border-accent/30 flex flex-col items-center gap-3 py-5">
            <Package size={40} className="text-muted-foreground" />
            <p className="text-sm font-medium text-center">Produto não encontrado nas bases externas</p>
            <p className="text-xs text-muted-foreground text-center">Adicione uma foto do produto</p>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoCapture}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoCapture}
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploadingPhoto}
                type="button"
              >
                {uploadingPhoto ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                Tirar Foto
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => galleryInputRef.current?.click()}
                disabled={uploadingPhoto}
                type="button"
              >
                {uploadingPhoto ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                Galeria
              </Button>
            </div>
          </div>
        )}

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
