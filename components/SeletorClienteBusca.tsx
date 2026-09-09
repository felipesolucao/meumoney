// ============================================================================
// COMPONENTE: Seletor de cliente por busca (usado em Novo contrato)
// ----------------------------------------------------------------------------
// Campo de texto que filtra a lista de clientes pelo nome digitado e mostra
// os resultados num dropdown — substitui o antigo <select> simples. Abaixo,
// um link "+ Adicionar cliente" leva para /clientes/novo?voltar=<linkAdicionar>,
// que depois de salvar volta pra cá já com o cliente novo selecionado (ver
// app/clientes/novo/page.tsx).
// ============================================================================
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Cliente = { id: string; nome: string };

export default function SeletorClienteBusca({
  clientes,
  clienteId,
  onSelecionar,
  linkAdicionar,
}: {
  clientes: Cliente[];
  clienteId: string;
  onSelecionar: (id: string) => void;
  linkAdicionar: string;
}) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLDivElement>(null);

  // Sincroniza o texto exibido quando o cliente selecionado muda "de fora"
  // (ex.: voltou de "+ Adicionar cliente" com ?clienteId=<novo id>).
  useEffect(() => {
    const selecionado = clientes.find((c) => c.id === clienteId);
    if (selecionado) setBusca(selecionado.nome);
  }, [clienteId, clientes]);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(evento: MouseEvent) {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  const filtrados = clientes.filter((c) => c.nome.toLowerCase().includes(busca.trim().toLowerCase()));

  return (
    <div className="relative" ref={raiz}>
      <p className="text-xs font-semibold tracking-wide text-muted mb-2">CLIENTE</p>
      <input
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value);
          onSelecionar("");
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        placeholder="Buscar cliente pelo nome..."
        className="form-input w-full"
      />
      {aberto && (
        <div className="cliente-busca-lista">
          {filtrados.length === 0 && <p className="cliente-busca-vazio">Nenhum cliente encontrado</p>}
          {filtrados.map((c) => (
            <button
              key={c.id}
              type="button"
              className="cliente-busca-item"
              onClick={() => {
                onSelecionar(c.id);
                setBusca(c.nome);
                setAberto(false);
              }}
            >
              {c.nome}
            </button>
          ))}
        </div>
      )}
      <Link href={linkAdicionar} className="text-primary text-sm font-semibold mt-2 inline-block">
        + Adicionar cliente
      </Link>
    </div>
  );
}
