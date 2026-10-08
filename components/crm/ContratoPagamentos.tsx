'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ParcelasLista from '../ParcelasLista';

type Contrato = {
  codigo: string; contaDesembolsoId: string | null;
  cliente: { nome: string; telefone: string | null };
  parcelas: { id: string; numero: number; valor: string; valorPago: string | null; vencimento: string; status: string; pagoEm: string | null }[];
};
export default function ContratoPagamentos({ contratoId, onFechar, onAtualizar }: {
  contratoId: string; onFechar: () => void; onAtualizar: () => Promise<void>;
}) {
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [contas, setContas] = useState<{ id: string; nome: string; icone: string }[]>([]);
  const [erro, setErro] = useState('');
  const carregar = useCallback(async () => {
    try {
      setErro('');
      const [c, contasResposta] = await Promise.all([fetch(`/api/contratos/${contratoId}`, { cache: 'no-store' }), fetch('/api/contas', { cache: 'no-store' })]);
      if (!c.ok || !contasResposta.ok) throw new Error('Não foi possível carregar o contrato e as contas.');
      setContrato(await c.json()); setContas(await contasResposta.json());
    } catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao carregar.'); }
  }, [contratoId]);
  useEffect(() => { void carregar(); }, [carregar]);
  return <section className="card space-y-3" aria-label="Pagamentos do contrato">
    <div className="neg-heading"><h2>Parcelas do contrato {contrato?.codigo}</h2><button className="crm-btn crm-btn-ghost" onClick={onFechar}>Fechar parcelas</button></div>
    <p className="crm-hint">Pagamentos e estornos atualizam o contrato e o funil automaticamente.</p>
    <Link className="crm-btn crm-btn-ghost" href={`/contratos/${contratoId}`}>Abrir contrato</Link>
    {erro ? <p role="alert">{erro} <button onClick={() => void carregar()}>Tentar novamente</button></p> : !contrato ? <p role="status">Carregando parcelas…</p> :
      <ParcelasLista parcelas={contrato.parcelas} clienteNome={contrato.cliente.nome} clienteTelefone={contrato.cliente.telefone}
        codigoContrato={contrato.codigo} contas={contas} contaDesembolsoId={contrato.contaDesembolsoId}
        onAtualizar={async () => { await carregar(); await onAtualizar(); }} />}
  </section>;
}
