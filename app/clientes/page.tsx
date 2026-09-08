// ============================================================================
// PÁGINA: Clientes (lista)
// ----------------------------------------------------------------------------
// Antes era um Server Component que buscava direto no Prisma. Virou Client
// Component (mesmo padrão de app/contratos/page.tsx) porque agora tem
// ordenação interativa (mais recente / mais antigo / maior valor / menor
// valor) sem recarregar a página. O card de cada cliente no mobile continua
// idêntico ao original — só a barra de filtros e o grid desktop são novos.
// ============================================================================
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { iniciais } from "../../lib/calculos";
import Badge, { tomEScore } from "../../components/Badge";
import { IconBell } from "../../components/Icons";

type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  score: string;
  criadoEm: string;
  _count: { contratos: number };
  contratos: { valorTotal: string }[];
};

// Ordenação disponível na barra de filtros — mesma linguagem visual das abas
// de status da tela de Contratos (ver app/contratos/page.tsx).
const ORDENS = [
  { valor: "recente", label: "Mais recente" },
  { valor: "antigo", label: "Mais antigo" },
  { valor: "maior", label: "Maior valor" },
  { valor: "menor", label: "Menor valor" },
] as const;

type Ordenacao = (typeof ORDENS)[number]["valor"];

// Soma o valorTotal de todos os contratos do cliente — é o "valor" usado
// pelos filtros "Maior valor"/"Menor valor" (cliente não tem campo de valor
// próprio, só o total do que ele contratou).
function valorTotalCliente(c: Cliente): number {
  return c.contratos.reduce((soma, ct) => soma + Number(ct.valorTotal || 0), 0);
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("recente");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch("/api/clientes")
      .then((r) => r.json())
      .then((data) => {
        setClientes(data);
        setCarregando(false);
      });
  }, []);

  const ordenados = useMemo(() => {
    const lista = [...clientes];
    lista.sort((a, b) => {
      if (ordenacao === "recente") return new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime();
      if (ordenacao === "antigo") return new Date(a.criadoEm).getTime() - new Date(b.criadoEm).getTime();
      const valorA = valorTotalCliente(a);
      const valorB = valorTotalCliente(b);
      return ordenacao === "maior" ? valorB - valorA : valorA - valorB;
    });
    return lista;
  }, [clientes, ordenacao]);

  return (
    <div>
      <div className="header-gradient flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted text-sm">{clientes.length} cadastrado(s)</p>
        </div>
        <div className="icon-btn text-foreground">
          <IconBell size={19} />
        </div>
      </div>

      <div className="clients-list px-5 mt-5 space-y-3">
        <Link href="/clientes/novo" className="clients-create btn-primary">
          + Novo cliente
        </Link>

        <div className="clients-filters flex gap-2 overflow-x-auto pb-1">
          {ORDENS.map((o) => (
            <button
              key={o.valor}
              onClick={() => setOrdenacao(o.valor)}
              className={`px-4 py-2 rounded-pill text-sm font-semibold whitespace-nowrap ${
                ordenacao === o.valor ? "bg-primary text-white" : "bg-card border border-border text-foreground"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        {carregando && <p className="text-center text-muted text-sm">Carregando...</p>}
        {!carregando && ordenados.length === 0 && (
          <div className="card text-center text-muted text-sm">Nenhum cliente cadastrado ainda.</div>
        )}

        <div className="clients-grid space-y-3">
          {ordenados.map((c) => {
            const { tom, texto } = tomEScore(c.score);
            return (
              <Link key={c.id} href={`/clientes/${c.id}`} className="card flex items-center gap-3 block">
                <div className="avatar">{iniciais(c.nome)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold truncate">{c.nome}</p>
                    <Badge tom={tom}>{texto}</Badge>
                  </div>
                  {c.telefone && <p className="text-sm text-muted">· {c.telefone}</p>}
                  <p className="text-sm text-primary font-semibold">{c._count.contratos} contrato(s)</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
