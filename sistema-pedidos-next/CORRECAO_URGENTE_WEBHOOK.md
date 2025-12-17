# ⚠️ CORREÇÃO URGENTE - Erro 502 no Webhook

## 🔴 O QUE ESTÁ ERRADO

Seu workflow do n8n está retornando **502 Bad Gateway** porque o webhook **NÃO está configurado para receber arquivos binários (PDFs)**.

---

## ✅ COMO CORRIGIR (30 segundos)

### **Opção 1: Correção Manual (MAIS RÁPIDO)**

1. **Acesse:** https://bemol.app.n8n.cloud

2. **Abra o workflow "Importar PDF com Gemini Vision"**

3. **Clique no primeiro nó:** **"Webhook Receber PDF"**

4. **Role para baixo até encontrar "Options"**

5. **ATIVE a opção:**
   ```
   ☑️ Binary Data
   ```

6. **Clique em "Save"** (canto superior direito)

7. **Certifique-se que o workflow está ATIVO** (toggle verde no canto superior direito)

8. **PRONTO!** Teste novamente.

---

### **Opção 2: Reimportar Workflow Corrigido**

1. **Delete o workflow atual** (3 pontinhos → Delete Workflow)

2. **Import from File** → selecione:
   ```
   n8n-workflow-gemini.json
   ```

3. **Verifique que a credencial "Google Gemini(PaLM) Api account 29" está selecionada**

4. **Ative o workflow** (toggle verde)

---

## 🧪 COMO TESTAR

### No n8n:

1. **Clique em "Test Workflow"**

2. **No nó "Webhook Receber PDF", clique em "Listen for Test Event"**

3. **Mantenha a janela aberta**

### No seu sistema:

1. **Reinicie o servidor:**
   ```bash
   # Ctrl+C no terminal
   npm run dev
   ```

2. **Acesse:** http://localhost:3000/solicitar

3. **Clique em "Importar itens do PDF"**

4. **Selecione:** `ORÇAMENTO 174219.pdf`

5. **Aguarde 10-15 segundos**

### Resultado esperado:

**✅ Browser console (F12):**
```
📤 Enviando para API: { pedidoId: '...', fileName: 'ORÇAMENTO 174219.pdf', ... }
📥 Resultado da importação: { itens: [...], fornecedor: {...} }
```

**✅ Terminal (npm run dev):**
```
✅ PDF processado pelo n8n: {
  "modelo_documento": "ORCAMENTO",
  "fornecedor": { "nome": "CASA INDUSTRIAL", ... },
  "itens": [ ... ]
}
📤 Enviando para o frontend: { ... }
```

**✅ Formulário:**
- Campos preenchidos automaticamente
- Fornecedor extraído
- Itens listados

---

## ❌ SE AINDA DER ERRO

### Erro: "API key not valid"
- Verifique a API key do Gemini
- Acesse: https://aistudio.google.com/app/apikey
- Copie uma nova chave
- Atualize a credencial no n8n

### Erro: "Failed to convert to image"
- Certifique-se que o arquivo é PDF válido
- Tente com PDF menor primeiro

### Erro: Still 502
1. Verifique logs de execução no n8n (Executions)
2. Veja qual nó está falhando
3. Clique no nó com erro e veja o detalhe
4. Me mande o log que eu te ajudo

---

## 🎯 CHECKLIST FINAL

Antes de testar, confirme:

- [ ] **Workflow tem "Binary Data" ATIVADO no webhook**
- [ ] **Workflow está ATIVO** (toggle verde)
- [ ] **Credencial do Gemini está selecionada**
- [ ] **URL do webhook no .env está correta:**
  ```
  N8N_IMPORT_PDF_URL=https://bemol.app.n8n.cloud/webhook/importar-pdf-pedido
  ```
- [ ] **Servidor Next.js está rodando** (`npm run dev`)

---

## 🚀 PRONTO PARA TESTAR!

Após fazer a correção, volte e teste. Se funcionar, você vai ver:

1. **Fornecedor extraído automaticamente**
2. **Todos os itens do PDF listados**
3. **Preços e quantidades preenchidos**
4. **Tudo em português** 🇧🇷

**Me avisa se funcionou!** 🎉
