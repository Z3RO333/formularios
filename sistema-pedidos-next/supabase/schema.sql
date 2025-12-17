-- Tabelas principais
create table if not exists usuarios (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique, -- ID do Supabase Auth
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

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE arquivos_comprovantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_status ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS: USUARIOS
-- ============================================================

-- Usuários podem ler seu próprio perfil
CREATE POLICY "usuarios_read_own" ON usuarios
  FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Apenas GESTOR e FINANCEIRO podem ler todos os usuários
CREATE POLICY "usuarios_read_all_admin" ON usuarios
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_user_id = auth.uid()
      AND perfil IN ('GESTOR', 'FINANCEIRO')
    )
  );

-- ============================================================
-- POLÍTICAS: FORNECEDORES
-- ============================================================

-- Todos podem ler fornecedores (para autocomplete)
CREATE POLICY "fornecedores_read_all" ON fornecedores
  FOR SELECT
  USING (true);

-- Apenas GESTOR e FINANCEIRO podem modificar
CREATE POLICY "fornecedores_write_admin" ON fornecedores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_user_id = auth.uid()
      AND perfil IN ('GESTOR', 'FINANCEIRO')
    )
  );

-- ============================================================
-- POLÍTICAS: PEDIDOS
-- ============================================================

-- Solicitantes veem apenas seus próprios pedidos
CREATE POLICY "pedidos_read_own" ON pedidos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = pedidos.solicitante_id
      AND usuarios.auth_user_id = auth.uid()
    )
  );

-- GESTOR e FINANCEIRO veem todos os pedidos
CREATE POLICY "pedidos_read_all_admin" ON pedidos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_user_id = auth.uid()
      AND perfil IN ('GESTOR', 'FINANCEIRO')
    )
  );

-- Solicitantes podem criar pedidos (vinculados a eles)
CREATE POLICY "pedidos_insert_own" ON pedidos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = pedidos.solicitante_id
      AND usuarios.auth_user_id = auth.uid()
    )
  );

-- Solicitantes podem editar apenas pedidos PENDENTES
CREATE POLICY "pedidos_update_own_pending" ON pedidos
  FOR UPDATE
  USING (
    status = 'PENDENTE_APROVACAO'
    AND EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = pedidos.solicitante_id
      AND usuarios.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    status = 'PENDENTE_APROVACAO'
  );

-- GESTOR e FINANCEIRO podem atualizar qualquer pedido
CREATE POLICY "pedidos_update_all_admin" ON pedidos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_user_id = auth.uid()
      AND perfil IN ('GESTOR', 'FINANCEIRO')
    )
  );

-- ============================================================
-- POLÍTICAS: ITENS_PEDIDO
-- ============================================================

-- Herda visibilidade do pedido pai
CREATE POLICY "itens_read_via_pedido" ON itens_pedido
  FOR SELECT
  USING (
    -- Solicitante do pedido
    EXISTS (
      SELECT 1 FROM pedidos p
      JOIN usuarios u ON u.id = p.solicitante_id
      WHERE p.id = itens_pedido.pedido_id
      AND u.auth_user_id = auth.uid()
    )
    OR
    -- Admin
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_user_id = auth.uid()
      AND perfil IN ('GESTOR', 'FINANCEIRO')
    )
  );

-- Pode inserir/atualizar/deletar itens se pode editar o pedido
CREATE POLICY "itens_write_via_pedido" ON itens_pedido
  FOR ALL
  USING (
    -- Solicitante do pedido PENDENTE
    EXISTS (
      SELECT 1 FROM pedidos p
      JOIN usuarios u ON u.id = p.solicitante_id
      WHERE p.id = itens_pedido.pedido_id
      AND p.status = 'PENDENTE_APROVACAO'
      AND u.auth_user_id = auth.uid()
    )
    OR
    -- Admin
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_user_id = auth.uid()
      AND perfil IN ('GESTOR', 'FINANCEIRO')
    )
  );

-- ============================================================
-- POLÍTICAS: ARQUIVOS_COMPROVANTES
-- ============================================================

CREATE POLICY "arquivos_read_via_pedido" ON arquivos_comprovantes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pedidos p
      JOIN usuarios u ON u.id = p.solicitante_id
      WHERE p.id = arquivos_comprovantes.pedido_id
      AND u.auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_user_id = auth.uid()
      AND perfil IN ('GESTOR', 'FINANCEIRO')
    )
  );

CREATE POLICY "arquivos_write_via_pedido" ON arquivos_comprovantes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM pedidos p
      JOIN usuarios u ON u.id = p.solicitante_id
      WHERE p.id = arquivos_comprovantes.pedido_id
      AND p.status = 'PENDENTE_APROVACAO'
      AND u.auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_user_id = auth.uid()
      AND perfil IN ('GESTOR', 'FINANCEIRO')
    )
  );

-- ============================================================
-- POLÍTICAS: HISTORICO_STATUS
-- ============================================================

-- Todos podem ler histórico dos pedidos que podem ver
CREATE POLICY "historico_read_via_pedido" ON historico_status
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pedidos p
      JOIN usuarios u ON u.id = p.solicitante_id
      WHERE p.id = historico_status.pedido_id
      AND u.auth_user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE auth_user_id = auth.uid()
      AND perfil IN ('GESTOR', 'FINANCEIRO')
    )
  );

-- Apenas service-role pode inserir histórico
-- (via pedidosService.ts com service role client)
