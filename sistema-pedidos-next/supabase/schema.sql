-- Tabelas principais
create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text unique not null,
  perfil text check (perfil in ('SOLICITANTE','GESTOR','FINANCEIRO')) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists fornecedores (
  id uuid primary key default gen_random_uuid(),
  nome_canonico text not null,
  nome_canonico_normalizado text,
  cnpj text unique,
  apelidos_variantes jsonb default '[]'::jsonb,
  email_contato text,
  telefone text,
  mesclado_em uuid references fornecedores(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists pedidos (
  id uuid primary key,
  solicitante_id uuid references usuarios(id),
  solicitante_nome text,
  solicitante_email text,
  area_setor text,
  loja_unidade text,
  tipo_pedido text,
  descricao_detalhada text,
  justificativa text,
  prioridade text check (prioridade in ('BAIXA','MEDIA','ALTA','URGENTE')),
  status text check (status in ('PENDENTE_APROVACAO','APROVADO','RECUSADO','EM_COTACAO','ENVIADO_SAP')) default 'PENDENTE_APROVACAO',
  fornecedor_id uuid references fornecedores(id),
  fornecedor_nome_digitado text,
  fornecedor_cnpj text,
  competencia_ano_mes char(7),
  data_criacao timestamptz,
  aprovado_por_id uuid references usuarios(id),
  data_aprovacao timestamptz,
  recusado_por_id uuid references usuarios(id),
  data_recusa timestamptz,
  justificativa_recusa text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists arquivos_comprovantes (
  id uuid primary key,
  pedido_id uuid references pedidos(id) on delete cascade,
  fornecedor_id uuid references fornecedores(id),
  tipo_documento text,
  nome_arquivo_original text,
  storage_key text,
  content_type text,
  tamanho_bytes bigint,
  competencia_ano_mes char(7),
  data_upload timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists historico_status (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid references pedidos(id) on delete cascade,
  status_anterior text,
  status_novo text,
  usuario_responsavel_id uuid references usuarios(id),
  data_hora timestamptz,
  observacao text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Função para adicionar alias único ao fornecedor
create or replace function append_unique_alias(fornecedor_id uuid, novo_alias text)
returns void language plpgsql as $$
begin
  update fornecedores
  set apelidos_variantes = (
    select jsonb_agg(distinct v)
    from jsonb_array_elements(coalesce(apelidos_variantes,'[]'::jsonb) || to_jsonb(novo_alias)) as t(v)
  )
  where id = fornecedor_id;
end;$$;

-- Recomendações de bucket de storage
-- Crie um bucket público restrito no Supabase chamado 'comprovantes'.
-- As chaves devem seguir: comprovantes/{ano}/{mes}/{fornecedor_id}/{pedido_id}/{nome_arquivo}
