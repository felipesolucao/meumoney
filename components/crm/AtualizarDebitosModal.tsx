"use client";
import { useEffect, useState } from 'react';
import type { EstagioConfigCrm } from '../../lib/crm';
import type { ImportacaoDebitos } from '../../lib/crmDebitos';
import DebitosRelatorio from './DebitosRelatorio';

type Historico = Omit<ImportacaoDebitos, 'relatorio'>;
export default function AtualizarDebitosModal({ estagios, onFechar, onAtualizado, onRevisar }: {
  estagios: EstagioConfigCrm[]; onFechar: () => void; onAtualizado: () => void; onRevisar: (id: string) => void;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [escopo, setEscopo] = useState(estagios.map(e => e.id));
  const [completa, setCompleta] = useState(false);
  const [registro, setRegistro] = useState<ImportacaoDebitos | null>(null);
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState('');
  useEffect(() => {
    let ativo = true;
    fetch('/api/crm/debitos').then(async r => {
      if (!r.ok) throw new Error('Não foi possível carregar o histórico.');
      const dados = await r.json(); if (ativo) setHistorico(dados);
    }).catch(e => { if (ativo) setErro(e instanceof Error ? e.message : 'Erro ao carregar histórico.'); });
    return () => { ativo = false; };
  }, []);
  async function requisicao(url: string, options?: RequestInit) {
    setErro(''); setMensagem(''); setOcupado(true);
    try {
      const resposta = await fetch(url, options);
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.error || 'Não foi possível concluir.');
      setRegistro(dados);
      setHistorico(prev => [dados, ...prev.filter(h => h.id !== dados.id)].slice(0, 20));
      return true;
    } catch (e) { setErro(e instanceof Error ? e.message : 'Falha de conexão. Consulte o histórico antes de repetir.'); return false; }
    finally { setOcupado(false); }
  }
  async function analisar() {
    if (!arquivo || !completa || !escopo.length) return;
    const form = new FormData(); form.set('arquivo', arquivo); form.set('estagios', JSON.stringify(escopo));
    await requisicao('/api/crm/debitos', { method: 'POST', body: form });
  }
  async function executar(acao: 'aplicar' | 'desfazer') {
    if (!registro) return;
    if (acao === 'desfazer' && !window.confirm('Restaurar os quatro campos de débito aos valores anteriores desta importação?')) return;
    const ok = await requisicao(`/api/crm/debitos/${registro.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao }) });
    if (ok) { onAtualizado(); setMensagem(acao === 'aplicar' ? 'Débitos atualizados. As empresas ausentes continuam disponíveis para revisão.' : 'Valores anteriores restaurados.'); }
  }
  return <div className="crm-modal-overlay">
    <div className="crm-modal" role="dialog" aria-modal="true" aria-labelledby="debitos-titulo" style={{ width: 'min(1100px, 96vw)', maxWidth: 1100 }}>
      <div className="crm-modal-head"><span className="crm-modal-title" id="debitos-titulo">Atualizar débitos por Excel</span>
        <button type="button" className="crm-icon-btn" disabled={ocupado} onClick={onFechar} aria-label="Fechar">✕</button></div>
      <div className="crm-modal-body">
        {erro && <div className="crm-error" role="alert">{erro}</div>}
        {mensagem && <p role="status">{mensagem}</p>}
        <label className="crm-label" htmlFor="debitos-historico">Histórico — últimas 20 análises</label>
        <select id="debitos-historico" className="crm-select" disabled={ocupado} value={registro?.id ?? ''} onChange={e => {
          if (!e.target.value) { setRegistro(null); setMensagem(''); return; }
          void requisicao(`/api/crm/debitos/${e.target.value}`);
        }}><option value="">Nova importação</option>{historico.map(h => <option key={h.id} value={h.id}>
          {new Date(h.criadoEm).toLocaleString('pt-BR')} · {h.arquivo} · {h.desfeitoEm ? 'Desfeita' : h.aplicadoEm ? 'Aplicada' : 'Prévia'}
        </option>)}</select>
        {!registro ? <>
          <p>Importe a listagem completa de débitos em aberto. O sistema atualizará valor, quantidade de parcelas e vencimentos mais antigo e mais recente dos cadastros encontrados.</p>
          <label className="crm-label" htmlFor="debitos-arquivo">Planilha Excel (.xlsx, até 10 MB)</label>
          <input id="debitos-arquivo" type="file" accept=".xlsx" disabled={ocupado} onChange={e => { setArquivo(e.target.files?.[0] ?? null); setCompleta(false); }} />
          <p className="crm-hint">Aceita as abas Detalhe e Resumo do seu modelo. Havendo detalhes, os valores são calculados pelas parcelas, sem somar novamente o resumo. Nenhum novo lead será criado.</p>
          <fieldset disabled={ocupado} style={{ margin: '16px 0', padding: 12 }}><legend>Grupos do funil a comparar e atualizar</legend>
            <label><input type="checkbox" checked={escopo.length === estagios.length} onChange={e => { setEscopo(e.target.checked ? estagios.map(g => g.id) : []); setCompleta(false); }} /> Todos os grupos</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>{estagios.map(g => <label key={g.id}>
              <input type="checkbox" checked={escopo.includes(g.id)} onChange={e => { setEscopo(prev => e.target.checked ? [...prev, g.id] : prev.filter(id => id !== g.id)); setCompleta(false); }} /> {g.label}
            </label>)}</div>
          </fieldset>
          <label><input type="checkbox" checked={completa} disabled={ocupado} onChange={e => setCompleta(e.target.checked)} /> Confirmo que a planilha contém a listagem completa de débitos em aberto para os grupos selecionados.</label>
          <p className="crm-hint">Uma lista parcial gera ausências incorretas. Ausência não significa quitação e não remove nem movimenta empresas automaticamente.</p>
        </> : <>
          <p><strong>{registro.arquivo}</strong> · {registro.desfeitoEm ? 'Atualização desfeita' : registro.aplicadoEm ? 'Atualização aplicada' : 'Prévia — nenhuma alteração aplicada'}</p>
          <p className="crm-hint">Grupos: {registro.relatorio.estagios.map(id => estagios.find(e => e.id === id)?.label ?? id).join(', ')}. Os demais dados e etapas dos cadastros são preservados.</p>
          <DebitosRelatorio key={registro.id} relatorio={registro.relatorio} estagios={estagios} onRevisar={id => { if (!ocupado) onRevisar(id); }} />
        </>}
      </div>
      <div className="crm-modal-footer" style={{ justifyContent: 'flex-end', gap: 8 }}>
        <button className="crm-btn crm-btn-ghost" disabled={ocupado} onClick={onFechar}>Fechar</button>
        {registro && <button className="crm-btn crm-btn-ghost" disabled={ocupado} onClick={() => { setRegistro(null); setMensagem(''); }}>Nova análise</button>}
        {!registro && <button className="crm-btn crm-btn-primary" disabled={ocupado || !arquivo || !completa || !escopo.length} onClick={analisar}>{ocupado ? 'Analisando…' : 'Analisar planilha'}</button>}
        {registro && !registro.aplicadoEm && <button className="crm-btn crm-btn-primary" disabled={ocupado || !registro.relatorio.atualizacoes.length} onClick={() => executar('aplicar')}>
          {ocupado ? 'Atualizando…' : `Confirmar atualização de ${registro.relatorio.atualizacoes.length} empresas`}</button>}
        {registro?.aplicadoEm && !registro.desfeitoEm && <button className="crm-btn crm-btn-ghost" disabled={ocupado} onClick={() => executar('desfazer')}>{ocupado ? 'Restaurando…' : 'Desfazer atualização'}</button>}
      </div>
    </div>
  </div>;
}
