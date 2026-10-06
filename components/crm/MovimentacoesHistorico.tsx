'use client';
import { useEffect, useState } from 'react';
import { CAMPOS_HISTORICO, type AlteracaoCrm } from '../../lib/crmHistorico';
import type { EstagioConfigCrm } from '../../lib/crm';

type Registro = { id: string; tipo: string; criadoEm: string; responsavel: string; alteracoes: AlteracaoCrm[]; lead?: { id: string; nome: string; cnpj: string | null } };
export default function MovimentacoesHistorico({ leadId, estagios, onAbrirLead }: { leadId?: string; estagios: EstagioConfigCrm[]; onAbrirLead?: (id: string) => void }) {
  const [itens, setItens] = useState<Registro[]>([]);
  const [pagina, setPagina] = useState(0);
  const [tentativa, setTentativa] = useState(0);
  const [temMais, setTemMais] = useState(false);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setCarregando(true);
    setErro('');
    fetch(`${leadId ? `/api/crm/leads/${leadId}/historico` : "/api/crm/historico"}?pagina=${pagina}`, { cache: 'no-store', signal: controller.signal })
      .then(async resposta => {
        if (!resposta.ok) throw new Error('Não foi possível carregar as movimentações.');
        const dados = await resposta.json() as { itens: Registro[]; temMais: boolean };
        if (controller.signal.aborted) return;
        setItens(anteriores => pagina === 0 ? dados.itens : [...anteriores, ...dados.itens]);
        setTemMais(dados.temMais);
      })
      .catch(() => { if (!controller.signal.aborted) setErro('Não foi possível carregar as movimentações.'); })
      .finally(() => { if (!controller.signal.aborted) setCarregando(false); });
    return () => controller.abort();
  }, [leadId, pagina, tentativa]);
  function valor(campo: string, conteudo: string | null) {
    if (conteudo === null) return 'Vazio';
    if (campo === 'estagio') return estagios.find(e => e.id === conteudo)?.label ?? conteudo;
    if (/^(data|parcelaMais|alerta)/.test(campo)) return new Date(conteudo).toLocaleString('pt-BR');
    return conteudo;
  }
  return <section className="crm-painel-secao" aria-label="Histórico de movimentações e edições">
    <div className="crm-painel-secao-titulo">Movimentações e edições</div>
    <p className="crm-hint">Alterações registradas a partir da ativação deste histórico.</p>
    {erro && <div role="alert"><p>{erro}</p><button type="button" className="crm-btn crm-btn-ghost" disabled={carregando} onClick={() => setTentativa(t => t + 1)}>Tentar novamente</button></div>}
    <div className="crm-historico-lista" aria-live="polite">
      {itens.map(item => <article className="crm-historico-item" key={item.id}>
        {item.lead && <button type="button" className="crm-alerta-empresa" onClick={() => item.lead && onAbrirLead?.(item.lead.id)}>
          <strong>{item.lead.nome}</strong>
          {item.lead.cnpj && <span>{item.lead.cnpj}</span>}
        </button>}
        <strong>{item.tipo}</strong>
        <div className="crm-historico-data">{new Date(item.criadoEm).toLocaleString('pt-BR')} · {item.responsavel}</div>
        {item.alteracoes.map(a => <div key={a.campo} className="crm-historico-texto" style={{ overflowWrap: 'anywhere' }}>
          <strong>{CAMPOS_HISTORICO[a.campo] ?? a.campo}</strong>
          <div>Antes: {valor(a.campo, a.antes)}</div>
          <div>Depois: {valor(a.campo, a.depois)}</div>
        </div>)}
      </article>)}
      {carregando && <p>Carregando...</p>}
      {!carregando && !erro && !itens.length && <p>Nenhuma alteração registrada ainda.</p>}
    </div>
    {temMais && !erro && <button type="button" className="crm-btn crm-btn-ghost" disabled={carregando} onClick={() => setPagina(p => p + 1)}>Carregar mais</button>}
  </section>;
}
