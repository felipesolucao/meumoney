'use client';
import { useCallback, useEffect, useState } from 'react';
import { percentualNegociado, resumoNegociacoesDiarias } from '../../lib/negociacoesDiarias';
import { negociacoesDoMes } from '../../lib/negociacoesPeriodo';
import ContratoPagamentos from './ContratoPagamentos';
import Link from 'next/link';
import CrmTopNav from './CrmTopNav';
import BotaoCopiar from './BotaoCopiar';
import { useRouter } from 'next/navigation';
import NegociacaoFormulario from './NegociacaoFormulario';
import type { DadosNegociacao, Negociacao } from '../../lib/negociacoes';
import { hojeBrasil, moeda, saldoNegociacao, resumoNegociacoes, STATUS, statusNegociacao, statusParcela } from '../../lib/negociacoes';

import useBoletoTimers from './useBoletoTimers';
import { segundosBoleto, textoTimerBoleto } from '../../lib/boletoTimer';

const data = (v: string) => v ? v.split('-').reverse().join('/') : '—';
const cnpj = (v: string) => v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
export default function NegociacoesPagina({ nomeUsuario }: { nomeUsuario: string }) {
  const router = useRouter();
  const [lista, setLista] = useState<Negociacao[]>([]);
  const { agora, vencidos } = useBoletoTimers(lista);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [editor, setEditor] = useState<Negociacao | 'novo' | null>(null);
  const [contratoAberto, setContratoAberto] = useState<string | null>(null);
  const [busca, setBusca] = useState(''); const [mes, setMes] = useState(() => hojeBrasil().slice(0, 7));
  const [tipo, setTipo] = useState(''); const [status, setStatus] = useState('');
  const [hoje, setHoje] = useState(hojeBrasil());
  const [exportando, setExportando] = useState(false);
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
  const filtradas = negociacoesDoMes(lista, mes).filter(n => (!tipo || n.tipo === tipo) && (!status || statusNegociacao(n, hoje) === status) && (!busca || n.empresa.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')) || n.cnpj.includes(busca.replace(/\D/g, '') || busca)));
  const resumo = resumoNegociacoes(filtradas);
  const diario = resumoNegociacoesDiarias(lista.filter(n => (!tipo || n.tipo === tipo) && (!status || statusNegociacao(n, hoje) === status) && (!busca || n.empresa.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')) || n.cnpj.includes(busca.replace(/\D/g, '') || busca))), mes, hoje);
  async function exportarExcel() {
    setExportando(true); setErro('');
    try {
      const { baixarRelatorioNegociacoes } = await import('../../lib/negociacoesExcel');
      const filtros = [busca && `Empresa/CNPJ: ${busca}`, mes && `Mês dos recebíveis: ${mes}`, tipo && `Tipo: ${tipo === 'avista' ? 'À vista' : 'Parcelada'}`, status && `Status: ${STATUS[status as keyof typeof STATUS]}`].filter(Boolean).join(' · ');
      await baixarRelatorioNegociacoes(filtradas, { hoje, mes, filtros });
      setAviso('Relatório Excel gerado com as negociações filtradas, uma linha por parcela.');
    } catch { setErro('Não foi possível gerar o Excel. Tente novamente.'); }
    finally { setExportando(false); }
  }
  async function salvar(dados: DadosNegociacao) {
    const existente = editor && editor !== 'novo' ? editor : null;
    const resposta = await fetch(`/api/crm/negociacoes${existente ? `/${existente.id}` : ''}`, { method: existente ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...dados, versao: existente?.versao }) });
    if (!resposta.ok) { const json = await resposta.json().catch(() => ({})); throw new Error(json.error || 'Não foi possível salvar.'); }
    setEditor(null); setAviso(dados.leadId ? 'Negociação salva e funil atualizado.' : 'Negociação salva.'); router.refresh(); await carregar();
  }
  async function excluir(n: Negociacao) {
    if (!window.confirm(`Excluir a negociação de ${n.empresa} e seus pagamentos? Esta ação não pode ser desfeita.`)) return;
    const r = await fetch(`/api/crm/negociacoes/${n.id}?versao=${n.versao}`, { method: 'DELETE' });
    if (!r.ok) { const json = await r.json().catch(() => ({})); throw new Error(json.error || 'Não foi possível excluir.'); }
    setEditor(null); setAviso('Negociação excluída.'); router.refresh(); await carregar();
  }
  const atraso = filtradas.reduce((s, n) => s + n.parcelas.filter(p => statusParcela(p, hoje) === 'atrasado').reduce((t, p) => t + p.valorCentavos - p.pagoCentavos, 0), 0);
  return <div className="crm-app"><CrmTopNav nomeUsuario={nomeUsuario} /><main className="neg-page">
    <div className="neg-heading"><div><h1>Negociações</h1><p className="crm-hint">Empresas, contratos e acordos com pagamentos integrados ao funil.</p></div><div className="neg-actions"><button className="crm-btn crm-btn-ghost" disabled={carregando || exportando || filtradas.length === 0} onClick={() => void exportarExcel()}>{exportando ? 'Gerando Excel…' : 'Exportar Excel'}</button><button className="crm-btn crm-btn-ghost" disabled={carregando} onClick={() => void carregar()}>Atualizar</button><button className="crm-btn crm-btn-primary" disabled={editor !== null} onClick={() => { setEditor('novo'); setAviso(''); }}>Nova negociação</button></div></div>
    {erro && <p className="crm-error" role="alert">{erro}</p>}{aviso && <p role="status">{aviso}</p>}
    {vencidos.length > 0 && <div className="neg-boleto-alerta" role="alert"><strong>Hora de enviar o boleto</strong><ul>{vencidos.map(n => <li key={n.id}>{n.empresa} — prazo encerrado. <button className="crm-btn crm-btn-ghost" disabled={editor !== null} onClick={() => setEditor(n)}>Registrar envio</button></li>)}</ul></div>}
    {contratoAberto && <ContratoPagamentos key={contratoAberto} contratoId={contratoAberto} onFechar={() => setContratoAberto(null)} onAtualizar={carregar} />}
    {editor !== null && <NegociacaoFormulario key={editor === 'novo' ? 'novo' : editor.id} inicial={editor === 'novo' ? null : editor} onSalvar={salvar} onExcluir={editor === 'novo' ? undefined : () => excluir(editor)} onFechar={() => setEditor(null)} />}
    <div className="neg-filters">
      <label>Empresa ou CPF/CNPJ<input className="crm-input" type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar negociação" /></label>
      <label>Mês de referência<input className="crm-input" type="month" value={mes} required onChange={e => setMes(e.target.value || hojeBrasil().slice(0, 7))} /></label>
      <label>Tipo<select className="crm-input" value={tipo} onChange={e => setTipo(e.target.value)}><option value="">Todos</option><option value="avista">À vista</option><option value="parcelada">Parcelada</option></select></label>
      <label>Status<select className="crm-input" value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos</option>{Object.entries(STATUS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label>
      <button className="crm-btn crm-btn-ghost" onClick={() => { setBusca(''); setMes(hojeBrasil().slice(0, 7)); setTipo(''); setStatus(''); }}>Limpar filtros</button>
    </div>
    <section className="neg-daily" aria-labelledby="neg-daily-title" aria-busy={carregando}>
      <h2 id="neg-daily-title">Resumo diário de negociações · {mes.split('-').reverse().join('/')}</h2>
      <p className="crm-hint">Por data da negociação, com os filtros de empresa, tipo e status do acordo. Empresas únicas por documento ou cadastro; valores completos dos acordos feitos no mês, incluindo parcelas futuras. O saldo a receber considera o principal pendente de cada parcela. Acréscimos recebidos não abatem outras parcelas.</p>
      {carregando ? <p role="status">Carregando resumo diário…</p> : <>
        <div className="neg-kpis neg-daily-kpis">
          <article className="neg-kpi"><span>Empresas atendidas no mês</span><strong>{diario.empresas}</strong></article>
          <article className="neg-kpi"><span>Valor negociado</span><strong>{moeda(diario.negociado)}</strong></article>
          {([
            ['Já recebido', diario.pago, 'recebido'],
            ['A receber dos acordos', diario.aReceber, 'a-receber'],
            ['Em atraso', diario.emAtraso, 'atraso'],
          ] as const).map(([label, valor, classe]) => <article key={classe} className={`neg-kpi neg-daily-${classe}`}><span>{label}</span><strong>{moeda(valor)}</strong><small>{percentualNegociado(valor, diario.negociado)} do negociado</small></article>)}
        </div>
        {diario.dias.length ? <div className="neg-table-scroll neg-daily-table" role="region" aria-label="Resumo por dia da negociação" tabIndex={0}>
          <table className="neg-table"><thead><tr><th scope="col">Dia da negociação</th><th scope="col">Empresas atendidas</th><th scope="col">Valor negociado</th><th scope="col" className="neg-daily-recebido">Já recebido · %</th><th scope="col" className="neg-daily-a-receber">A receber · %</th><th scope="col" className="neg-daily-atraso">Em atraso · %</th></tr></thead>
            <tbody>{diario.dias.map(dia => <tr key={dia.data}><th scope="row">{data(dia.data)}</th><td>{dia.empresas}</td><td>{moeda(dia.negociado)}</td><td className="neg-daily-recebido"><strong>{moeda(dia.pago)}</strong><small>{percentualNegociado(dia.pago, dia.negociado)}</small></td><td className="neg-daily-a-receber"><strong>{moeda(dia.aReceber)}</strong><small>{percentualNegociado(dia.aReceber, dia.negociado)}</small></td><td className="neg-daily-atraso"><strong>{moeda(dia.emAtraso)}</strong><small>{percentualNegociado(dia.emAtraso, dia.negociado)}</small></td></tr>)}</tbody>
            <tfoot><tr><th scope="row">Total do mês (empresas únicas)</th><td>{diario.empresas}</td><td>{moeda(diario.negociado)}</td><td className="neg-daily-recebido">{moeda(diario.pago)}<small>{percentualNegociado(diario.pago, diario.negociado)}</small></td><td className="neg-daily-a-receber">{moeda(diario.aReceber)}<small>{percentualNegociado(diario.aReceber, diario.negociado)}</small></td><td className="neg-daily-atraso">{moeda(diario.emAtraso)}<small>{percentualNegociado(diario.emAtraso, diario.negociado)}</small></td></tr></tfoot>
          </table>
        </div> : <p className="neg-empty">Nenhuma negociação feita no mês selecionado corresponde aos filtros.</p>}
        <p className="crm-hint">Percentuais sobre o valor negociado de cada dia ou do mês. Em atraso é a parte do saldo a receber com vencimento anterior a hoje. Acréscimos recebidos podem fazer a soma dos percentuais de recebido e a receber superar 100%. Uma empresa pode aparecer em mais de um dia, mas é contada apenas uma vez no total do mês.</p>
      </>}
    </section>
    <h2>Recebíveis do mês</h2>
    <div className="neg-kpis">{[['Recebíveis do mês', moeda(resumo.negociado)], ['Pago das parcelas do mês', moeda(resumo.pago)], ['Empresas negociadas', resumo.empresas], ['Parcelas do mês', filtradas.reduce((total, n) => total + n.parcelas.length, 0)]].map(([label, valor]) => <article key={label} className="neg-kpi"><span>{label}</span><strong>{carregando ? '…' : valor}</strong></article>)}</div>
    <p className="crm-hint">Exibindo parcelas do mês de {mes.split('-').reverse().join('/')}, inclusive de acordos anteriores. Totais, status e Excel consideram apenas essas parcelas. Parcelas com valor pago entram no mês da data do pagamento; as demais entram no mês do vencimento. Pagamentos parciais também transferem a parcela inteira. Parcelas sem essas datas não entram no filtro mensal.</p>
    <div className="neg-totals"><span>Saldo do mês: <strong>{moeda(filtradas.reduce((s, n) => s + saldoNegociacao(n), 0))}</strong></span><span>Em atraso no mês: <strong>{moeda(atraso)}</strong></span><span>À vista no mês: <strong>{moeda(filtradas.filter(n => n.tipo === 'avista').reduce((s, n) => s + n.totalCentavos, 0))}</strong></span><span>Parcelado no mês: <strong>{moeda(filtradas.filter(n => n.tipo === 'parcelada').reduce((s, n) => s + n.totalCentavos, 0))}</strong></span></div>
    {carregando ? <p role="status">Carregando negociações…</p> : <><p className="crm-hint">{filtradas.length} negociação(ões)</p><div className="neg-table-scroll neg-company-list" role="region" aria-label="Empresas negociadas" tabIndex={0}><table className="neg-table"><thead><tr><th>Data da negociação</th><th className="neg-company-cell">Empresa / CNPJ</th><th>Tipo</th><th>Qtd de parcelas</th><th>Valor no mês</th><th>Parcelas do mês</th><th>Pago das parcelas do mês</th><th>Vencimento em aberto no mês</th><th>Status no mês</th><th>Envio do boleto</th><th>Ações</th></tr></thead><tbody>
      {filtradas.map(n => { const segundos = segundosBoleto(n, agora); const pago = n.parcelas.reduce((s, p) => s + p.pagoCentavos, 0); const estado = statusNegociacao(n, hoje); const vencimento = n.parcelas.filter(p => p.pagoCentavos < p.valorCentavos && p.vencimento).map(p => p.vencimento).sort()[0]; return <tr key={n.id}>
        <td>{data(n.dataNegociacao)}</td><td className="neg-company-cell"><div className="neg-company-copy"><strong title={n.empresa}>{n.empresa}</strong><BotaoCopiar valor={n.empresa} rotulo="nome da empresa" /></div><div className="neg-company-copy"><small>{cnpj(n.cnpj) || 'Documento não informado'}</small>{n.cnpj && <BotaoCopiar valor={n.cnpj} rotulo="CPF/CNPJ" />}</div>{n.contratoId && <small>Contrato {n.codigoContrato}</small>}<small className="neg-company-vinculo" title={n.lead ? `Vinculada: ${n.lead.nome}` : 'Sem vínculo com o funil'}>{n.lead ? `Vínculo: ${n.lead.nome}` : 'Sem vínculo'}</small></td><td>{n.tipo === 'avista' ? 'À vista' : 'Parcelada'}</td><td>{n.totalParcelasAcordo}</td><td>{moeda(n.totalCentavos)}</td><td>{n.parcelas.map(p => `${p.numero}/${n.totalParcelasAcordo}`).join(', ')}<small>{n.parcelas.filter(p => p.pagoCentavos >= p.valorCentavos).length} paga(s) no período</small></td><td>{moeda(pago)}</td><td>{data(vencimento)}</td><td><span className={`neg-status ${estado}`}>{STATUS[estado]}</span></td><td>{n.boletoEnviado ? <span className="neg-status pago">Boleto enviado</span> : segundos !== null ? <span className={`neg-status ${segundos === 0 ? 'atrasado' : 'aguardando'}`} aria-label={segundos === 0 ? 'Prazo para envio do boleto encerrado' : `Tempo para enviar o boleto: ${textoTimerBoleto(segundos)}`}>{segundos === 0 ? 'Enviar boleto · prazo encerrado' : `Enviar boleto · ${textoTimerBoleto(segundos)}`}</span> : '—'}</td><td><div className="neg-actions">{n.contratoId ? <><button className="crm-btn crm-btn-primary" onClick={() => { setContratoAberto(n.contratoId ?? null); setEditor(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Pagar parcelas</button><Link className="crm-btn crm-btn-ghost" href={`/contratos/${n.contratoId}`}>Abrir contrato</Link></> : <><button className="crm-btn crm-btn-ghost" disabled={editor !== null} onClick={() => { setContratoAberto(null); setEditor(lista.find(acordo => acordo.id === n.id) ?? null); setAviso(''); }}>Editar / pagamentos</button></>}</div></td>
      </tr>; })}
    </tbody></table></div>{filtradas.length === 0 && <div className="neg-empty">{lista.length ? 'Nenhuma parcela no mês selecionado corresponde aos filtros.' : 'Cadastre sua primeira negociação para acompanhar os pagamentos.'}</div>}</>}
  </main></div>;
}
