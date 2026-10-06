"use client";
import { useState } from 'react';
import { formatarDataCrm, formatarMoedaCrm, type EstagioConfigCrm } from '../../lib/crm';
import type { Debito, RelatorioDebitos } from '../../lib/crmDebitos';

type Aba = 'atualizacoes' | 'ausentes' | 'pendencias';
function ResumoDebito({ d }: { d: Debito }) {
  return <>{formatarMoedaCrm(d.valorEmAberto)} · {d.quantidadeParcelas ?? '—'} parcelas<br />
    {formatarDataCrm(d.parcelaMaisAntiga)} a {formatarDataCrm(d.parcelaMaisRecente)}</>;
}
export default function DebitosRelatorio({ relatorio: r, estagios, onRevisar }: {
  relatorio: RelatorioDebitos; estagios: EstagioConfigCrm[]; onRevisar: (id: string) => void;
}) {
  const [aba, setAba] = useState<Aba>('atualizacoes');
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(0);
  const linhas = aba === 'atualizacoes' ? r.atualizacoes.map(a => ({ empresa: a.lead, depois: a.depois, motivo: a.criterio, id: a.lead.id, estagio: a.lead.estagio }))
    : aba === 'ausentes' ? r.ausentes.map(l => ({ empresa: l, depois: null, motivo: 'Verificar negociação ou quitação', id: l.id, estagio: l.estagio }))
    : r.pendencias.map(p => ({ ...p, depois: null, id: '', estagio: '' }));
  const filtradas = linhas.filter(l => [l.empresa.nome, l.empresa.codigo, l.empresa.cnpj].some(v => v.toLowerCase().includes(busca.toLowerCase())));
  const nomeEstagio = (id: string) => estagios.find(e => e.id === id)?.label ?? id;
  function exportar() {
    const cabecalho = ['Código', 'Razão social', 'CNPJ/CPF', 'Grupo', 'Valor anterior/em aberto', 'Parcelas', 'Mais antiga', 'Mais recente', 'Novo valor', 'Novas parcelas', 'Nova mais antiga', 'Nova mais recente', 'Observação'];
    // Protege contra fórmulas ao abrir o CSV no Excel.
    const escapar = (v: unknown) => `"${String(v ?? '').replace(/^[=+@\-\t\r]/, c => "'" + c).replace(/"/g, '""')}"`;
    const dados = linhas.map(l => [l.empresa.codigo, l.empresa.nome, l.empresa.cnpj, nomeEstagio(l.estagio),
      l.empresa.valorEmAberto?.replace('.', ','), l.empresa.quantidadeParcelas, formatarDataCrm(l.empresa.parcelaMaisAntiga), formatarDataCrm(l.empresa.parcelaMaisRecente),
      l.depois?.valorEmAberto?.replace('.', ','), l.depois?.quantidadeParcelas, l.depois ? formatarDataCrm(l.depois.parcelaMaisAntiga) : '', l.depois ? formatarDataCrm(l.depois.parcelaMaisRecente) : '', l.motivo]);
    const url = URL.createObjectURL(new Blob(['\uFEFF' + [cabecalho, ...dados].map(l => l.map(escapar).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `debitos-${aba}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  return <>
    <p>{r.empresas} empresas · {r.linhas} linhas · Aba utilizada: <strong>{r.aba}</strong></p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {(['atualizacoes', 'ausentes', 'pendencias'] as Aba[]).map(a => <button type="button" className={`crm-btn ${aba === a ? 'crm-btn-primary' : 'crm-btn-ghost'}`} key={a} onClick={() => { setAba(a); setPagina(0); setBusca(''); }}>
        {{ atualizacoes: 'Correspondências', ausentes: 'Ausentes da planilha', pendencias: 'Revisar identificação' }[a]} ({r[a].length})
      </button>)}
    </div>
    {aba === 'ausentes' && <p className="crm-hint">Ausência não significa quitação. Abra o cadastro para verificar, reposicionar ou remover. A importação não altera essas empresas. Esta lista retrata o momento da prévia.</p>}
    {aba === 'pendencias' && <p className="crm-hint">Estas empresas não serão atualizadas. Confira os identificadores no cadastro e gere uma nova prévia. Candidatos ambíguos não são classificados como ausentes.</p>}
    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
      <input aria-label="Buscar no relatório" className="crm-input" placeholder="Buscar código, razão social ou CNPJ" value={busca} onChange={e => { setBusca(e.target.value); setPagina(0); }} />
      <button type="button" className="crm-btn crm-btn-ghost" onClick={exportar}>Exportar lista completa</button>
    </div>
    <div className="crm-import-preview" style={{ maxHeight: 360, overflow: 'auto' }}>
      <table><thead><tr><th>Empresa</th><th>{aba === 'atualizacoes' ? 'Antes' : 'Débito registrado/importado'}</th>{aba === 'atualizacoes' && <th>Depois</th>}<th>Conferência</th></tr></thead>
        <tbody>{filtradas.slice(pagina * 30, (pagina + 1) * 30).map((l, i) => <tr key={`${l.id}-${i}`}>
          <td><strong>{l.empresa.nome}</strong><br />Cod: {l.empresa.codigo || '—'} · {l.empresa.cnpj || '—'}<br />{nomeEstagio(l.estagio)}</td>
          <td><ResumoDebito d={l.empresa} /></td>{l.depois && <td><ResumoDebito d={l.depois} /></td>}
          <td>{l.motivo}{l.id && <><br /><button type="button" className="crm-btn crm-btn-ghost" onClick={() => onRevisar(l.id)}>Abrir cadastro</button></>}</td>
        </tr>)}</tbody>
      </table>
      {!filtradas.length && <p>Nenhuma empresa nesta lista.</p>}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
      <button className="crm-btn crm-btn-ghost" disabled={!pagina} onClick={() => setPagina(p => p - 1)}>Anterior</button>
      <span>{filtradas.length} resultados · Página {pagina + 1} de {Math.max(1, Math.ceil(filtradas.length / 30))}</span>
      <button className="crm-btn crm-btn-ghost" disabled={(pagina + 1) * 30 >= filtradas.length} onClick={() => setPagina(p => p + 1)}>Próxima</button>
    </div>
  </>;
}
