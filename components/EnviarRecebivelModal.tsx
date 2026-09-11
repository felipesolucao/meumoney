"use client";

import { useEffect, useState } from "react";
import { DetalheRecebivel, linkWhatsApp, mensagemRecebivel } from "../lib/recebiveis";
import PopupCentral from "./PopupCentral";
import { IconChat, IconDocument } from "./Icons";
import { useToast } from "./ToastProvider";

type Contato = { nome: string; telefone: string };
type Cliente = Contato & { id: string };

export default function EnviarRecebivelModal({ detalhe, modo, contato, onContato, onFechar }: {
  detalhe: DetalheRecebivel; modo: "cobranca" | "proposta"; contato: Contato;
  onContato: (contato: Contato) => void; onFechar: () => void;
}) {
  const toast = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [rascunho, setRascunho] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const mensagem = rascunho ?? mensagemRecebivel(detalhe, contato.nome, modo);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/clientes", { signal: controller.signal })
      .then(async (res) => { if (!res.ok) throw new Error(); return res.json(); })
      .then((dados: Cliente[]) => setClientes(dados))
      .catch(() => { if (!controller.signal.aborted) setAviso("Não foi possível carregar os clientes. Você pode informar o contato abaixo."); });
    return () => controller.abort();
  }, []);

  function selecionarCliente(id: string) {
    setClienteId(id);
    const cliente = clientes.find((item) => item.id === id);
    if (cliente) onContato({ nome: cliente.nome, telefone: cliente.telefone || "" });
  }

  async function copiar() {
    try { await navigator.clipboard.writeText(mensagem); toast("Mensagem copiada!"); }
    catch { setErro("Não foi possível copiar. Selecione e copie o texto da mensagem."); }
  }

  function abrirWhatsApp() {
    setErro("");
    try {
      const url = linkWhatsApp(contato.telefone, mensagem);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) { setErro(error instanceof Error ? error.message : "Confira o número de WhatsApp."); }
  }

  return <PopupCentral titulo={modo === "cobranca" ? "Enviar cobrança" : "Enviar proposta de contrato"} onFechar={onFechar}>
    <div className="space-y-4">
      <p className="text-sm text-muted break-words">{detalhe.selecionado.descricao}</p>
      <label className="block text-sm font-semibold">Cliente cadastrado
        <select className="form-input mt-1 w-full" value={clienteId} onChange={(event) => selecionarCliente(event.target.value)}>
          <option value="">Informar contato</option>
          {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>)}
        </select>
      </label>
      {aviso && <p role="status" className="text-sm text-muted">{aviso}</p>}
      <label className="block text-sm font-semibold">Nome do destinatário
        <input className="form-input mt-1 w-full" autoComplete="name" value={contato.nome} onChange={(event) => { setClienteId(""); onContato({ ...contato, nome: event.target.value }); }} placeholder="Nome do cliente" />
      </label>
      <label className="block text-sm font-semibold">WhatsApp
        <input className="form-input mt-1 w-full" type="tel" autoComplete="tel" value={contato.telefone} onChange={(event) => { setClienteId(""); onContato({ ...contato, telefone: event.target.value }); }} placeholder="(11) 99999-9999" aria-describedby="destino-whatsapp" />
      </label>
      <p id="destino-whatsapp" className="text-xs text-muted">Deixe o número em branco para escolher o contato no WhatsApp.</p>
      <label className="block text-sm font-semibold">Mensagem
        <textarea className="form-input mt-1 w-full !min-h-[180px] resize-y text-sm" rows={9} value={mensagem} onChange={(event) => setRascunho(event.target.value)} />
      </label>
      {rascunho !== null && <button type="button" className="text-primary text-sm min-h-[44px]" onClick={() => setRascunho(null)}>Restaurar mensagem com os dados atuais</button>}
      <p className="text-xs text-muted">Revise a mensagem. O envio é confirmado por você no WhatsApp.</p>
      {erro && <p role="alert" className="text-error text-sm">{erro}</p>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={!mensagem.trim()} onClick={copiar} className="btn-outline-sm"><IconDocument size={16} /> Copiar</button>
        <button type="button" disabled={!mensagem.trim()} onClick={abrirWhatsApp} className="btn-primary-sm"><IconChat size={16} /> WhatsApp</button>
      </div>
    </div>
  </PopupCentral>;
}
