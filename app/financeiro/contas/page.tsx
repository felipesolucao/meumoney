// ============================================================================
// PÁGINA: Contas (saldo por conta bancária + editor de contas)
// ----------------------------------------------------------------------------
// Espelha o card "Contas" do app de referência: um hero card com o saldo
// total somado de todas as contas/carteiras, e logo abaixo a lista de cada
// conta com o saldo individual.
//
// Também é o "editor de contas bancárias": dá pra criar, renomear, trocar o
// emoji e AJUSTAR O SALDO de qualquer conta. O campo editado é sempre o
// "saldo inicial" (ver prisma/schema.prisma, model Conta) — o saldo mostrado
// na tela (saldoAtual) é sempre inicial + lançamentos pagos, recalculado no
// servidor (/api/financeiro/contas-resumo), nunca gravado direto. Isso evita
// a conta ficar "descolada" do extrato de lançamentos depois de um ajuste.
// ============================================================================
"use client";

import { useEffect, useState } from "react";
import { formatarMoeda } from "../../../lib/financeiro";
import CardSaldo from "../../../components/CardSaldo";
import BotaoVoltar from "../../../components/BotaoVoltar";
import ContaFormulario from "../../../components/ContaFormulario";
import { useToast } from "../../../components/ToastProvider";
import { IconPlus, IconEdit, IconTrash } from "../../../components/Icons";

type Conta = {
  id: string;
  nome: string;
  icone: string;
  saldoInicial: number;
  saldoAtual: number;
};

type Resumo = { contas: Conta[]; totalGeral: number };

export default function ContasPage() {
  const showToast = useToast();

  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [carregando, setCarregando] = useState(true);

  // --- Formulário (compartilhado entre "criar nova" e "editar existente") --
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeForm, setNomeForm] = useState("");
  const [iconeForm, setIconeForm] = useState("🏦");
  const [saldoForm, setSaldoForm] = useState("0");
  const [confirmarExclusaoId, setConfirmarExclusaoId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  function carregarResumo() {
    setCarregando(true);
    fetch("/api/financeiro/contas-resumo")
      .then((r) => r.json())
      .then((data: Resumo) => {
        setResumo(data);
        setCarregando(false);
      });
  }

  useEffect(carregarResumo, []);

  function iniciarCriacao() {
    setEditandoId(null);
    setCriando(true);
    setNomeForm("");
    setIconeForm("🏦");
    setSaldoForm("0");
    setErro("");
  }

  function iniciarEdicao(conta: Conta) {
    setCriando(false);
    setEditandoId(conta.id);
    setNomeForm(conta.nome);
    setIconeForm(conta.icone);
    setSaldoForm(String(conta.saldoInicial));
    setErro("");
  }

  function cancelarForm() {
    setCriando(false);
    setEditandoId(null);
    setErro("");
  }

  async function criarConta() {
    if (!nomeForm.trim()) return setErro("Dê um nome para a conta.");
    setSalvando(true);
    const res = await fetch("/api/contas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeForm.trim(), icone: iconeForm, saldoInicial: Number(saldoForm) || 0 }),
    });
    setSalvando(false);
    if (!res.ok) {
      const data = await res.json();
      return setErro(data.error || "Não foi possível criar a conta.");
    }
    setCriando(false);
    showToast("Conta criada!");
    carregarResumo();
  }

  async function salvarEdicao() {
    if (!editandoId) return;
    if (!nomeForm.trim()) return setErro("Dê um nome para a conta.");
    setSalvando(true);
    const res = await fetch(`/api/contas/${editandoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeForm.trim(), icone: iconeForm, saldoInicial: Number(saldoForm) || 0 }),
    });
    setSalvando(false);
    if (!res.ok) {
      const data = await res.json();
      return setErro(data.error || "Não foi possível salvar.");
    }
    setEditandoId(null);
    showToast("Conta atualizada!");
    carregarResumo();
  }

  async function excluirConta(id: string) {
    setSalvando(true);
    const res = await fetch(`/api/contas/${id}`, { method: "DELETE" });
    setSalvando(false);
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || "Não foi possível excluir a conta.", "erro");
      return;
    }
    setConfirmarExclusaoId("");
    showToast("Conta excluída.");
    carregarResumo();
  }

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href="/financeiro" />
        <div className="flex-1">
          <h1 className="text-xl font-bold">Contas</h1>
          <p className="text-sm text-muted mt-0.5">Saldo por conta bancária</p>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-5 pb-4">
        {/* --- Hero card: saldo total somado de todas as contas --------------- */}
        <CardSaldo
          label="SALDO TOTAL EM CONTAS"
          valor={carregando ? "R$ —" : formatarMoeda(resumo?.totalGeral ?? 0)}
          corValor={(resumo?.totalGeral ?? 0) >= 0 ? "var(--color-success)" : "var(--color-error)"}
        />

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-3">SUAS CONTAS</p>

          {carregando ? (
            <p className="text-center text-muted text-sm py-6">Carregando...</p>
          ) : (
            <div className="list-gap">
              {(resumo?.contas.length ?? 0) === 0 && !criando && (
                <div className="card text-center text-muted text-sm">Nenhuma conta cadastrada ainda.</div>
              )}

              {resumo?.contas.map((conta) =>
                confirmarExclusaoId === conta.id ? (
                  <div
                    key={conta.id}
                    className="card !py-3 flex items-center justify-between gap-3"
                    style={{ background: "var(--color-error-subtle)" }}
                  >
                    <span className="text-sm font-medium text-error">Excluir “{conta.nome}”?</span>
                    <div className="flex gap-2 shrink-0">
                      <button type="button" onClick={() => setConfirmarExclusaoId("")} className="btn-chip bg-card text-foreground">
                        Cancelar
                      </button>
                      <button type="button" disabled={salvando} onClick={() => excluirConta(conta.id)} className="btn-chip btn-danger !min-h-0">
                        Excluir
                      </button>
                    </div>
                  </div>
                ) : editandoId === conta.id ? (
                  <ContaFormulario
                    key={conta.id}
                    nomeForm={nomeForm}
                    setNomeForm={setNomeForm}
                    iconeForm={iconeForm}
                    setIconeForm={setIconeForm}
                    saldoForm={saldoForm}
                    setSaldoForm={setSaldoForm}
                    erro={erro}
                    salvando={salvando}
                    onCancelar={cancelarForm}
                    onSalvar={salvarEdicao}
                  />
                ) : (
                  <div key={conta.id} className="card !py-2.5 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-md bg-primary-subtle flex items-center justify-center text-lg shrink-0">
                      {conta.icone}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{conta.nome}</p>
                      <p
                        className="text-sm font-bold"
                        style={{ color: conta.saldoAtual >= 0 ? "var(--color-success)" : "var(--color-error)" }}
                      >
                        {formatarMoeda(conta.saldoAtual)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => iniciarEdicao(conta)}
                      className="icon-btn !w-9 !h-9 text-muted shrink-0"
                      aria-label={`Editar ${conta.nome}`}
                    >
                      <IconEdit size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmarExclusaoId(conta.id)}
                      className="icon-btn !w-9 !h-9 text-error shrink-0"
                      aria-label={`Excluir ${conta.nome}`}
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {criando ? (
          <ContaFormulario
            nomeForm={nomeForm}
            setNomeForm={setNomeForm}
            iconeForm={iconeForm}
            setIconeForm={setIconeForm}
            saldoForm={saldoForm}
            setSaldoForm={setSaldoForm}
            erro={erro}
            salvando={salvando}
            onCancelar={cancelarForm}
            onSalvar={criarConta}
          />
        ) : (
          <button type="button" onClick={iniciarCriacao} className="btn-outline flex items-center justify-center gap-2">
            <IconPlus size={18} /> Nova conta
          </button>
        )}
      </div>
    </div>
  );
}
