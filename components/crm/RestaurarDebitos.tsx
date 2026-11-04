'use client';
import { useState } from 'react';
import type { Debito } from '../../lib/crmDebitos';
type Previa = { arquivo: string; token: string; ausentes: { id: string; nome: string }[]; registros: { id: string; nome: string; atual: Debito; anterior: Debito }[] };
function resumo(d: Debito) {
  const valor = d.valorEmAberto == null ? 'Sem valor' : Number(d.valorEmAberto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const data = (s: string | null) => s ? new Date(s).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '—';
  return `${valor} · ${d.quantidadeParcelas ?? '—'} parcelas · ${data(d.parcelaMaisAntiga)} a ${data(d.parcelaMaisRecente)}`;
}
export default function RestaurarDebitos({ id, onAtualizado }: { id: string; onAtualizado: () => void | Promise<void> }) {
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  async function conferir() {
    setOcupado(true); setErro(''); setMensagem(''); setPrevia(null);
    try {
      const r = await fetch(`/api/crm/debitos/${id}?restaurar=1`, { cache: 'no-store' });
      const dados = await r.json();
      if (!r.ok) throw new Error(dados.error || 'Não foi possível conferir.');
      setPrevia(dados);
    } catch (e) { setErro(e instanceof Error ? e.message : 'Falha de conexão.'); }
    finally { setOcupado(false); }
  }
  async function restaurar() {
    if (!previa || previa.ausentes.length || !window.confirm(`Restaurar os débitos de ${previa.registros.length} empresas aos valores anteriores à planilha “${previa.arquivo}”? Isso substitui alterações posteriores em valor em aberto, quantidade de parcelas e datas de vencimento. Os valores atuais serão guardados no histórico. Não remove empresas duplicadas.`)) return;
    setOcupado(true); setErro('');
    try {
      const r = await fetch(`/api/crm/debitos/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acao: 'restaurar', token: previa.token }) });
      const dados = await r.json();
      if (!r.ok) throw new Error(dados.error || 'Não foi possível restaurar.');
      setPrevia(null);
      setMensagem(`${dados.restaurados} empresas tiveram os débitos restaurados. A conferência de empresas duplicadas é uma operação separada.`);
      await onAtualizado();
    } catch (e) { setErro(e instanceof Error ? e.message : 'Falha de conexão. Atualize o histórico para verificar o resultado.'); }
    finally { setOcupado(false); }
  }
  return <details>
    <summary>Restaurar valores anteriores quando o desfazer estiver bloqueado</summary>
    <p>Confira os valores salvos antes desta planilha. A restauração substitui edições posteriores somente nos quatro campos de débito e guarda uma cópia dos valores atuais. Nome, grupo, atendimentos e acordos são preservados.</p>
    <button type="button" className="crm-btn crm-btn-ghost" disabled={ocupado} onClick={conferir}>{ocupado ? 'Aguarde…' : 'Conferir valores anteriores'}</button>
    {erro && <p role="alert" className="crm-error">{erro}</p>}
    {mensagem && <p role="status">{mensagem}</p>}
    {previa && <>
      <p>{previa.registros.length} empresas encontradas · {previa.ausentes.length} ausentes.</p>
      {!!previa.ausentes.length && <p role="alert">Restauração bloqueada: há empresas removidas. Será necessário recuperar esses cadastros de um backup anterior. Nenhum valor será alterado.</p>}
      <div style={{ maxHeight: 300, overflow: 'auto' }}>
        {previa.registros.map(r => <article className="crm-historico-item" key={r.id}><strong>{r.nome}</strong><p>Atual: {resumo(r.atual)}</p><p>Antes da planilha: {resumo(r.anterior)}</p></article>)}
        {previa.ausentes.map(r => <p key={r.id}>Empresa ausente: {r.nome}</p>)}
      </div>
      <button type="button" className="crm-btn crm-btn-danger" disabled={ocupado || !!previa.ausentes.length || !previa.registros.length} onClick={restaurar}>Restaurar débitos anteriores à planilha</button>
    </>}
  </details>;
}
