"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Frequencia, TipoEmprestimo, formatarData, formatarMoeda, montarCronograma } from "../lib/calculos";
import { preencherModelo } from "../lib/modelosContrato";
import { IconChat, IconClose, IconDocument, IconEdit } from "./Icons";
import { useToast } from "./ToastProvider";

type Parcela = { numero: number; valor: string | number; vencimento: string };
type ModeloContrato = { id: string; titulo: string; categoria: string; mensagem: string };

const LABEL_FREQ: Record<Frequencia, string> = { diaria: "Diária", semanal: "Semanal", quinzenal: "Quinzenal", mensal: "Mensal" };

export default function EnviarResumoContratoModal({
  aberto,
  onFechar,
  clienteNome,
  clienteTelefone,
  parcelas,
  valorEmprestado,
  tipoEmprestimo,
  jurosAoMes,
  frequencia,
  numeroParcelas,
  valorParcela,
  dataPrimeiraParcela,
  totalReceber,
}: {
  aberto: boolean;
  onFechar: () => void;
  clienteNome: string;
  clienteTelefone: string | null;
  parcelas: Parcela[];
  valorEmprestado: string | number;
  tipoEmprestimo: TipoEmprestimo;
  jurosAoMes: string | number;
  frequencia: Frequencia;
  numeroParcelas: number;
  valorParcela: string | number;
  dataPrimeiraParcela: string;
  totalReceber: string | number;
}) {
  const toast = useToast();
  const [modelos, setModelos] = useState<ModeloContrato[]>([]);
  const [modeloId, setModeloId] = useState<string>("");

  const modelosEmprestimo = useMemo(() => modelos.filter((m) => m.categoria === "emprestimo"), [modelos]);

  useEffect(() => {
    if (!aberto) return;
    fetch("/api/modelos-contrato")
      .then((r) => r.json())
      .then((dados: ModeloContrato[]) => {
        setModelos(dados);
        const emprestimo = dados.filter((m) => m.categoria === "emprestimo");
        if (emprestimo.length) setModeloId((atual) => (emprestimo.some((m) => m.id === atual) ? atual : emprestimo[0].id));
      })
      .catch(() => toast("Não foi possível carregar os modelos.", "erro"));
  }, [aberto, toast]);

  function montarMensagem() {
    const modelo = modelosEmprestimo.find((m) => m.id === modeloId);
    if (!modelo) return "Nenhum modelo de contrato cadastrado.";
    return preencherModelo(modelo.mensagem, {
      nome: clienteNome.split(" ")[0],
      valorContrato: formatarMoeda(valorEmprestado),
      taxaJurosLabel: tipoEmprestimo === "fixo" ? "Fixo" : `${Number(jurosAoMes)}% a.m.`,
      frequencia: LABEL_FREQ[frequencia],
      numeroParcelas,
      valorParcela: formatarMoeda(valorParcela),
      dataInicio: formatarData(dataPrimeiraParcela),
      totalReceber: formatarMoeda(totalReceber),
      cronograma: montarCronograma(parcelas.map((p) => ({ numero: p.numero, valor: p.valor, vencimento: p.vencimento }))),
    });
  }

  const mensagem = useMemo(montarMensagem, [modeloId, modelosEmprestimo, clienteNome, valorEmprestado, tipoEmprestimo, jurosAoMes, frequencia, numeroParcelas, valorParcela, dataPrimeiraParcela, totalReceber, parcelas]);

  async function copiar() {
    try { await navigator.clipboard.writeText(mensagem); toast("Mensagem copiada!"); } catch { toast("Não foi possível copiar a mensagem.", "erro"); }
  }
  function whatsapp() {
    const numero = (clienteTelefone || "").replace(/\D/g, "");
    window.open(`https://wa.me/${numero ? `55${numero}` : ""}?text=${encodeURIComponent(mensagem)}`, "_blank");
  }

  if (!aberto) return null;
  return <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-5">
    <button aria-label="Fechar" className="absolute inset-0 cursor-default" style={{ background: "rgb(var(--shadow-color) / 0.5)" }} onClick={onFechar} />
    <section role="dialog" aria-modal="true" aria-labelledby="titulo-enviar-resumo" className="relative w-full max-w-[430px] rounded-t-xl sm:rounded-xl bg-card shadow-overlay overflow-hidden animate-[slideUp_0.18s_ease-out]">
      <header className="relative border-b border-border px-5 py-4 text-center"><h2 id="titulo-enviar-resumo" className="font-bold">Enviar resumo do contrato</h2><p className="text-xs text-muted mt-1">Para {clienteNome}</p><button onClick={onFechar} className="absolute right-4 top-3 icon-btn !w-9 !h-9" aria-label="Fechar"><IconClose size={17} /></button></header>
      <div className="p-4 space-y-4">
        {modelosEmprestimo.length > 0 && (
          <div><p className="text-xs font-semibold tracking-wide text-muted mb-2">MODELO</p><div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">{modelosEmprestimo.map((modelo) => <button key={modelo.id} onClick={() => setModeloId(modelo.id)} className={`chip-toggle !min-h-0 !px-3 !py-2 text-xs ${modeloId === modelo.id ? "chip-toggle-ativo" : ""}`}>{modelo.titulo}</button>)}</div></div>
        )}
        <div><div className="flex items-center justify-between mb-2"><p className="text-xs font-semibold tracking-wide text-muted">PRÉ-VISUALIZAÇÃO</p><Link href="/modelos-contrato" onClick={onFechar} className="flex items-center gap-1 text-xs font-semibold text-primary"><IconEdit size={13} /> Editar modelos</Link></div><div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-sm leading-6">{mensagem}</div></div>
      </div>
      <footer className="grid grid-cols-2 gap-2 border-t border-border bg-primary-subtle p-4 pb-[calc(1rem+var(--shell-bottom-space))] sm:pb-4"><button onClick={copiar} className="btn-outline cobranca-modal-action"><IconDocument size={17} /> <span>Copiar</span></button><button onClick={whatsapp} disabled={!modelosEmprestimo.length} className="btn-primary cobranca-modal-action"><IconChat size={17} /> <span>WhatsApp</span></button></footer>
    </section>
  </div>;
}
