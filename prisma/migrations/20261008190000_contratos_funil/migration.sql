ALTER TABLE "contratos" ADD COLUMN "leadId" TEXT;
CREATE INDEX "contratos_usuarioId_leadId_idx" ON "contratos"("usuarioId", "leadId");
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "crm_leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Vínculo por proprietário e CNPJ inequívoco. Sem documento, um lead por cliente.
DO $$
DECLARE cliente RECORD; destino TEXT; candidatos INTEGER; documento TEXT;
BEGIN
  FOR cliente IN SELECT c.* FROM clientes c WHERE EXISTS (SELECT 1 FROM contratos t WHERE t."clienteId" = c.id AND t."usuarioId" = c."usuarioId") LOOP
    documento := regexp_replace(COALESCE(cliente.cpf, ''), '[^0-9]', '', 'g');
    SELECT count(*), min(id) INTO candidatos, destino FROM crm_leads
      WHERE "usuarioId" = cliente."usuarioId" AND length(documento) = 14
        AND regexp_replace(COALESCE(cnpj, ''), '[^0-9]', '', 'g') = documento;
    IF candidatos <> 1 THEN
      destino := 'contrato_cliente_' || cliente.id;
      INSERT INTO crm_leads (id, nome, cnpj, telefone, email, origem, estagio, "usuarioId", "atualizadoEm")
        VALUES (destino, cliente.nome, CASE WHEN length(documento) = 14 THEN documento ELSE NULL END,
          cliente.telefone, cliente.email, 'Contratos', 'aguardando_pagamento', cliente."usuarioId", NOW());
    END IF;
    UPDATE contratos SET "leadId" = destino WHERE "clienteId" = cliente.id AND "usuarioId" = cliente."usuarioId";
  END LOOP;
  -- Considera também acordos já existentes do mesmo lead ao determinar quitação.
  UPDATE crm_leads l SET estagio = CASE WHEN
    NOT EXISTS (SELECT 1 FROM contratos c WHERE c."leadId" = l.id AND
      (NOT EXISTS (SELECT 1 FROM parcelas p WHERE p."contratoId" = c.id) OR EXISTS (SELECT 1 FROM parcelas p WHERE p."contratoId" = c.id AND p.status <> 'pago')))
    AND NOT EXISTS (SELECT 1 FROM negociacoes_crm n WHERE n."leadId" = l.id AND
      (jsonb_array_length(n.parcelas) = 0 OR EXISTS (SELECT 1 FROM jsonb_array_elements(n.parcelas) p WHERE (p->>'pagoCentavos')::numeric < (p->>'valorCentavos')::numeric)))
    THEN 'negociado' ELSE 'aguardando_pagamento' END
  WHERE EXISTS (SELECT 1 FROM contratos c WHERE c."leadId" = l.id);
  UPDATE crm_leads l SET "valorTotalComJuros" = v.total, "valorPago" = v.pago,
    "valorEmAberto" = GREATEST(0, v.total - v.pago), "quantidadeParcelas" = v.abertas
  FROM (SELECT c."leadId", sum(p.valor) AS total,
    sum(COALESCE(p."valorPago", CASE WHEN p.status = 'pago' THEN p.valor ELSE 0 END)) AS pago,
    count(*) FILTER (WHERE p.status <> 'pago') AS abertas
    FROM contratos c JOIN parcelas p ON p."contratoId" = c.id GROUP BY c."leadId") v
  WHERE l.id = v."leadId" AND l.origem = 'Contratos';
END $$;
