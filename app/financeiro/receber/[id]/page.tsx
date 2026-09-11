"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DetalheRecebivel } from "../../../../lib/recebiveis";
import RecebivelResumo from "../../../../components/RecebivelResumo";
import LancamentosLista from "../../../../components/LancamentosLista";
import EnviarRecebivelModal from "../../../../components/EnviarRecebivelModal";
import BotaoVoltar from "../../../../components/BotaoVoltar";
import { IconSend, IconDocument, IconEdit, IconHistory } from "../../../../components/Icons";

export default function DetalheRecebivelPage({ params }: { params: { id: string } }) {
  const [detalhe, setDetalhe] = useState<DetalheRecebivel | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [atualizacao, setAtualizacao] = useState(0);
  const [modal, setModal] = useState<"cobranca" | "proposta" | null>(null);
  const [contato, setContato] = useState({ nome: "", telefone: "" });

  useEffect(() => {
    const controller = new AbortController();
    setCarregando(true);
    setErro("");
    setDetalhe(null);
    setModal(null);
    fetch(`/api/recebiveis/${encodeURIComponent(params.id)}`, { signal: controller.signal, cache: "no-store" })
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error || "Não foi possível carregar o recebível."); return data as DetalheRecebivel; })
      .then(setDetalhe)
      .catch((error: unknown) => { if (!controller.signal.aborted) setErro(error instanceof Error ? error.message : "Não foi possível carregar o recebível."); })
      .finally(() => { if (!controller.signal.aborted) setCarregando(false); });
    return () => controller.abort();
  }, [params.id, atualizacao]);

  useEffect(() => { setContato({ nome: "", telefone: "" }); }, [params.id]);
  const atualizar = () => setAtualizacao((valor) => valor + 1);

  return <div>
    <header className="header-gradient flex items-center gap-3"><BotaoVoltar href="/financeiro/receber" /><div className="min-w-0"><h1 className="text-xl font-bold break-words">{detalhe?.selecionado.descricao || "Detalhes do recebível"}</h1><p className="text-sm text-muted">Contas a receber</p></div></header>
    <div className="contract-detail px-5 mt-5 space-y-5 pb-6">
      {carregando && <p role="status" className="text-muted text-center py-6">Carregando recebível...</p>}
      {erro && <div role="alert" className="card space-y-3"><p>{erro}</p><button type="button" className="btn-outline-sm" onClick={atualizar}>Tentar novamente</button><Link href="/financeiro/receber" className="block text-primary">Voltar aos recebíveis</Link></div>}
      {!carregando && detalhe && <>
        <RecebivelResumo detalhe={detalhe} />
        <div className="contract-actions space-y-2.5">
          <button type="button" className="btn-primary-sm w-full" onClick={() => setModal("cobranca")}><IconSend size={16} /> {detalhe.selecionado.status === "pago" ? "Enviar confirmação de recebimento" : "Enviar cobrança"}</button>
          <button type="button" className="btn-outline-sm w-full" onClick={() => setModal("proposta")}><IconDocument size={16} /> Enviar proposta de contrato</button>
          <div className="flex flex-wrap gap-2"><Link href={`/financeiro/${params.id}/editar`} className="btn-outline-sm flex-1"><IconEdit size={14} /> Editar detalhes</Link><Link href={`/historico?entidade=Lancamento&voltar=/financeiro/receber/${params.id}`} className="btn-outline-sm flex-1"><IconHistory size={14} /> Histórico</Link></div>
        </div>
        <section aria-labelledby="recebivel-ocorrencias"><h2 id="recebivel-ocorrencias" className="text-xs font-semibold tracking-wide text-muted mb-3">{detalhe.recorrencia ? "PARCELAS E RECEBIMENTOS" : "RECEBIMENTO"}</h2><LancamentosLista lancamentos={detalhe.ocorrencias} aoAtualizar={atualizar} /></section>
      </>}
    </div>
    {modal && detalhe && <EnviarRecebivelModal detalhe={detalhe} modo={modal} contato={contato} onContato={setContato} onFechar={() => setModal(null)} />}
  </div>;
}
