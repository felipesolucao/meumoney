// Tipos e conciliação compartilhados; nenhum acesso ao banco neste módulo.
export type Debito = {
  valorEmAberto: string | null;
  quantidadeParcelas: number | null;
  parcelaMaisAntiga: string | null;
  parcelaMaisRecente: string | null;
};
export type EmpresaDebito = { codigo: string; nome: string; cnpj: string } & Debito;
export type LeadDebito = EmpresaDebito & { id: string; estagio: string; atualizadoEm: string };
export type AtualizacaoDebito = { lead: LeadDebito; depois: Debito; criterio: string; duplicados?: LeadDebito[]; atualizadoEmDepois?: string };
export type RelatorioDebitos = {
  aba: string; linhas: number; empresas: number; estagios: string[];
  atualizacoes: AtualizacaoDebito[]; ausentes: LeadDebito[];
  pendencias: { empresa: EmpresaDebito; motivo: string }[];
};
export type ImportacaoDebitos = {
  id: string; arquivo: string; criadoEm: string; aplicadoEm: string | null; desfeitoEm: string | null;
  relatorio: RelatorioDebitos;
};
export const normalizarNome = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
export const normalizarCodigo = (s: string) => s.trim().replace(/^0+(?=\d)/, '').toUpperCase();
export const normalizarDocumento = (s: string) => s.replace(/[.\s/-]/g, '').toUpperCase();
export function somenteDebito(empresa: Debito): Debito {
  return { valorEmAberto: empresa.valorEmAberto, quantidadeParcelas: empresa.quantidadeParcelas,
    parcelaMaisAntiga: empresa.parcelaMaisAntiga, parcelaMaisRecente: empresa.parcelaMaisRecente };
}
export function conciliarDebitos(empresas: EmpresaDebito[], leads: LeadDebito[]) {
  const presentes = new Set<string>();
  const atualizacoes: AtualizacaoDebito[] = [];
  const pendencias: RelatorioDebitos['pendencias'] = [];
  const campos = [ ['codigo', normalizarCodigo], ['cnpj', normalizarDocumento], ['nome', normalizarNome] ] as const;
  const indices = campos.map(([campo, normalizar]) => {
    const indice = new Map<string, LeadDebito[]>();
    for (const lead of leads) {
      const chave = normalizar(lead[campo]);
      if (chave) indice.set(chave, [...(indice.get(chave) ?? []), lead]);
    }
    return indice;
  });
  for (const empresa of empresas) {
    const grupos = campos.map(([campo, normalizar], i) => indices[i].get(normalizar(empresa[campo])) ?? []);
    // Até candidatos ambíguos ficam fora da lista de ausentes: ausência não pode ser inferida de um conflito.
    grupos.flat().forEach(l => presentes.add(l.id));
    const fortes = [...new Map([...grupos[0], ...grupos[1]].map(l => [l.id, l])).values()];
    const candidatos = fortes.length ? fortes : grupos[2];
    // Unifique apenas identidade forte inequívoca e a mesma etapa do funil.
    const compativeis = candidatos.length > 1 && fortes.length > 0 &&
      campos.slice(0, 2).every(([campo, normalizar]) =>
        new Set([empresa, ...candidatos].map(e => normalizar(e[campo])).filter(Boolean)).size <= 1) &&
      new Set(candidatos.map(l => l.estagio)).size === 1;
    const ordenados = [...candidatos].sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm) || a.id.localeCompare(b.id));
    const lead = candidatos.length === 1 || compativeis ? ordenados[0] : undefined;
    const contradicao = lead && campos.slice(0, 2).some(([campo, normalizar]) =>
      empresa[campo] && lead[campo] && normalizar(empresa[campo]) !== normalizar(lead[campo]));
    if (!lead || contradicao) {
      pendencias.push({ empresa, motivo: candidatos.length === 0 ? 'Empresa não localizada no escopo selecionado.' : 'Identificadores conflitantes, correspondência apenas por nome ou duplicatas em etapas diferentes. Revise os cadastros e mantenha a etapa correta antes de analisar novamente.' });
      continue;
    }
    const antiga = empresa.parcelaMaisAntiga ?? lead.parcelaMaisAntiga;
    const recente = empresa.parcelaMaisRecente ?? lead.parcelaMaisRecente;
    if (antiga && recente && antiga > recente) {
      pendencias.push({ empresa, motivo: 'Os vencimentos informados conflitam com os preservados no cadastro. Informe ambos os vencimentos.' });
      continue;
    }
    atualizacoes.push({ lead, duplicados: compativeis ? ordenados.slice(1) : [], depois: { ...somenteDebito(empresa), parcelaMaisAntiga: empresa.parcelaMaisAntiga ?? lead.parcelaMaisAntiga, parcelaMaisRecente: empresa.parcelaMaisRecente ?? lead.parcelaMaisRecente }, criterio: fortes.length ? 'Código / CNPJ ou CPF' : 'Razão social exata' });
  }
  const contagem = new Map<string, number>();
  atualizacoes.forEach(a => [a.lead, ...(a.duplicados ?? [])].forEach(l => contagem.set(l.id, (contagem.get(l.id) ?? 0) + 1)));
  const unicas = atualizacoes.filter(a => {
    if ([a.lead, ...(a.duplicados ?? [])].every(l => contagem.get(l.id) === 1)) return true;
    pendencias.push({ empresa: { ...a.lead, ...a.depois }, motivo: 'Mais de uma empresa da planilha corresponde ao mesmo cadastro.' });
    return false;
  });
  return { atualizacoes: unicas, pendencias, ausentes: leads.filter(l => !presentes.has(l.id)) };
}
