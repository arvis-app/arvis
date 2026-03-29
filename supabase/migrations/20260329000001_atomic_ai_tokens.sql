-- Fonction d'incrément atomique des tokens IA
-- Remplace le UPDATE absolu (tokensUsed + N) par un incrément relatif (ai_tokens_used + N)
-- ce qui évite la race condition lors de requêtes concurrentes.
CREATE OR REPLACE FUNCTION increment_ai_tokens(
  p_user_id uuid,
  p_tokens  integer
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.users
  SET ai_tokens_used = ai_tokens_used + p_tokens
  WHERE id = p_user_id;
$$;
