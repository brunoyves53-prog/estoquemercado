import { ProdutoComEstoque } from '@/lib/supabase';

export type AlertLevel = 'critico' | 'atencao' | 'normal';

export interface ProdutoAlert {
  level: AlertLevel;
  diasRestantes: number | null;
  label: string;
}

export function calcularAlerta(produto: ProdutoComEstoque): ProdutoAlert {
  const { estoque_total, media_venda_mensal } = produto;

  if (estoque_total <= 0) {
    return { level: 'critico', diasRestantes: 0, label: 'Sem estoque' };
  }

  // If we have consumption data, calculate days remaining
  if (media_venda_mensal > 0) {
    const consumoDiario = media_venda_mensal / 30;
    const diasRestantes = Math.round(estoque_total / consumoDiario);

    if (diasRestantes <= 3) {
      return { level: 'critico', diasRestantes, label: `Acaba em ${diasRestantes}d` };
    }
    if (diasRestantes <= 7) {
      return { level: 'atencao', diasRestantes, label: `Acaba em ${diasRestantes}d` };
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
