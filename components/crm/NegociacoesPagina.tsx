'use client';
import { useCallback, useEffect, useState } from 'react';
import CrmTopNav from './CrmTopNav';
import { useRouter } from 'next/navigation';
import NegociacaoFormulario from './NegociacaoFormulario';
import type { DadosNegociacao, Negociacao } from '../../lib/negociacoes';
import { hojeBrasil, moeda, resumoNegociacoes, STATUS, statusNegociacao, statusParcela } from '../../lib/negociacoes';

const data = (v: string) => v ? v.split('-').reverse().join('/') : '—';
const cnpj = (v: string) => v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
export default function NegociacoesPagina({ nomeUsuario }: { nomeUsuario: string }) {
  const router = useRouter();
  const [lista, setLista] = useState<Negociacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [editor, setEditor] = useState<Negociacao | 'novo' | null>(null);
  const [busca, setBusca] = useState(''); const [mes, setMes] = useState('');
  const [tipo, setTipo] = useState(''); const [status, setStatus] = useState('');
  const [hoje, setHoje] = useState(hojeBrasil());
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const carregar = useCallback(async () => {
    setCarregando(true); setErro('');
    try {
      const resposta = await fetch('/api/crm/negociacoes', { cache: 'no-store' });
      if (!resposta.ok) throw new Error('Não foi possível carregar as negociações. Tente atualizar a lista.');
      setLista(await resposta.json());
    } catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao carregar.'); }
    finally { setCarregando(false); }
  }, []);
  useEffect(() => { void carregar(); const timer = window.setInterval(() => setHoje(hojeBrasil()), 60000); return () => window.clearInterval(timer); }, [carregar]);
  const filtradas = lista.filter(n => (!mes || n.dataNegociacao.startsWith(mes)) && (!tipo || n.tipo === tipo) && (!status || statusNegociacao(n, hoje) === status) && (!busca || n.empresa.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')) || n.cnpj.includes(busca.replace(/\D/g, '') || busca)));
  const resumo = resumoNegociacoes(filtradas);
  async function salvar(dados: DadosNegociacao) {
    const existente = editor && editor !== 'novo' ? editor : null;
    const resposta = await fetch(`/api/crm/negociacoes${existente ? `/${existente.id}` : ''}`, { method: existente ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...dados, versao: existente?.versao }) });
    if (!resposta.ok) { const json = await resposta.json().catch(() => ({})); throw new Error(json.error || 'Não foi possível salvar.'); }
    setEditor(null); setAviso(dados.leadId ? 'Negociação salva e funil atualizado.' : 'Negociação salva.'); router.refresh(); await carregar();
  }
  async function excluir(n: Negociacao) {
    if (!window.confirm(`Excluir a negociação de ${n.empresa} e seus pagamentos? Esta ação não pode ser desfeita.`)) return;
    setExcluindo(n.id); setErro('');
    try {
      const r = await fetch(`/api/crm/negociacoes/${n.id}?versao=${n.versao}`, { method: 'DELETE' });
      if (!r.ok) { const json = await r.json().catch(() => ({})); throw new Error(json.error || 'Não foi possível excluir.'); }
      setAviso('Negociação excluída.'); router.refresh(); await carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao excluir.'); }
    finally { setExcluindo(null); }
  }
  const atraso = filtradas.reduce((s, n) => s + n.parcelas.filter(p => statusParcela(p, hoje) === 'atrasado').reduce((t, p) => t + p.valorCentavos - p.pagoCentavos, 0), 0);
  return <div className="crm-app"><CrmTopNav nomeUsuario={nomeUsuario} /><main className="neg-page">
    <div className="neg-heading"><div><h1>Negociações</h1><p className="crm-hint">Empresas, acordos e recuperação de débitos.</p></div><div className="neg-actions"><button className="crm-btn crm-btn-ghost" disabled={carregando} onClick={() => void carregar()}>Atualizar</button><button className="crm-btn crm-btn-primary" disabled={editor !== null} onClick={() => { setEditor('novo'); setAviso(''); }}>Nova negociação</button></div></div>
    {erro && <p className="crm-error" role="alert">{erro}</p>}{aviso && <p role="status">{aviso}</p>}
    {editor !== null && <NegociacaoFormulario key={editor === 'novo' ? 'novo' : editor.id} inicial={editor === 'novo' ? null : editor} onSalvar={salvar} onFechar={() => setEditor(null)} />}
    <div className="neg-filters">
      <label>Empresa ou CNPJ<input className="crm-input" type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar negociação" /></label>
      <label>Mês da negociação<input className="crm-input" type="month" value={mes} onChange={e => setMes(e.target.value)} /></label>
      <label>Tipo<select className="crm-input" value={tipo} onChange={e => setTipo(e.target.value)}><option value="">Todos</option><option value="avista">À vista</option><option value="parcelada">Parcelada</option></select></label>
      <label>Status<select className="crm-input" value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos</option>{Object.entries(STATUS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>
      <button className="crm-btn crm-btn-ghost" onClick={() => { setBusca(''); setMes(''); setTipo(''); setStatus(''); }}>Limpar filtros</button>
    </div>
    <div className="neg-kpis">{[['Total negociado', moeda(resumo.negociado)], ['Total pago', moeda(resumo.pago)], ['Empresas negociadas', resumo.empresas], ['Parcelas originais recuperadas', resumo.recuperadas]].map(([label, valor]) => <article key={label} className="neg-kpi"><span>{label}</span><strong>{carregando ? '…' : valor}</strong></article>)}</div>
    <p className="crm-hint">Indicadores respeitam os filtros. Empresas contadas por CNPJ. Parcelas originais recuperadas são contabilizadas somente nos acordos quitados.</p>
    <div className="neg-totals"><span>Saldo a receber: <strong>{moeda(resumo.negociado - resumo.pago)}</strong></span><span>Em atraso: <strong>{moeda(atraso)}</strong></span><span>Negociado à vista: <strong>{moeda(filtradas.filter(n => n.tipo === 'avista').reduce((s, n) => s + n.totalCentavos, 0))}</strong></span><span>Negociado parcelado: <strong>{moeda(filtradas.filter(n => n.tipo === 'parcelada').reduce((s, n) => s + n.totalCentavos, 0))}</strong></span></div>
    {carregando ? <p role="status">Carregando negociações…</p> : <><p className="crm-hint">{filtradas.length} negociação(ões)</p><div className="neg-table-scroll"><table className="neg-table"><thead><tr><th>Empresa / CNPJ</th><th>Data da negociação</th><th>Tipo</th><th>Parcelas originais</th><th>Débito original</th><th>Negociado</th><th>Parcelas pagas</th><th>Valor pago</th><th>Saldo</th><th>Próximo vencimento em aberto</th><th>Status</th><th>Ações</th></tr></thead><tbody>
      {filtradas.map(n => { const pago = n.parcelas.reduce((s, p) => s + p.pagoCentavos, 0); const estado = statusNegociacao(n, hoje); const vencimento = n.parcelas.filter(p => p.pagoCentavos < p.valorCentavos && p.vencimento).map(p => p.vencimento).sort()[0]; return <tr key={n.id}>
        <td><strong>{n.empresa}</strong><small>{cnpj(n.cnpj)}</small><small>{n.lead ? `Vinculada: ${n.lead.nome}` : 'Sem vínculo com o funil'}</small></td><td>{data(n.dataNegociacao)}</td><td>{n.tipo === 'avista' ? 'À vista' : `${n.parcelas.length}x`}</td><td>{n.parcelasOriginais}</td><td>{moeda(n.debitoCentavos)}</td><td>{moeda(n.totalCentavos)}</td><td>{n.parcelas.filter(p => p.pagoCentavos === p.valorCentavos).length}/{n.parcelas.length}</td><td>{moeda(pago)}</td><td>{moeda(n.totalCentavos - pago)}</td><td>{data(vencimento)}</td><td><span className={`neg-status ${estado}`}>{STATUS[estado]}</span></td><td><div className="neg-actions"><button className="crm-btn crm-btn-ghost" disabled={editor !== null} onClick={() => { setEditor(n); setAviso(''); document.querySelector('.neg-page')?.scrollTo({ top: 0, behavior: 'smooth' }); }}>Editar / pagamentos</button><button className="crm-btn crm-btn-danger" disabled={editor !== null || excluindo !== null} onClick={() => void excluir(n)}>{excluindo === n.id ? 'Excluindo…' : 'Excluir'}</button></div></td>
      </tr>; })}
    </tbody></table></div>{filtradas.length === 0 && <div className="neg-empty">{lista.length ? 'Nenhuma negociação corresponde aos filtros.' : 'Cadastre sua primeira negociação para acompanhar os pagamentos.'}</div>}</>}
  </main></div>;
}
