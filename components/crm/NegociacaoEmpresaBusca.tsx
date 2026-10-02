'use client';
import { useEffect, useId, useState } from 'react';
import { moeda } from '../../lib/negociacoes';
import type { EmpresaNegociacao } from '../../lib/negociacaoEmpresa';

export default function NegociacaoEmpresaBusca({ valor, onChange, onSelecionar }: {
  valor: string; onChange: (valor: string) => void; onSelecionar: (empresa: EmpresaNegociacao) => void;
}) {
  const id = useId();
  const [aberto, setAberto] = useState(false);
  const [empresas, setEmpresas] = useState<EmpresaNegociacao[]>([]);
  const [ativo, setAtivo] = useState(-1);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  useEffect(() => {
    setEmpresas([]); setAtivo(-1); setErro('');
    if (!aberto || valor.trim().length < 2) { setCarregando(false); return; }
    const controller = new AbortController();
    setCarregando(true);
    const timer = window.setTimeout(async () => {
      try {
        const r = await fetch(`/api/crm/empresas?q=${encodeURIComponent(valor)}`, { signal: controller.signal, cache: 'no-store' });
        if (!r.ok) throw new Error('Não foi possível buscar as empresas. Digite novamente para tentar.');
        const lista: EmpresaNegociacao[] = await r.json();
        if (!controller.signal.aborted) setEmpresas(lista);
      } catch (e) {
        if (!controller.signal.aborted) setErro(e instanceof Error ? e.message : 'Falha na busca.');
      } finally { if (!controller.signal.aborted) setCarregando(false); }
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [valor, aberto]);
  function selecionar(empresa: EmpresaNegociacao) { onSelecionar(empresa); setAberto(false); }
  return <div className="neg-empresa-busca" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setAberto(false); }}>
    <label htmlFor={id}>Empresa</label>
    <input id={id} className="crm-input" required maxLength={200} value={valor} autoComplete="off"
      role="combobox" aria-autocomplete="list" aria-expanded={aberto && valor.trim().length >= 2}
      aria-controls={`${id}-opcoes`} aria-activedescendant={ativo >= 0 && empresas[ativo] ? `${id}-${ativo}` : undefined}
      placeholder="Pesquisar por nome ou CNPJ" onFocus={() => setAberto(true)}
      onChange={e => { onChange(e.target.value); setAberto(true); setAtivo(-1); setEmpresas([]); }}
      onKeyDown={e => {
        if (e.key === 'Escape') { setAberto(false); setAtivo(-1); }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault(); setAberto(true);
          setAtivo(i => empresas.length ? (i + (e.key === 'ArrowDown' ? 1 : -1) + empresas.length) % empresas.length : -1);
        }
        if (e.key === 'Enter' && aberto && ativo >= 0 && empresas[ativo]) { e.preventDefault(); selecionar(empresas[ativo]); }
      }} />
    {aberto && valor.trim().length >= 2 && <div className="neg-empresa-resultados">
      {carregando && <p role="status">Buscando empresas…</p>}
      {erro && <p role="alert">{erro}</p>}
      {!carregando && !erro && empresas.length === 0 && <p role="status">Nenhuma empresa encontrada. Você pode continuar com o cadastro manual.</p>}
      <ul id={`${id}-opcoes`} role="listbox" aria-label="Empresas do funil">
        {empresas.map((empresa, i) => <li key={empresa.id} id={`${id}-${i}`} role="option" aria-selected={ativo === i}
          onMouseDown={e => e.preventDefault()} onClick={() => selecionar(empresa)}>
          <strong>{empresa.nome}</strong><span>{empresa.cnpj || 'Sem CNPJ'}</span>
          <small>{empresa.quantidadeParcelas ?? '—'} parcelas em aberto · {empresa.valorEmAberto == null ? 'Valor não informado' : moeda(Math.round(Number(empresa.valorEmAberto) * 100))}</small>
          {(empresa.telefone || empresa.email) && <small>{[empresa.telefone, empresa.email].filter(Boolean).join(' · ')}</small>}
        </li>)}
      </ul>
      {empresas.length === 20 && <p>Refine a busca para encontrar outras empresas.</p>}
    </div>}
  </div>;
}
