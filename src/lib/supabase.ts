// Re-export from auto-generated client
export { supabase } from '@/integrations/supabase/client';

export type Produto = {
  id: string;
  nome_produto: string;
  codigo_barras: string;
  preco_compra: number;
  preco_venda: number;
  media_venda_mensal: number;
  imagem_url: string | null;
  created_at: string;
};

export type Lote = {
  id: string;
  produto_id: string;
  data_compra: string;
  data_validade: string | null;
  quantidade_lote: number;
  ciclo_reposicao: number;
  created_at: string;
};

export type Movimentacao = {
  id: string;
  produto_id: string;
  lote_id: string | null;
  tipo: 'compra' | 'retirada' | 'ajuste';
  quantidade: number;
  data_movimentacao: string;
};

export type ProdutoComEstoque = Produto & {
  estoque_total: number;
  proxima_validade: string | null;
  lotes: Lote[];
};
