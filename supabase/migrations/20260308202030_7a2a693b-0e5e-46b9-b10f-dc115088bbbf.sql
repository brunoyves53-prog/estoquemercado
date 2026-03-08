
-- Create produtos table
CREATE TABLE public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_produto TEXT NOT NULL UNIQUE,
  codigo_barras TEXT NOT NULL UNIQUE,
  preco_compra NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_venda NUMERIC(10,2) NOT NULL DEFAULT 0,
  media_venda_mensal NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lotes table
CREATE TABLE public.lotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  data_compra DATE NOT NULL DEFAULT CURRENT_DATE,
  data_validade DATE,
  quantidade_lote INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create movimentacoes table
CREATE TABLE public.movimentacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  lote_id UUID REFERENCES public.lotes(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('compra', 'retirada', 'ajuste')),
  quantidade INTEGER NOT NULL,
  data_movimentacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth required for this inventory system)
CREATE POLICY "Allow all access to produtos" ON public.produtos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to lotes" ON public.lotes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to movimentacoes" ON public.movimentacoes FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_lotes_produto_id ON public.lotes(produto_id);
CREATE INDEX idx_lotes_data_validade ON public.lotes(data_validade);
CREATE INDEX idx_movimentacoes_produto_id ON public.movimentacoes(produto_id);
CREATE INDEX idx_movimentacoes_tipo ON public.movimentacoes(tipo);
CREATE INDEX idx_movimentacoes_data ON public.movimentacoes(data_movimentacao);
