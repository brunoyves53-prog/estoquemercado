import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, Produto, ProdutoComEstoque, Lote, Movimentacao } from '@/lib/supabase';

export function useProdutos() {
  return useQuery({
    queryKey: ['produtos'],
    queryFn: async (): Promise<ProdutoComEstoque[]> => {
      const { data: produtos, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome_produto');
      if (error) throw error;

      const { data: lotes } = await supabase
        .from('lotes')
        .select('*')
        .gt('quantidade_lote', 0)
        .order('data_validade', { ascending: true });

      return (produtos || []).map((p: Produto) => {
        const prodLotes = (lotes || []).filter((l: Lote) => l.produto_id === p.id);
        const estoque_total = prodLotes.reduce((sum: number, l: Lote) => sum + l.quantidade_lote, 0);
        const proxima_validade = prodLotes.find((l: Lote) => l.data_validade)?.data_validade || null;
        return { ...p, estoque_total, proxima_validade };
      });
    },
  });
}

export function useLotes(produtoId?: string) {
  return useQuery({
    queryKey: ['lotes', produtoId],
    queryFn: async () => {
      let query = supabase.from('lotes').select('*').gt('quantidade_lote', 0).order('data_validade', { ascending: true });
      if (produtoId) query = query.eq('produto_id', produtoId);
      const { data, error } = await query;
      if (error) throw error;
      return data as Lote[];
    },
  });
}

export function useMovimentacoes() {
  return useQuery({
    queryKey: ['movimentacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movimentacoes')
        .select('*, produtos(nome_produto)')
        .order('data_movimentacao', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as (Movimentacao & { produtos: { nome_produto: string } })[];
    },
  });
}

export function useCadastrarProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (produto: Omit<Produto, 'id' | 'created_at'> & { imagem_url?: string | null }) => {
      const { data, error } = await supabase.from('produtos').insert(produto).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produtos'] }),
  });
}

export function useExcluirProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (produtoId: string) => {
      // Delete movimentacoes, then lotes, then produto
      await supabase.from('movimentacoes').delete().eq('produto_id', produtoId);
      await supabase.from('lotes').delete().eq('produto_id', produtoId);
      const { error } = await supabase.from('produtos').delete().eq('id', produtoId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['produtos'] });
      qc.invalidateQueries({ queryKey: ['lotes'] });
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
    },
  });
}

export function useRegistrarCompra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { produto_id: string; quantidade: number; data_validade: string | null }) => {
      const { data: lote, error: loteErr } = await supabase
        .from('lotes')
        .insert({
          produto_id: params.produto_id,
          quantidade_lote: params.quantidade,
          data_validade: params.data_validade,
        })
        .select()
        .single();
      if (loteErr) throw loteErr;

      const { error: movErr } = await supabase.from('movimentacoes').insert({
        produto_id: params.produto_id,
        lote_id: lote.id,
        tipo: 'compra',
        quantidade: params.quantidade,
      });
      if (movErr) throw movErr;
      return lote;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['produtos'] });
      qc.invalidateQueries({ queryKey: ['lotes'] });
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
    },
  });
}

export function useRegistrarRetirada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { produto_id: string; quantidade: number }) => {
      // FEFO: get lotes ordered by closest expiry
      const { data: lotes, error: lotesErr } = await supabase
        .from('lotes')
        .select('*')
        .eq('produto_id', params.produto_id)
        .gt('quantidade_lote', 0)
        .order('data_validade', { ascending: true, nullsFirst: false });
      if (lotesErr) throw lotesErr;

      let remaining = params.quantidade;
      const updates: { id: string; quantidade_lote: number }[] = [];
      const movs: { produto_id: string; lote_id: string; tipo: string; quantidade: number }[] = [];

      for (const lote of (lotes || [])) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, lote.quantidade_lote);
        updates.push({ id: lote.id, quantidade_lote: lote.quantidade_lote - take });
        movs.push({ produto_id: params.produto_id, lote_id: lote.id, tipo: 'retirada', quantidade: take });
        remaining -= take;
      }

      if (remaining > 0) throw new Error('Estoque insuficiente');

      for (const upd of updates) {
        await supabase.from('lotes').update({ quantidade_lote: upd.quantidade_lote }).eq('id', upd.id);
      }
      if (movs.length > 0) {
        await supabase.from('movimentacoes').insert(movs);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['produtos'] });
      qc.invalidateQueries({ queryKey: ['lotes'] });
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
    },
  });
}

export function useProdutoPorCodigo() {
  return useMutation({
    mutationFn: async (codigo: string) => {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('codigo_barras', codigo)
        .maybeSingle();
      if (error) throw error;
      return data as Produto | null;
    },
  });
}

export function useAtualizarProduto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string } & Partial<Omit<Produto, 'id' | 'created_at'>>) => {
      const { id, ...updates } = params;
      const { data, error } = await supabase.from('produtos').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['produtos'] }),
  });
}

export function useAjustarEstoque() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { produto_id: string; quantidade: number; tipo_ajuste: 'entrada' | 'saida' }) => {
      if (params.tipo_ajuste === 'entrada') {
        // Create a new lote for the entry
        const { data: lote, error: loteErr } = await supabase
          .from('lotes')
          .insert({ produto_id: params.produto_id, quantidade_lote: params.quantidade })
          .select()
          .single();
        if (loteErr) throw loteErr;

        const { error: movErr } = await supabase.from('movimentacoes').insert({
          produto_id: params.produto_id,
          lote_id: lote.id,
          tipo: 'ajuste',
          quantidade: params.quantidade,
        });
        if (movErr) throw movErr;
      } else {
        // FEFO withdrawal for adjustment
        const { data: lotes, error: lotesErr } = await supabase
          .from('lotes')
          .select('*')
          .eq('produto_id', params.produto_id)
          .gt('quantidade_lote', 0)
          .order('data_validade', { ascending: true, nullsFirst: false });
        if (lotesErr) throw lotesErr;

        let remaining = params.quantidade;
        for (const lote of (lotes || [])) {
          if (remaining <= 0) break;
          const take = Math.min(remaining, lote.quantidade_lote);
          await supabase.from('lotes').update({ quantidade_lote: lote.quantidade_lote - take }).eq('id', lote.id);
          await supabase.from('movimentacoes').insert({
            produto_id: params.produto_id,
            lote_id: lote.id,
            tipo: 'ajuste',
            quantidade: -take,
          });
          remaining -= take;
        }
        if (remaining > 0) throw new Error('Estoque insuficiente para o ajuste');
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['produtos'] });
      qc.invalidateQueries({ queryKey: ['lotes'] });
      qc.invalidateQueries({ queryKey: ['movimentacoes'] });
    },
  });
}

export function useMovimentacoesProduto(produtoId?: string) {
  return useQuery({
    queryKey: ['movimentacoes', produtoId],
    enabled: !!produtoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movimentacoes')
        .select('*')
        .eq('produto_id', produtoId!)
        .order('data_movimentacao', { ascending: false });
      if (error) throw error;
      return data as Movimentacao[];
    },
  });
}
