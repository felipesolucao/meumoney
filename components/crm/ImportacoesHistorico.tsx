'use client';
import RestaurarDebitos from './RestaurarDebitos';
import { useEffect, useState } from 'react';

type Lote = { id: string; tipo: 'leads' | 'debitos'; arquivo: string; quantidade?: number; criadoEm: string; aplicadoEm: string | null; desfeitoEm: string | null };
type Duplicata = { id: string; nome: string; codigo: string | null; cnpj: string | null; criadoEm: string; atualizadoEm: string; fingerprint: string; bloqueada: boolean; anterior: { id: string; nome: string; criadoEm: string } };
function dataLocal(d: Date) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export default function ImportacoesHistorico({ onAtualizado }: { onAtualizado: () => void | Promise<void> }) {
  const [itens, setItens] = useState<Lote[]>([]);
  const [pagina, setPagina] = useState(0);
  const [temMais, setTemMais] = useState(false);
  const [versao, setVersao] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [inicio, setInicio] = useState(() => dataLocal(new Date(Date.now() - 86400000)));
  const [fim, setFim] = useState(() => dataLocal(new Date()));
  const [duplicatas, setDuplicatas] = useState<Duplicata[] | null>(null);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    setCarregando(true);
    fetch(`/api/crm/importacoes?pagina=${pagina}`, { cache: 'no-store', signal: controller.signal }).then(async r => {
      if (!r.ok) throw new Error('Não foi possível carregar as importações.');
      const dados = await r.json();
      if (controller.signal.aborted) return;
      setItens(prev => pagina === 0 ? dados.itens : [...prev, ...dados.itens]); setTemMais(dados.temMais);
    }).catch(e => { if (!controller.signal.aborted) setErro(e.message); })
      .finally(() => { if (!controller.signal.aborted) setCarregando(false); });
    return () => controller.abort();
  }, [pagina, versao]);
  async function executar(url: string, body: unknown, sucesso: string) {
    setOcupado(true); setErro(''); setMensagem('');
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const dados = await r.json();
      if (!r.ok) throw new Error(dados.error || 'Não foi possível concluir.');
      setMensagem(sucesso); setPagina(0); setVersao(v => v + 1); setDuplicatas(null); setSelecionadas([]); await onAtualizado();
    } catch (e) { setErro(e instanceof Error ? e.message : 'Falha de conexão. Consulte o histórico antes de repetir.'); }
    finally { setOcupado(false); }
  }
  async function consultarDuplicatas() {
    if (!inicio || !fim) { setErro('Informe o início e o fim do intervalo.'); return; }
    setOcupado(true); setErro(''); setMensagem(''); setDuplicatas(null); setSelecionadas([]);
    try {
      const query = new URLSearchParams({ inicio: new Date(inicio).toISOString(), fim: new Date(new Date(fim).getTime() + 59999).toISOString() });
      const r = await fetch(`/api/crm/importacoes/recuperar?${query}`, { cache: 'no-store' });
      const dados = await r.json();
      if (!r.ok) throw new Error(dados.error || 'Não foi possível consultar.');
      setDuplicatas(dados.itens);
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível consultar.'); }
    finally { setOcupado(false); }
  }
  const disponiveis = duplicatas?.filter(d => !d.bloqueada) ?? [];
  return <section className="crm-painel-secao" aria-label="Importações e atualizações de débitos">
    <div className="crm-painel-secao-titulo">Importações e atualizações de débitos</div>
    <p className="crm-hint">Desfazer uma importação remove as empresas criadas naquele envio. Desfazer uma atualização restaura os valores anteriores dos débitos. Alterações posteriores podem impedir a reversão.</p>
    {erro && <div role="alert" className="crm-error">{erro}<button type="button" className="crm-btn crm-btn-ghost" disabled={carregando || ocupado} onClick={() => { setErro(''); setPagina(0); setVersao(v => v + 1); }}>Atualizar histórico</button></div>}
    {mensagem && <p role="status">{mensagem}</p>}
    {itens.map(item => <article className="crm-historico-item" key={`${item.tipo}-${item.id}`}>
      <strong>{item.tipo === 'leads' ? 'Importação de planilha' : 'Atualização de débitos'} — {item.arquivo}</strong>
      <div className="crm-historico-data">{new Date(item.criadoEm).toLocaleString('pt-BR')}{item.quantidade !== undefined && ` · ${item.quantidade} empresas`}</div>
      <p>{item.desfeitoEm ? `Desfeita em ${new Date(item.desfeitoEm).toLocaleString('pt-BR')}` : item.aplicadoEm ? `Aplicada em ${new Date(item.aplicadoEm).toLocaleString('pt-BR')}` : 'Análise — nenhuma atualização aplicada'}</p>
      {item.aplicadoEm && !item.desfeitoEm && <button type="button" className="crm-btn crm-btn-ghost" disabled={ocupado || carregando} onClick={() => {
        const confirmacao = item.tipo === 'leads' ? `Remover as ${item.quantidade} empresas criadas por “${item.arquivo}”? Os cadastros anteriores serão preservados. A exclusão será bloqueada se houver alterações ou registros vinculados posteriores.` : `Restaurar os valores de débito anteriores à atualização “${item.arquivo}”?`;
        if (window.confirm(confirmacao)) void executar(`/api/crm/${item.tipo === 'leads' ? 'importacoes' : 'debitos'}/${item.id}`, { acao: 'desfazer' }, 'Ação desfeita. O quadro foi atualizado.');
      }}>Desfazer {item.tipo === 'leads' ? 'importação' : 'atualização de débitos'}</button>}
      {item.tipo === 'debitos' && item.aplicadoEm && !item.desfeitoEm && <RestaurarDebitos id={item.id} onAtualizado={async () => { setPagina(0); setVersao(v => v + 1); await onAtualizado(); }} />}
    </article>)}
    {carregando && <p>Carregando importações…</p>}
    {!carregando && !itens.length && <p>Nenhuma importação registrada.</p>}
    {temMais && <button type="button" className="crm-btn crm-btn-ghost" disabled={carregando || ocupado} onClick={() => setPagina(p => p + 1)}>Carregar mais importações</button>}
    <details style={{ marginTop: 16 }}>
      <summary style={{ cursor: 'pointer' }}>Recuperar duplicatas de uma importação anterior ao histórico</summary>
      <p>Envios antigos não tinham identificação de lote. Informe quando fez o envio e confira cada empresa antes de remover. A consulta mostra cadastros com nome e código ou documento correspondentes a uma empresa anterior; isso não comprova que foram importados por engano.</p>
      <fieldset disabled={ocupado} style={{ border: 0, padding: 0 }}>
        <label className="crm-label" htmlFor="importacao-inicio">Criadas a partir de (horário local)</label>
        <input id="importacao-inicio" type="datetime-local" value={inicio} onChange={e => { setInicio(e.target.value); setDuplicatas(null); setSelecionadas([]); }} />
        <label className="crm-label" htmlFor="importacao-fim">Até (intervalo máximo de 7 dias)</label>
        <input id="importacao-fim" type="datetime-local" value={fim} onChange={e => { setFim(e.target.value); setDuplicatas(null); setSelecionadas([]); }} />
        <button type="button" className="crm-btn crm-btn-ghost" onClick={consultarDuplicatas}>Consultar possíveis duplicatas</button>
        {duplicatas !== null && <>
          <p>{duplicatas.length} possíveis duplicatas encontradas. Cadastros com atendimentos, negociações ou contratos ficam bloqueados.</p>
          {!!disponiveis.length && <label><input type="checkbox" checked={selecionadas.length === disponiveis.length} onChange={e => setSelecionadas(e.target.checked ? disponiveis.map(d => d.id) : [])} /> Selecionar todas as disponíveis após conferir</label>}
          {duplicatas.map(d => <article className="crm-historico-item" key={d.id}>
            <label><input type="checkbox" disabled={d.bloqueada} checked={selecionadas.includes(d.id)} onChange={e => setSelecionadas(prev => e.target.checked ? [...prev, d.id] : prev.filter(id => id !== d.id))} /> <strong>{d.nome}</strong> · Código: {d.codigo || '—'} · {d.cnpj || 'Sem documento'}</label>
            <p>Remover: criada em {new Date(d.criadoEm).toLocaleString('pt-BR')} · {d.id}</p>
            <p>Preservar: {d.anterior.nome}, criada em {new Date(d.anterior.criadoEm).toLocaleString('pt-BR')} · {d.anterior.id}</p>
            {d.bloqueada && <p>Bloqueada: possui registros vinculados.</p>}
          </article>)}
          <button type="button" className="crm-btn crm-btn-ghost" disabled={!selecionadas.length} onClick={() => {
            if (window.confirm(`Excluir as ${selecionadas.length} empresas selecionadas? Confira os nomes e as datas. Os cadastros anteriores serão preservados.`)) void executar('/api/crm/importacoes/recuperar', { registros: duplicatas.filter(d => selecionadas.includes(d.id)).map(d => ({ id: d.id, atualizadoEm: d.atualizadoEm, fingerprint: d.fingerprint })) }, 'Duplicatas selecionadas removidas. A recuperação foi registrada no histórico.');
          }}>Remover {selecionadas.length} duplicatas selecionadas</button>
        </>}
      </fieldset>
    </details>
  </section>;
}
