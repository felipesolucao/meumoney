'use client';
import { useState } from 'react';
import type { DadosNegociacao, Negociacao, ParcelaNegociacao } from '../../lib/negociacoes';
import { centavos, gerarParcelas, hojeBrasil, moeda, STATUS, statusParcela, prepararNegociacaoParaSalvar } from '../../lib/negociacoes';

export default function NegociacaoFormulario({ inicial, onSalvar, onFechar }: { inicial: Negociacao | null; onSalvar: (dados: DadosNegociacao) => Promise<void>; onFechar: () => void }) {
  const [dados, setDados] = useState<DadosNegociacao>(() => inicial ?? { empresa: '', cnpj: '', tipo: 'avista', dataNegociacao: hojeBrasil(), debitoCentavos: 0, totalCentavos: 0, parcelasOriginais: 1, observacoes: '', parcelas: [] });
  const [quantidade, setQuantidade] = useState(inicial?.parcelas.length ?? 1);
  const [primeiro, setPrimeiro] = useState(inicial?.parcelas[0]?.vencimento || hojeBrasil());
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  function campo<K extends keyof DadosNegociacao>(chave: K, valor: DadosNegociacao[K]) { setDados(d => ({ ...d, [chave]: valor })); }
  function parcela(i: number, alteracoes: Partial<ParcelaNegociacao>) { campo('parcelas', dados.parcelas.map((p, j) => j === i ? { ...p, ...alteracoes } : p)); }
  function gerar() {
    if (dados.parcelas.some(p => p.pagoCentavos > 0)) { setErro('O cronograma possui pagamentos. Edite as parcelas existentes para preservá-los.'); return; }
    try { campo('parcelas', gerarParcelas(dados.totalCentavos, dados.tipo === 'avista' ? 1 : quantidade, primeiro)); setErro(''); }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível gerar parcelas.'); }
  }
  async function salvar(e: React.FormEvent) {
    e.preventDefault(); setErro(''); setSalvando(true);
    try { await onSalvar(prepararNegociacaoParaSalvar(dados, quantidade, primeiro)); }
    catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível salvar.'); }
    finally { setSalvando(false); }
  }
  return <section className="neg-editor" aria-label={inicial ? 'Editar negociação' : 'Nova negociação'}>
    <h2>{inicial ? 'Editar negociação e pagamentos' : 'Nova negociação'}</h2>
    <form onSubmit={salvar}>
      <fieldset disabled={salvando}>
        <div className="neg-form-grid">
          <label>Empresa<input className="crm-input" required maxLength={200} value={dados.empresa} onChange={e => campo('empresa', e.target.value)} /></label>
          <label>CNPJ<input className="crm-input" required inputMode="numeric" maxLength={18} value={dados.cnpj} onChange={e => campo('cnpj', e.target.value)} placeholder="00.000.000/0000-00" /></label>
          <label>Data da negociação<input className="crm-input" type="date" required value={dados.dataNegociacao} onChange={e => campo('dataNegociacao', e.target.value)} /></label>
          <label>Tipo<select className="crm-input" value={dados.tipo} onChange={e => { campo('tipo', e.target.value as DadosNegociacao['tipo']); setQuantidade(e.target.value === 'avista' ? 1 : 2); }}><option value="avista">À vista</option><option value="parcelada">Parcelada</option></select></label>
          <label>Débito original em aberto (R$)<input className="crm-input" type="number" min="0.01" max="20000000" step="0.01" required value={dados.debitoCentavos / 100 || ''} onChange={e => campo('debitoCentavos', centavos(e.target.value))} /></label>
          <label>Total negociado (R$)<input className="crm-input" type="number" min="0.01" max="20000000" step="0.01" required value={dados.totalCentavos / 100 || ''} onChange={e => campo('totalCentavos', centavos(e.target.value))} /></label>
          <label>Parcelas originais em aberto<input className="crm-input" type="number" min="1" max="10000" required value={dados.parcelasOriginais} onChange={e => campo('parcelasOriginais', Number(e.target.value))} /></label>
          <label>Parcelar em quantas vezes<input className="crm-input" type="number" min={dados.tipo === 'avista' ? 1 : 2} max="360" disabled={dados.tipo === 'avista'} value={dados.tipo === 'avista' ? 1 : quantidade} onChange={e => setQuantidade(Number(e.target.value))} /></label>
          <label>Primeiro vencimento<input className="crm-input" type="date" value={primeiro} onChange={e => setPrimeiro(e.target.value)} /></label>
        </div>
        <button className="crm-btn crm-btn-ghost" type="button" onClick={gerar}>{dados.parcelas.length ? 'Refazer cronograma mensal' : 'Gerar cronograma mensal'}</button>
        <p className="crm-hint">Se o cronograma estiver vazio, ele será gerado automaticamente ao salvar. Ajuste valores e datas abaixo. Valor pago é o total já recebido da parcela; a data corresponde ao último pagamento. Pago e Em atraso são calculados automaticamente.</p>
        <div className="neg-table-scroll"><table className="neg-table"><thead><tr><th>Parcela</th><th>Valor (R$)</th><th>Vencimento</th><th>Situação</th><th>Total pago (R$)</th><th>Último pagamento</th><th>Status</th><th>Ação</th></tr></thead>
          <tbody>{dados.parcelas.map((p, i) => <tr key={p.numero}>
            <td>{p.numero}/{dados.parcelas.length}</td>
            <td><input aria-label={`Valor parcela ${p.numero}`} className="crm-input" type="number" min="0.01" step="0.01" required value={p.valorCentavos / 100} onChange={e => parcela(i, { valorCentavos: centavos(e.target.value) })} /></td>
            <td><input aria-label={`Vencimento parcela ${p.numero}`} className="crm-input" type="date" value={p.vencimento} onChange={e => parcela(i, { vencimento: e.target.value })} /></td>
            <td><select aria-label={`Situação parcela ${p.numero}`} className="crm-input" value={p.situacao} onChange={e => parcela(i, { situacao: e.target.value as ParcelaNegociacao['situacao'] })}><option value="em_aberto">Em aberto</option><option value="aguardando">Aguardando pagamento</option></select></td>
            <td><input aria-label={`Total pago parcela ${p.numero}`} className="crm-input" type="number" min="0" max={p.valorCentavos / 100} step="0.01" required value={p.pagoCentavos / 100} onChange={e => parcela(i, { pagoCentavos: centavos(e.target.value) })} /></td>
            <td><input aria-label={`Data pagamento parcela ${p.numero}`} className="crm-input" type="date" required={p.pagoCentavos > 0} max={hojeBrasil()} value={p.dataPagamento} onChange={e => parcela(i, { dataPagamento: e.target.value })} /></td>
            <td><span className={`neg-status ${statusParcela(p)}`}>{STATUS[statusParcela(p)]}</span></td>
            <td><button type="button" className="crm-btn crm-btn-ghost" disabled={p.pagoCentavos === p.valorCentavos} onClick={() => parcela(i, { pagoCentavos: p.valorCentavos, dataPagamento: hojeBrasil() })}>Quitar hoje</button></td>
          </tr>)}</tbody></table></div>
        <p className="crm-hint">Cronograma: {dados.parcelas.length} parcela(s) • Soma: {moeda(dados.parcelas.reduce((s, p) => s + p.valorCentavos, 0))}</p>
        <label>Observações<textarea className="crm-input" maxLength={5000} rows={3} value={dados.observacoes} onChange={e => campo('observacoes', e.target.value)} /></label>
        {erro && <p className="crm-error" role="alert">{erro}</p>}
        <div className="neg-actions"><button className="crm-btn crm-btn-primary" type="submit">{salvando ? 'Salvando…' : 'Salvar negociação'}</button><button className="crm-btn crm-btn-ghost" type="button" onClick={onFechar}>Cancelar</button></div>
      </fieldset>
    </form>
  </section>;
}
