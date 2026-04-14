import { ProdutoComEstoque, Lote } from '@/lib/supabase';

export type AlertLevel = 'critico' | 'atencao' | 'normal';

export interface ProdutoAlert {
  level: AlertLevel;
  diasRestantes: number | null;
  label: string;
}

/**
 * Calculate alert for a product based on the most critical lot's cycle.
 * Uses the smallest ciclo_reposicao among active lots.
 */
export function calcularAlerta(produto: ProdutoComEstoque): ProdutoAlert {
  const { estoque_total, media_venda_mensal, lotes } = produto;

  // Determine cycle from the lot with the shortest cycle (most urgent)
  const activeLotes = (lotes || []).filter(l => l.quantidade_lote > 0);
  const ciclo = activeLotes.length > 0
    ? Math.min(...activeLotes.map(l => l.ciclo_reposicao || 30))
    : 30;

  if (estoque_total <= 0) {
    return { level: 'critico', diasRestantes: 0, label: 'Sem estoque' };
  }

  // If we have consumption data, calculate days remaining
  if (media_venda_mensal > 0) {
    const consumoDiario = media_venda_mensal / 30;
    const diasRestantes = Math.round(estoque_total / consumoDiario);

    const limiarCritico = Math.max(3, Math.round(ciclo * 0.3));
    const limiarAtencao = Math.max(7, Math.round(ciclo * 0.7));

    if (diasRestantes <= limiarCritico) {
      return { level: 'critico', diasRestantes, label: `Acaba em ${diasRestantes}d (ciclo ${ciclo}d)` };
    }
    if (diasRestantes <= limiarAtencao) {
      return { level: 'atencao', diasRestantes, label: `Acaba em ${diasRestantes}d (ciclo ${ciclo}d)` };
    }
    return { level: 'normal', diasRestantes, label: `~${diasRestantes}d restantes` };
  }

  // Fallback: fixed thresholds
  if (estoque_total <= 5) {
    return { level: 'critico', diasRestantes: null, label: 'Estoque crítico' };
  }
  if (estoque_total <= 10) {
    return { level: 'atencao', diasRestantes: null, label: 'Estoque baixo' };
  }
  return { level: 'normal', diasRestantes: null, label: '' };
}
