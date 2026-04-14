
-- Add ciclo_reposicao to lotes
ALTER TABLE public.lotes ADD COLUMN ciclo_reposicao integer NOT NULL DEFAULT 30;

-- Copy existing ciclo values from produtos to their lotes
UPDATE public.lotes l SET ciclo_reposicao = p.ciclo_reposicao FROM public.produtos p WHERE l.produto_id = p.id;

-- Remove ciclo_reposicao from produtos
ALTER TABLE public.produtos DROP COLUMN ciclo_reposicao;
