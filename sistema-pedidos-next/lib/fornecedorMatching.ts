import { supabaseAdmin } from './supabaseAdmin';

function normalizeName(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string) {
  const maxLen = Math.max(a.length, b.length);
  if (!maxLen) return 0;
  return 1 - levenshtein(a, b) / maxLen;
}

export async function matchOrCreateFornecedor({ nomeDigitado, cnpj, emailDigitado }: { nomeDigitado: string; cnpj?: string | null; emailDigitado?: string | null; }) {
  const nomeOriginal = nomeDigitado?.trim() || '';
  const nomeNorm = normalizeName(nomeOriginal);
  const cnpjLimpo = cnpj?.replace(/\D/g, '') || null;
  const LIMIAR = 0.85;

  // 1) CNPJ
  if (cnpjLimpo) {
    const { data } = await supabaseAdmin.from('fornecedores').select('*').eq('cnpj', cnpjLimpo).is('mesclado_em', null).maybeSingle();
    if (data) {
      await registrarAlias(data.id, nomeOriginal);
      return data;
    }
  }

  // 2) fuzzy por nome
  const { data: fornecedores } = await supabaseAdmin.from('fornecedores').select('*').is('mesclado_em', null);
  let melhor: any = null;
  let melhorScore = 0;
  fornecedores?.forEach((f: any) => {
    const candidatos = [f.nome_canonico, ...(f.apelidos_variantes || [])];
    const score = Math.max(...candidatos.map((c: string) => similarity(nomeNorm, normalizeName(c))));
    if (score > melhorScore) { melhor = f; melhorScore = score; }
  });
  if (melhor && melhorScore >= LIMIAR) {
    await registrarAlias(melhor.id, nomeOriginal);
    return melhor;
  }

  // 3) cria
  const { data: novo, error } = await supabaseAdmin.from('fornecedores').insert({
    nome_canonico: nomeOriginal || 'Fornecedor sem nome',
    cnpj: cnpjLimpo || null,
    apelidos_variantes: nomeOriginal ? [nomeOriginal] : [],
    email_contato: emailDigitado || null,
    nome_canonico_normalizado: nomeNorm
  }).select().single();
  if (error) throw error;
  return novo;
}

async function registrarAlias(id: string, alias: string) {
  if (!alias) return;
  await supabaseAdmin.rpc('append_unique_alias', { fornecedor_id: id, novo_alias: alias });
}
