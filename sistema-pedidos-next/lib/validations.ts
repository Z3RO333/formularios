import { z } from 'zod';

// Validação de CNPJ
export const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/;

// Validação de Email
export const emailSchema = z.string().email('Email inválido').optional().nullable();

// Validação de CNPJ
export const cnpjSchema = z.string()
  .regex(cnpjRegex, 'CNPJ inválido. Use formato: 00.000.000/0000-00 ou 14 dígitos')
  .optional()
  .nullable();

// Schema de Status de Pedido
export const pedidoStatusSchema = z.enum(['PENDENTE_APROVACAO', 'APROVADO', 'RECUSADO']);

// Schema de Prioridade
export const prioridadeSchema = z.enum(['BAIXA', 'MEDIA', 'ALTA', 'URGENTE']);

// Schema de Item do Pedido
export const pedidoItemSchema = z.object({
  id: z.string().uuid().optional(),
  descricao_item: z.string()
    .min(3, 'Descrição do item deve ter no mínimo 3 caracteres')
    .max(500, 'Descrição do item deve ter no máximo 500 caracteres')
    .trim(),
  quantidade: z.number()
    .positive('Quantidade deve ser maior que zero')
    .int('Quantidade deve ser um número inteiro')
    .max(999999, 'Quantidade muito grande'),
  unidade: z.string()
    .min(1, 'Unidade é obrigatória')
    .max(50, 'Unidade deve ter no máximo 50 caracteres')
    .trim(),
  fornecedor_item: z.string()
    .max(200, 'Nome do fornecedor deve ter no máximo 200 caracteres')
    .trim()
    .optional()
    .nullable(),
  preco_unitario_estimado: z.number()
    .nonnegative('Preço não pode ser negativo')
    .max(9999999.99, 'Preço muito alto')
    .optional()
    .nullable(),
  observacao: z.string()
    .max(1000, 'Observação deve ter no máximo 1000 caracteres')
    .trim()
    .optional()
    .nullable()
});

// Schema de Pedido (criação)
export const pedidoCreateSchema = z.object({
  area_setor: z.string()
    .min(2, 'Área/Setor deve ter no mínimo 2 caracteres')
    .max(100, 'Área/Setor deve ter no máximo 100 caracteres')
    .trim(),
  loja_unidade: z.string()
    .min(2, 'Loja/Unidade deve ter no mínimo 2 caracteres')
    .max(100, 'Loja/Unidade deve ter no máximo 100 caracteres')
    .trim(),
  tipo_pedido: z.string()
    .min(2, 'Tipo de pedido deve ter no mínimo 2 caracteres')
    .max(50, 'Tipo de pedido deve ter no máximo 50 caracteres')
    .trim(),
  descricao_detalhada: z.string()
    .min(10, 'Descrição detalhada deve ter no mínimo 10 caracteres')
    .max(2000, 'Descrição detalhada deve ter no máximo 2000 caracteres')
    .trim(),
  justificativa: z.string()
    .min(10, 'Justificativa deve ter no mínimo 10 caracteres')
    .max(2000, 'Justificativa deve ter no máximo 2000 caracteres')
    .trim(),
  prioridade: prioridadeSchema,
  fornecedor_nome: z.string()
    .max(200, 'Nome do fornecedor deve ter no máximo 200 caracteres')
    .trim()
    .optional(),
  fornecedor_cnpj: cnpjSchema,
  fornecedor_email: emailSchema,
  itens: z.array(pedidoItemSchema)
    .min(1, 'Pedido deve ter pelo menos um item')
    .max(100, 'Pedido pode ter no máximo 100 itens')
});

// Schema de Aprovação
export const aprovarPedidoSchema = z.object({
  justificativa_aprovacao: z.string()
    .min(5, 'Justificativa deve ter no mínimo 5 caracteres')
    .max(1000, 'Justificativa deve ter no máximo 1000 caracteres')
    .trim()
    .optional()
});

// Schema de Recusa
export const recusarPedidoSchema = z.object({
  justificativa_recusa: z.string()
    .min(10, 'Justificativa de recusa deve ter no mínimo 10 caracteres')
    .max(1000, 'Justificativa de recusa deve ter no máximo 1000 caracteres')
    .trim()
});

// Schema de Fornecedor
export const fornecedorSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(200, 'Nome deve ter no máximo 200 caracteres')
    .trim(),
  cnpj: cnpjSchema,
  email: emailSchema,
  telefone: z.string()
    .regex(/^\(\d{2}\)\s?\d{4,5}-?\d{4}$|^\d{10,11}$/, 'Telefone inválido')
    .optional()
    .nullable(),
  aliases: z.array(z.string()).optional()
});

// Schema de Merge de Fornecedores
export const mergeFornecedoresSchema = z.object({
  idPrincipal: z.string().uuid('ID principal inválido'),
  idsDuplicados: z.array(z.string().uuid('ID de duplicado inválido'))
    .min(1, 'Deve haver pelo menos um ID duplicado para merge')
});

// Schema de Filtros de Pedidos
export const filtrosPedidosSchema = z.object({
  status: pedidoStatusSchema.optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  loja: z.string().max(100).optional(),
  area: z.string().max(100).optional(),
  fornecedorId: z.string().uuid().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional()
});

// Helper para validar e retornar dados parseados
export function validateAndParse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
    throw new Error(`Validação falhou: ${errors}`);
  }
  return result.data;
}

// Export dos tipos inferidos
export type PedidoCreateInput = z.infer<typeof pedidoCreateSchema>;
export type PedidoItemInput = z.infer<typeof pedidoItemSchema>;
export type AprovarPedidoInput = z.infer<typeof aprovarPedidoSchema>;
export type RecusarPedidoInput = z.infer<typeof recusarPedidoSchema>;
export type FornecedorInput = z.infer<typeof fornecedorSchema>;
export type MergeFornecedoresInput = z.infer<typeof mergeFornecedoresSchema>;
export type FiltrosPedidosInput = z.infer<typeof filtrosPedidosSchema>;
