// ============================================================================
// PÁGINA: Extrato da conta bancária
// ----------------------------------------------------------------------------
// Mesmo padrão da tela de extrato do cartão de crédito
// (app/financeiro/cartoes/[id]) — só que aqui o período é escolhido pelo
// mesmo SeletorData usado na Início (barra "08 de setembro de 2026" +
// atalhos + mini calendário — ver components/SeletorData.tsx), em vez de
// navegar mês a mês, porque o extrato de uma conta mistura três origens
// diferentes (lançamentos, empréstimos concedidos, parcelas recebidas) sem
// uma "competência" fixa como a fatura do cartão tem.
// ============================================================================
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatarMoeda } from "../../../../lib/financeiro";
import BotaoVoltar from "../../../../components/BotaoVoltar";
import SeletorData from "../../../../components/SeletorData";
import CardSaldo from "../../../../components/CardSaldo";

type Movimento = {
  id: string;
  tipo: "receita" | "despesa" | "emprestimo_saida" | "emprestimo_entrada";
  descricao: string;
  subtitulo: string | null;
  valor: number;
  data: string;
  icone: string;
};

type Extrato = {
  conta: { id: string; nome: string; icone: string; saldoAtual: number };
  movimentos: Movimento[];
  totalEntradas: number;
  totalSaidas: number;
};

function formatarISO(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function inicioDoMesAtual() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
}

function fimDoMesAtual() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
}

const ENTRADA = new Set(["receita", "emprestimo_entrada"]);

export default function ExtratoContaPage() {
  const params = useParams<{ id: string }>();
  const [inicio, setInicio] = useState(inicioDoMesAtual);
  const [fim, setFim] = useState(fimDoMesAtual);
  const [extrato, setExtrato] = useState<Extrato | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    setCarregando(true);
    setErro("");
    const de = formatarISO(inicio);
    const ate = formatarISO(fim);
    fetch(`/api/contas/${params.id}/extrato?de=${de}&ate=${ate}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Extrato) => {
        setExtrato(data);
        setCarregando(false);
      })
      .catch(() => {
        setErro("Não foi possível carregar o extrato desta conta.");
        setCarregando(false);
      });
  }, [params.id, inicio, fim]);

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href="/financeiro/contas" />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">
            {extrato ? `${extrato.conta.icone} ${extrato.conta.nome}` : "Conta"}
          </h1>
          <p className="text-sm text-muted mt-0.5">Extrato e movimentações</p>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-4 pb-4">
        <CardSaldo
          label="SALDO ATUAL"
          valor={!extrato ? "R$ —" : formatarMoeda(extrato.conta.saldoAtual)}
          corValor={(extrato?.conta.saldoAtual ?? 0) >= 0 ? "var(--color-success)" : "var(--color-error)"}
        />

        <SeletorData
          inicio={inicio}
          fim={fim}
          onSelecionar={(novoInicio, novoFim) => {
            setInicio(novoInicio);
            setFim(novoFim);
          }}
        />

        <div className="grid grid-cols-2 gap-3">
          <div className="card !py-3">
            <p className="text-xs font-semibold tracking-wide text-muted">ENTRADAS NO PERÍODO</p>
            <p className="text-lg font-bold mt-1" style={{ color: "var(--color-success)" }}>
              {carregando ? "—" : formatarMoeda(extrato?.totalEntradas ?? 0)}
            </p>
          </div>
          <div className="card !py-3">
            <p className="text-xs font-semibold tracking-wide text-muted">SAÍDAS NO PERÍODO</p>
            <p className="text-lg font-bold mt-1" style={{ color: "var(--color-error)" }}>
              {carregando ? "—" : formatarMoeda(extrato?.totalSaidas ?? 0)}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-3">MOVIMENTAÇÕES</p>

          {carregando ? (
            <p className="text-center text-muted text-sm py-6">Carregando...</p>
          ) : erro ? (
            <p role="alert" className="text-error text-sm">{erro}</p>
          ) : extrato && extrato.movimentos.length > 0 ? (
            <div className="space-y-3">
              {extrato.movimentos.map((m) => {
                const entrada = ENTRADA.has(m.tipo);
                return (
                  <div key={m.id} className="card !py-3 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-md bg-background flex items-center justify-center text-lg shrink-0">
                      {m.icone}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{m.descricao}</p>
                      <p className="text-xs text-muted truncate">
                        {[m.subtitulo, new Date(m.data).toLocaleDateString("pt-BR")].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <p className="font-bold shrink-0" style={{ color: entrada ? "var(--color-success)" : "var(--color-error)" }}>
                      {entrada ? "+" : "−"} {formatarMoeda(m.valor)}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card text-center text-muted text-sm">Nenhuma movimentação neste período.</div>
          )}
        </div>
      </div>
    </div>
  );
}
