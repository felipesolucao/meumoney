"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatarData, formatarMoeda } from "../lib/calculos";
import { MODELOS_COBRANCA, preencherModelo } from "../lib/modelosCobranca";
import { IconChat, IconClose, IconDocument, IconEdit } from "./Icons";
import { useToast } from "./ToastProvider";

type Parcela = { numero: number; valor: string; vencimento: string; status: string };
type ModeloSalvo = { tipo: string; mensagem: string };

export default function EnviarCobrancaModal({ aberto, onFechar, clienteNome, clienteTelefone, parcelas }: { aberto: boolean; onFechar: () => void; clienteNome: string; clienteTelefone: string | null; parcelas: Parcela[] }) {
  const toast = useToast();
  const [modelos, setModelos] = useState<ModeloSalvo[]>([]);
  const proxima = parcelas.find((p) => p.status !== "pago") || parcelas[parcelas.length - 1];
  const tipoInicial = useMemo(() => {
    if (!proxima) return "lembrete_amigavel";
    const dias = diferencaDias(proxima.vencimento);
    return dias < 0 ? "cobranca_atraso" : dias === 0 ? "vence_hoje" : "lembrete_amigavel";
  }, [proxima]);
  const [tipo, setTipo] = useState(tipoInicial);

  useEffect(() => {
    if (!aberto) return;
    setTipo(tipoInicial);
    fetch("/api/modelos-cobranca").then((r) => r.json()).then(setModelos).catch(() => toast("Não foi possível carregar os modelos.", "erro"));
  }, [aberto, tipoInicial, toast]);

  const mensagem = useMemo(() => {
    if (!proxima) return "Não há parcelas para enviar cobrança.";
    const dias = diferencaDias(proxima.vencimento);
    const original = modelos.find((m) => m.tipo === tipo)?.mensagem || MODELOS_COBRANCA.find((m) => m.tipo === tipo)?.mensagem || "";
    const valor = formatarMoeda(proxima.valor);
    return preencherModelo(original, {
      nome: clienteNome.split(" ")[0], nomeCompleto: clienteNome, numero: proxima.numero, totalParcelas: parcelas.length,
      valor, total: valor, acrescimo: "R$ 0,00", vencimento: formatarData(proxima.vencimento), diasAtraso: Math.max(0, -dias),
      diasRestantes: Math.max(0, dias), diasRestantesTexto: dias > 0 ? ` (em ${dias} dia${dias === 1 ? "" : "s"})` : "",
    });
  }, [clienteNome, modelos, parcelas.length, proxima, tipo]);

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
    <section role="dialog" aria-modal="true" aria-labelledby="titulo-enviar-cobranca" className="relative w-full max-w-[430px] rounded-t-xl sm:rounded-xl bg-card shadow-overlay overflow-hidden animate-[slideUp_0.18s_ease-out]">
      <header className="relative border-b border-border px-5 py-4 text-center"><h2 id="titulo-enviar-cobranca" className="font-bold">Enviar cobrança</h2><p className="text-xs text-muted mt-1">Para {clienteNome}</p><button onClick={onFechar} className="absolute right-4 top-3 icon-btn !w-9 !h-9" aria-label="Fechar"><IconClose size={17} /></button></header>
      <div className="p-4 space-y-4">
        <div><p className="text-xs font-semibold tracking-wide text-muted mb-2">MODELO</p><div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">{MODELOS_COBRANCA.map((modelo) => <button key={modelo.tipo} onClick={() => setTipo(modelo.tipo)} className={`chip-toggle !min-h-0 !px-3 !py-2 text-xs ${tipo === modelo.tipo ? "chip-toggle-ativo" : ""}`}>{modelo.icone} {modelo.titulo}</button>)}</div></div>
        <div><div className="flex items-center justify-between mb-2"><p className="text-xs font-semibold tracking-wide text-muted">PRÉ-VISUALIZAÇÃO</p><Link href="/modelos-cobranca" onClick={onFechar} className="flex items-center gap-1 text-xs font-semibold text-primary"><IconEdit size={13} /> Editar modelos</Link></div><div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-background p-3 text-sm leading-6">{mensagem}</div><p className="text-[11px] text-muted mt-1.5">Você pode editar o texto antes de enviar em Modelos de cobrança.</p></div>
      </div>
      <footer className="grid grid-cols-2 gap-2 border-t border-border bg-primary-subtle p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"><button onClick={copiar} className="btn-outline !min-h-0 !py-3 flex items-center justify-center gap-2"><IconDocument size={17} />Copiar</button><button onClick={whatsapp} disabled={!proxima} className="btn-primary !min-h-0 !py-3 flex items-center justify-center gap-2"><IconChat size={17} />WhatsApp</button></footer>
    </section>
  </div>;
}

function diferencaDias(data: string) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const vencimento = new Date(data); vencimento.setHours(0, 0, 0, 0);
  return Math.round((vencimento.getTime() - hoje.getTime()) / 86_400_000);
}
