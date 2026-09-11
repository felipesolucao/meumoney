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
//
// Cada conta também pode ser vinculada a uma Carteira (agrupador — Pessoal,
// Empresa etc., ver components/CarteirasInicio.tsx e model Carteira) direto
// no ContaFormulario abaixo.
//
// NOVO: seção "Cartões de crédito" logo abaixo — criar/editar/excluir vários
// cartões, cada um vinculado a uma Conta desta lista (quem paga a fatura).
// Cada cartão mostra o valor da fatura ATUAL e é um link para o extrato
// completo (/financeiro/cartoes/[id], com histórico por mês). Ver
// lib/cartao.ts para a lógica de fechamento de fatura.
// ============================================================================
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatarMoeda } from "../../../lib/financeiro";
import type { OrigemFinanceira } from "../../../lib/financeiro";
import CardSaldo from "../../../components/CardSaldo";
import BotaoVoltar from "../../../components/BotaoVoltar";
import ReajustarSaldo from "../../../components/ReajustarSaldo";
import ContaFormulario from "../../../components/ContaFormulario";
import CartaoFormulario from "../../../components/CartaoFormulario";
import { useToast } from "../../../components/ToastProvider";
import { IconPlus, IconEdit, IconTrash, IconCreditCard } from "../../../components/Icons";

type Conta = {
  id: string;
  nome: string;
  icone: string;
  saldoInicial: number;
  saldoAtual: number;
  carteiraId?: string | null;
};
type Carteira = { id: string; nome: string };

type Resumo = { contas: Conta[]; totalGeral: number };

type FaturaResumo = {
  valorTotal: string;
  status: "aberta" | "fechada" | "paga";
};

type CartaoCredito = {
  id: string;
  nome: string;
  icone: string;
  bandeira: string | null;
  limite: string | null;
  diaFechamento: number;
  diaVencimento: number;
  origem: OrigemFinanceira;
  contaId: string;
  conta: { id: string; nome: string; icone: string };
  faturaAtual: FaturaResumo | null;
};

export default function ContasPage() {
  const showToast = useToast();
  const [ajustandoConta, setAjustandoConta] = useState<Conta | null>(null);

  // --- Contas/carteiras -----------------------------------------------------
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [carregando, setCarregando] = useState(true);

  // --- Formulário (compartilhado entre "criar nova" e "editar existente") --
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeForm, setNomeForm] = useState("");
  const [iconeForm, setIconeForm] = useState("🏦");
  const [saldoForm, setSaldoForm] = useState("0");
  const [carteiraIdForm, setCarteiraIdForm] = useState("");
  const [carteiras, setCarteiras] = useState<Carteira[]>([]);
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

  useEffect(() => {
    carregarResumo();
    fetch("/api/carteiras").then((r) => r.json()).then((data: Carteira[]) => setCarteiras(data));
  }, []);

  function iniciarCriacao() {
    setEditandoId(null);
    setCriando(true);
    setNomeForm("");
    setIconeForm("🏦");
    setSaldoForm("0");
    setCarteiraIdForm("");
    setErro("");
  }

  function iniciarEdicao(conta: Conta) {
    setCriando(false);
    setEditandoId(conta.id);
    setNomeForm(conta.nome);
    setIconeForm(conta.icone);
    setSaldoForm(String(conta.saldoInicial));
    setCarteiraIdForm(conta.carteiraId || "");
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
      body: JSON.stringify({ nome: nomeForm.trim(), icone: iconeForm, saldoInicial: Number(saldoForm) || 0, carteiraId: carteiraIdForm || null }),
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
      body: JSON.stringify({ nome: nomeForm.trim(), icone: iconeForm, saldoInicial: Number(saldoForm) || 0, carteiraId: carteiraIdForm || null }),
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
      // BUGFIX: res.json() sem tratamento quebrava (silenciosamente, sem
      // toast nenhum) sempre que o erro vinha como página HTML em vez de
      // JSON — ver comentário em app/api/contas/[id]/route.ts.
      const data = await res.json().catch(() => ({}));
      showToast(data.error || "Não foi possível excluir a conta.", "erro");
      return;
    }
    setConfirmarExclusaoId("");
    showToast("Conta excluída.");
    carregarResumo();
  }

  // --- Cartões de crédito (NOVO) --------------------------------------------
  const [cartoes, setCartoes] = useState<CartaoCredito[]>([]);
  const [carregandoCartoes, setCarregandoCartoes] = useState(true);

  const [criandoCartao, setCriandoCartao] = useState(false);
  const [editandoCartaoId, setEditandoCartaoId] = useState<string | null>(null);
  const [nomeCartaoForm, setNomeCartaoForm] = useState("");
  const [iconeCartaoForm, setIconeCartaoForm] = useState("💳");
  const [bandeiraCartaoForm, setBandeiraCartaoForm] = useState("");
  const [limiteCartaoForm, setLimiteCartaoForm] = useState("");
  const [diaFechamentoForm, setDiaFechamentoForm] = useState("1");
  const [diaVencimentoForm, setDiaVencimentoForm] = useState("10");
  const [contaIdCartaoForm, setContaIdCartaoForm] = useState("");
  const [origemCartaoForm, setOrigemCartaoForm] = useState<OrigemFinanceira>("pessoal");
  const [confirmarExclusaoCartaoId, setConfirmarExclusaoCartaoId] = useState("");
  const [salvandoCartao, setSalvandoCartao] = useState(false);
  const [erroCartao, setErroCartao] = useState("");

  function carregarCartoes() {
    setCarregandoCartoes(true);
    fetch("/api/cartoes")
      .then((r) => r.json())
      .then((data: CartaoCredito[]) => {
        setCartoes(data);
        setCarregandoCartoes(false);
      });
  }

  useEffect(carregarCartoes, []);

  function iniciarCriacaoCartao() {
    setEditandoCartaoId(null);
    setCriandoCartao(true);
    setNomeCartaoForm("");
    setIconeCartaoForm("💳");
    setBandeiraCartaoForm("");
    setLimiteCartaoForm("");
    setDiaFechamentoForm("1");
    setDiaVencimentoForm("10");
    setContaIdCartaoForm(resumo?.contas[0]?.id || "");
    setOrigemCartaoForm("pessoal");
    setErroCartao("");
  }

  function iniciarEdicaoCartao(cartao: CartaoCredito) {
    setCriandoCartao(false);
    setEditandoCartaoId(cartao.id);
    setNomeCartaoForm(cartao.nome);
    setIconeCartaoForm(cartao.icone);
    setBandeiraCartaoForm(cartao.bandeira || "");
    setLimiteCartaoForm(cartao.limite || "");
    setDiaFechamentoForm(String(cartao.diaFechamento));
    setDiaVencimentoForm(String(cartao.diaVencimento));
    setContaIdCartaoForm(cartao.contaId);
    setOrigemCartaoForm(cartao.origem);
    setErroCartao("");
  }

  function cancelarFormCartao() {
    setCriandoCartao(false);
    setEditandoCartaoId(null);
    setErroCartao("");
  }

  async function criarCartao() {
    if (!nomeCartaoForm.trim()) return setErroCartao("Dê um nome para o cartão.");
    if (!contaIdCartaoForm) return setErroCartao("Escolha a conta que paga a fatura.");
    setSalvandoCartao(true);
    const res = await fetch("/api/cartoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: nomeCartaoForm.trim(),
        icone: iconeCartaoForm,
        bandeira: bandeiraCartaoForm || undefined,
        limite: limiteCartaoForm ? Number(limiteCartaoForm) : undefined,
        diaFechamento: Number(diaFechamentoForm),
        diaVencimento: Number(diaVencimentoForm),
        contaId: contaIdCartaoForm,
        origem: origemCartaoForm,
      }),
    });
    setSalvandoCartao(false);
    if (!res.ok) {
      const data = await res.json();
      return setErroCartao(data.error || "Não foi possível criar o cartão.");
    }
    setCriandoCartao(false);
    showToast("Cartão cadastrado!");
    carregarCartoes();
  }

  async function salvarEdicaoCartao() {
    if (!editandoCartaoId) return;
    if (!nomeCartaoForm.trim()) return setErroCartao("Dê um nome para o cartão.");
    setSalvandoCartao(true);
    const res = await fetch(`/api/cartoes/${editandoCartaoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: nomeCartaoForm.trim(),
        icone: iconeCartaoForm,
        bandeira: bandeiraCartaoForm || null,
        limite: limiteCartaoForm ? Number(limiteCartaoForm) : null,
        diaFechamento: Number(diaFechamentoForm),
        diaVencimento: Number(diaVencimentoForm),
        contaId: contaIdCartaoForm,
        origem: origemCartaoForm,
      }),
    });
    setSalvandoCartao(false);
    if (!res.ok) {
      const data = await res.json();
      return setErroCartao(data.error || "Não foi possível salvar.");
    }
    setEditandoCartaoId(null);
    showToast("Cartão atualizado!");
    carregarCartoes();
  }

  async function excluirCartao(cartao: CartaoCredito) {
    if (cartao.faturaAtual && Number(cartao.faturaAtual.valorTotal) > 0) {
      const confirma = window.confirm(
        "Este cartão tem uma fatura em aberto com compras ainda não lançadas. Excluir o cartão apaga essas compras (faturas já fechadas/pagas continuam no seu histórico normalmente, como Lançamentos). Continuar?"
      );
      if (!confirma) return;
    }
    setSalvandoCartao(true);
    const res = await fetch(`/api/cartoes/${cartao.id}`, { method: "DELETE" });
    setSalvandoCartao(false);
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || "Não foi possível excluir o cartão.", "erro");
      return;
    }
    setConfirmarExclusaoCartaoId("");
    showToast("Cartão excluído.");
    carregarCartoes();
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
                    <span className="text-sm font-medium text-error">Excluir "{conta.nome}"?</span>
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
                    carteiraIdForm={carteiraIdForm}
                    setCarteiraIdForm={setCarteiraIdForm}
                    carteiras={carteiras}
                    erro={erro}
                    salvando={salvando}
                    onCancelar={cancelarForm}
                    onSalvar={salvarEdicao}
                  />
                ) : (
                  // O card inteiro é um link pro extrato (/financeiro/contas/[id],
                  // mesmo padrão do cartão) — os botões de editar/excluir chamam
                  // preventDefault() pra não disparar a navegação do Link.
                  <Link key={conta.id} href={`/financeiro/contas/${conta.id}`} className="card !py-2.5 flex items-center gap-3">
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
                      <button type="button" onClick={(event) => { event.preventDefault(); setAjustandoConta(conta); }} className="text-primary text-sm font-semibold min-h-[44px]" aria-label={`Reajustar saldo de ${conta.nome}`}>Reajustar saldo</button>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        iniciarEdicao(conta);
                      }}
                      className="icon-btn !w-9 !h-9 text-muted shrink-0"
                      aria-label={`Editar ${conta.nome}`}
                    >
                      <IconEdit size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setConfirmarExclusaoId(conta.id);
                      }}
                      className="icon-btn !w-9 !h-9 text-error shrink-0"
                      aria-label={`Excluir ${conta.nome}`}
                    >
                      <IconTrash size={15} />
                    </button>
                  </Link>
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
            carteiraIdForm={carteiraIdForm}
            setCarteiraIdForm={setCarteiraIdForm}
            carteiras={carteiras}
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

        {/* ==================================================================== */}
        {/* SEÇÃO NOVA: Cartões de crédito                                        */}
        {/* ==================================================================== */}
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-3">CARTÕES DE CRÉDITO</p>

          {carregandoCartoes ? (
            <p className="text-center text-muted text-sm py-6">Carregando...</p>
          ) : (
            <div className="list-gap">
              {cartoes.length === 0 && !criandoCartao && (
                <div className="card text-center text-muted text-sm">Nenhum cartão cadastrado ainda.</div>
              )}

              {cartoes.map((cartao) =>
                confirmarExclusaoCartaoId === cartao.id ? (
                  <div
                    key={cartao.id}
                    className="card !py-3 flex items-center justify-between gap-3"
                    style={{ background: "var(--color-error-subtle)" }}
                  >
                    <span className="text-sm font-medium text-error">Excluir "{cartao.nome}"?</span>
                    <div className="flex gap-2 shrink-0">
                      <button type="button" onClick={() => setConfirmarExclusaoCartaoId("")} className="btn-chip bg-card text-foreground">
                        Cancelar
                      </button>
                      <button type="button" disabled={salvandoCartao} onClick={() => excluirCartao(cartao)} className="btn-chip btn-danger !min-h-0">
                        Excluir
                      </button>
                    </div>
                  </div>
                ) : editandoCartaoId === cartao.id ? (
                  <CartaoFormulario
                    key={cartao.id}
                    nomeForm={nomeCartaoForm}
                    setNomeForm={setNomeCartaoForm}
                    iconeForm={iconeCartaoForm}
                    setIconeForm={setIconeCartaoForm}
                    bandeiraForm={bandeiraCartaoForm}
                    setBandeiraForm={setBandeiraCartaoForm}
                    limiteForm={limiteCartaoForm}
                    setLimiteForm={setLimiteCartaoForm}
                    diaFechamentoForm={diaFechamentoForm}
                    setDiaFechamentoForm={setDiaFechamentoForm}
                    diaVencimentoForm={diaVencimentoForm}
                    setDiaVencimentoForm={setDiaVencimentoForm}
                    contaIdForm={contaIdCartaoForm}
                    setContaIdForm={setContaIdCartaoForm}
                    origemForm={origemCartaoForm}
                    setOrigemForm={setOrigemCartaoForm}
                    contas={resumo?.contas ?? []}
                    erro={erroCartao}
                    salvando={salvandoCartao}
                    onCancelar={cancelarFormCartao}
                    onSalvar={salvarEdicaoCartao}
                  />
                ) : (
                  // O card inteiro é um link pro extrato (/financeiro/cartoes/[id]) —
                  // os botões de editar/excluir chamam preventDefault() pra não
                  // disparar a navegação do Link ao serem clicados.
                  <Link key={cartao.id} href={`/financeiro/cartoes/${cartao.id}`} className="card !py-2.5 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-md bg-primary-subtle flex items-center justify-center text-lg shrink-0">
                      {cartao.icone}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{cartao.nome}</p>
                      <p className="text-xs text-muted truncate">
                        Fecha dia {cartao.diaFechamento} · Vence dia {cartao.diaVencimento} · {cartao.conta.icone} {cartao.conta.nome}
                      </p>
                      <p className="text-sm font-bold mt-0.5" style={{ color: "var(--color-error)" }}>
                        {formatarMoeda(cartao.faturaAtual?.valorTotal ?? 0)}{" "}
                        <span className="text-xs font-normal text-muted">na fatura atual</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        iniciarEdicaoCartao(cartao);
                      }}
                      className="icon-btn !w-9 !h-9 text-muted shrink-0"
                      aria-label={`Editar ${cartao.nome}`}
                    >
                      <IconEdit size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setConfirmarExclusaoCartaoId(cartao.id);
                      }}
                      className="icon-btn !w-9 !h-9 text-error shrink-0"
                      aria-label={`Excluir ${cartao.nome}`}
                    >
                      <IconTrash size={15} />
                    </button>
                  </Link>
                )
              )}
            </div>
          )}

          {criandoCartao ? (
            <div className="mt-3">
              <CartaoFormulario
                nomeForm={nomeCartaoForm}
                setNomeForm={setNomeCartaoForm}
                iconeForm={iconeCartaoForm}
                setIconeForm={setIconeCartaoForm}
                bandeiraForm={bandeiraCartaoForm}
                setBandeiraForm={setBandeiraCartaoForm}
                limiteForm={limiteCartaoForm}
                setLimiteForm={setLimiteCartaoForm}
                diaFechamentoForm={diaFechamentoForm}
                setDiaFechamentoForm={setDiaFechamentoForm}
                diaVencimentoForm={diaVencimentoForm}
                setDiaVencimentoForm={setDiaVencimentoForm}
                contaIdForm={contaIdCartaoForm}
                setContaIdForm={setContaIdCartaoForm}
                origemForm={origemCartaoForm}
                setOrigemForm={setOrigemCartaoForm}
                contas={resumo?.contas ?? []}
                erro={erroCartao}
                salvando={salvandoCartao}
                onCancelar={cancelarFormCartao}
                onSalvar={criarCartao}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={iniciarCriacaoCartao}
              disabled={(resumo?.contas.length ?? 0) === 0}
              className="btn-outline mt-3 flex items-center justify-center gap-2"
            >
              <IconCreditCard size={18} /> Novo cartão
            </button>
          )}
          {(resumo?.contas.length ?? 0) === 0 && (
            <p className="text-xs text-muted mt-2 text-center">Cadastre uma conta/carteira acima antes de criar um cartão.</p>
          )}
        </div>
      </div>
      {ajustandoConta && <ReajustarSaldo conta={ajustandoConta} onFechar={() => setAjustandoConta(null)} onSalvo={() => { setAjustandoConta(null); carregarResumo(); }} />}
    </div>
  );
}
