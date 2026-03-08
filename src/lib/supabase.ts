import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Produto = {
  id: string;
  nome_produto: string;
  codigo_barras: string;
  preco_compra: number;
  preco_venda: number;
  media_venda_mensal: number;
  created_at: string;
};

export type Lote = {
  id: string;
  produto_id: string;
  data_compra: string;
  data_validade: string | null;
  quantidade_lote: number;
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
};
