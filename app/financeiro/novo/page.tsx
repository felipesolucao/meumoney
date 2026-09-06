// ============================================================================
// PÁGINA: Novo lançamento (receita ou despesa)
// ----------------------------------------------------------------------------
// O alternador no topo (Receita/Despesa) muda o tipo do lançamento inteiro,
// inclusive as categorias sugeridas. A seção de recorrência define se é:
//   - Único        -> um lançamento avulso, sem repetição
//   - Fixo/sem fim -> repete indefinidamente (ex: salário, aluguel)
//   - Com data fim -> repete até uma data escolhida
//   - Por parcelas -> repete um número exato de vezes (ex: 12x)
//
// Os campos ficam agrupados em cards ("Valor", "Detalhes", "Repetição",
// "Observações") em vez de uma lista solta de inputs — deixa mais fácil
// escanear a tela e entender o que pertence a cada etapa do lançamento.
// A categoria usa um bottom sheet (SeletorCategoriaModal) que também permite
// criar (com emoji à escolha), renomear e excluir categorias sem sair da tela
// — a mesma tela de gerenciamento completa fica em /financeiro/categorias.
// ============================================================================
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  TipoLancamento,
  OrigemFinanceira,
  PeriodicidadeLancamento,
  TipoFimRecorrencia,
} from "../../../lib/financeiro";
import { LABEL_PERIODICIDADE, LABEL_TIPO_FIM } from "../../../lib/financeiro";
import BotaoVoltar from "../../../components/BotaoVoltar";
import { useToast } from "../../../components/ToastProvider";
import SeletorCategoriaModal from "../../../components/SeletorCategoriaModal";
import {
  IconWallet,
  IconReceipt,
  IconUser,
  IconBuilding,
  IconRepeat,
  IconPlus,
  IconChevronDown,
  IconDocument,
} from "../../../components/Icons";

// Opção extra no seletor do topo — "Empréstimo" não é um Lancamento, é um
// Contrato (outro módulo, com cliente/parcelas/juros). Por isso ela não entra
// no estado "tipo" (que continua só "receita" | "despesa" para o resto do
// formulário) — escolher "Empréstimo" só navega para a tela de novo contrato.
type TipoTransacao = TipoLancamento | "emprestimo";

type Categoria = { id: string; nome: string; icone: string; tipo: TipoLancamento };
type Conta = { id: string; nome: string; icone: string };

function isoHoje(offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return d.toISOString().slice(0, 10);
}

// useSearchParams() só é seguro em build quando o componente que o chama
// fica dentro de um <Suspense> (ver export default no fim do arquivo) —
// por isso toda a lógica da tela mora aqui, e não na exportação padrão.
function NovoLancamentoConteudo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showToast = useToast();
  // Quando a tela é aberta a partir de um mês específico (ver app/financeiro),
  // a data já chega pronta via "?data=aaaa-mm-dd" — inclusive para meses
  // passados ou futuros, sem precisar trocar manualmente depois de abrir.
  const dataInicial = searchParams.get("data") || isoHoje();

  // --- Campos principais ----------------------------------------------------
  const [tipo, setTipo] = useState<TipoLancamento>("receita");
  const [origem, setOrigem] = useState<OrigemFinanceira>("pessoal");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataAtalho, setDataAtalho] = useState<"hoje" | "ontem" | "outros">(
    dataInicial === isoHoje() ? "hoje" : "outros"
  );
  const [dataVencimento, setDataVencimento] = useState(dataInicial);
  const [pago, setPago] = useState(true);
  const [observacoes, setObservacoes] = useState("");

  // --- Categoria e conta ------------------------------------------------------
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState("");
  const [categoriaModalAberta, setCategoriaModalAberta] = useState(false);
  const [contas, setContas] = useState<Conta[]>([]);
  const [contaId, setContaId] = useState("");

  // --- Recorrência ------------------------------------------------------------
  const [recorrente, setRecorrente] = useState(false);
  const [periodicidade, setPeriodicidade] = useState<PeriodicidadeLancamento>("mensal");
  const [tipoFim, setTipoFim] = useState<TipoFimRecorrencia>("sem_fim");
  const [dataFim, setDataFim] = useState(isoHoje(30));
  const [numeroParcelas, setNumeroParcelas] = useState("12");

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const categoriaAtual = categorias.find((c) => c.id === categoriaId);

  // Recarrega as categorias sempre que o tipo (receita/despesa) muda.
  useEffect(() => {
    fetch(`/api/categorias?tipo=${tipo}`)
      .then((r) => r.json())
      .then((data: Categoria[]) => {
        setCategorias(data);
        setCategoriaId(data[0]?.id || "");
      });
  }, [tipo]);

  useEffect(() => {
    fetch("/api/contas")
      .then((r) => r.json())
      .then((data: Conta[]) => {
        setContas(data);
        setContaId((atual) => atual || data[0]?.id || "");
      });
  }, []);

  function escolherAtalhoData(atalho: "hoje" | "ontem" | "outros") {
    setDataAtalho(atalho);
    if (atalho === "hoje") setDataVencimento(isoHoje());
    if (atalho === "ontem") setDataVencimento(isoHoje(-1));
  }

  // Seletor do topo: "Empréstimo" leva para o módulo de contratos (outro
  // model, outro fluxo) — nunca fica selecionado aqui, só navega. "Despesa"
  // e "Receita" continuam nesta mesma tela, só trocando o estado "tipo".
  function escolherTipoTransacao(escolha: TipoTransacao) {
    if (escolha === "emprestimo") {
      router.push("/contratos/novo");
      return;
    }
    setTipo(escolha);
  }

  async function criarConta() {
    const nome = window.prompt("Nome da nova conta/carteira (ex: Nubank, Dinheiro):");
    if (!nome) return;
    const res = await fetch("/api/contas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    if (res.ok) {
      const nova = await res.json();
      setContas((c) => [...c, nova]);
      setContaId(nova.id);
    }
  }

  async function salvar() {
    const valorNum = parseFloat(valor.replace(",", "."));
    if (!valorNum) return setErro("Informe o valor.");
    if (!descricao.trim()) return setErro("Informe uma descrição.");
    if (recorrente && tipoFim === "parcelas" && (!numeroParcelas || Number(numeroParcelas) < 1)) {
      return setErro("Informe a quantidade de parcelas.");
    }
    if (recorrente && tipoFim === "data_fim" && dataFim <= dataVencimento) {
      return setErro("A data de fim precisa ser depois da data inicial.");
    }

    setErro("");
    setSalvando(true);
    const res = await fetch("/api/lancamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descricao,
        valor: valorNum,
        tipo,
        origem,
        status: pago ? "pago" : "pendente",
        dataVencimento,
        categoriaId: categoriaId || undefined,
        contaId: contaId || undefined,
        observacoes: observacoes || undefined,
        recorrente,
        periodicidade: recorrente ? periodicidade : undefined,
        tipoFim: recorrente ? tipoFim : undefined,
        dataFim: recorrente && tipoFim === "data_fim" ? dataFim : undefined,
        numeroParcelas: recorrente && tipoFim === "parcelas" ? Number(numeroParcelas) : undefined,
      }),
    });
    setSalvando(false);

    if (res.ok) {
      showToast(tipo === "receita" ? "Receita adicionada com sucesso!" : "Despesa adicionada com sucesso!");
      router.push(tipo === "receita" ? "/financeiro/receber" : "/financeiro/pagar");
    } else {
      const data = await res.json();
      setErro(data.error || "Não foi possível salvar o lançamento.");
      showToast(data.error || "Não foi possível salvar o lançamento.", "erro");
    }
  }

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href="/financeiro" />
        <div>
          <h1 className="text-2xl font-bold">Nova transação</h1>
          <p className="text-sm text-muted mt-0.5">Escolha o tipo e preencha os dados</p>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-4 pb-4">
        {/* ============================================================ */}
        {/* Linha 1: tipo da transação — Empréstimo / Despesa / Receita   */}
        {/* ============================================================ */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => escolherTipoTransacao("emprestimo")}
            className="flex flex-col items-center justify-center gap-1 btn-outline !py-3"
          >
            <IconDocument size={18} />
            <span className="text-xs">Empréstimo</span>
          </button>
          <button
            type="button"
            onClick={() => escolherTipoTransacao("despesa")}
            className={`flex flex-col items-center justify-center gap-1 !py-3 ${tipo === "despesa" ? "btn-danger" : "btn-outline"}`}
          >
            <IconReceipt size={18} />
            <span className="text-xs">Despesa</span>
          </button>
          <button
            type="button"
            onClick={() => escolherTipoTransacao("receita")}
            className={`flex flex-col items-center justify-center gap-1 !py-3 ${tipo === "receita" ? "btn-primary" : "btn-outline"}`}
          >
            <IconWallet size={18} />
            <span className="text-xs">Receita</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* CARD: Valor + Descrição                                       */}
        {/* ============================================================ */}
        <div className="card space-y-5">
          {/* --- Valor ---------------------------------------------------------- */}
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted mb-2">
              VALOR D{tipo === "receita" ? "A RECEITA" : "A DESPESA"}
            </p>
            <div className="relative">
              <span
                className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-extrabold ${
                  tipo === "receita" ? "text-primary" : "text-error"
                }`}
              >
                R$
              </span>
              <input
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
                className={`w-full rounded-md border-2 border-transparent pl-14 pr-4 py-4 outline-none text-3xl font-extrabold bg-background ${
                  tipo === "receita" ? "focus:border-primary text-primary" : "focus:border-error text-error"
                }`}
              />
            </div>
          </div>

          {/* --- Descrição -------------------------------------------------------- */}
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted mb-2">DESCRIÇÃO</p>
            <input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder={tipo === "receita" ? "Ex: Salário, Bonificação..." : "Ex: Aluguel, Mercado..."}
              className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* CARD: Detalhes do lançamento                                  */}
        {/* ============================================================ */}
        <div className="card space-y-5">
          {/* --- Pessoal / Empresarial --------------------------------------------- */}
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted mb-2">ORIGEM</p>
            <div className="grid grid-cols-2 gap-2">
              <BotaoToggle ativo={origem === "pessoal"} onClick={() => setOrigem("pessoal")}>
                <span className="inline-flex items-center gap-2"><IconUser size={16} /> Pessoal</span>
              </BotaoToggle>
              <BotaoToggle ativo={origem === "empresarial"} onClick={() => setOrigem("empresarial")}>
                <span className="inline-flex items-center gap-2"><IconBuilding size={16} /> Empresarial</span>
              </BotaoToggle>
            </div>
          </div>

          {/* --- Data ------------------------------------------------------------- */}
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted mb-2">DATA</p>
            <div className="grid grid-cols-3 gap-2">
              <BotaoToggle ativo={dataAtalho === "hoje"} onClick={() => escolherAtalhoData("hoje")}>
                Hoje
              </BotaoToggle>
              <BotaoToggle ativo={dataAtalho === "ontem"} onClick={() => escolherAtalhoData("ontem")}>
                Ontem
              </BotaoToggle>
              <BotaoToggle ativo={dataAtalho === "outros"} onClick={() => escolherAtalhoData("outros")}>
                Outros
              </BotaoToggle>
            </div>
            {dataAtalho === "outros" && (
              <input
                type="date"
                value={dataVencimento}
                onChange={(e) => setDataVencimento(e.target.value)}
                className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary mt-2"
              />
            )}
          </div>

          {/* --- Categoria: abre o bottom sheet de escolher/criar/editar ----------- */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold tracking-wide text-muted">CATEGORIA</p>
              <Link href="/financeiro/categorias" className="text-xs font-semibold text-primary-dark flex items-center gap-1">
                <IconPlus size={12} /> Gerenciar
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setCategoriaModalAberta(true)}
              className="w-full flex items-center gap-3 rounded-md border border-border px-4 py-3 bg-card text-left"
            >
              {categoriaAtual ? (
                <>
                  <span className="w-9 h-9 rounded-md bg-primary-subtle flex items-center justify-center text-lg shrink-0">
                    {categoriaAtual.icone}
                  </span>
                  <span className="font-semibold flex-1 truncate">{categoriaAtual.nome}</span>
                </>
              ) : (
                <span className="flex-1 text-muted">Nenhuma categoria ainda — toque para criar</span>
              )}
              <IconChevronDown size={18} className="text-muted shrink-0" />
            </button>
          </div>

          {/* --- Conta/Carteira ------------------------------------------------------ */}
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted mb-2">CONTA / CARTEIRA</p>
            <div className="flex gap-2">
              <select
                value={contaId}
                onChange={(e) => setContaId(e.target.value)}
                className="flex-1 rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary bg-card"
              >
                {contas.length === 0 && <option value="">Nenhuma conta ainda</option>}
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icone} {c.nome}
                  </option>
                ))}
              </select>
              <button type="button" onClick={criarConta} className="w-14 rounded-md border border-border flex items-center justify-center text-muted shrink-0">
                <IconPlus size={18} />
              </button>
            </div>
          </div>

          {/* --- Status: recebido/pago já ou pendente --------------------------------- */}
          <label className="flex items-center justify-between cursor-pointer pt-1">
            <span className="font-semibold">{tipo === "receita" ? "Já recebido" : "Já pago"}</span>
            <button
              type="button"
              role="switch"
              aria-checked={pago}
              data-on={pago}
              onClick={() => setPago(!pago)}
              className="switch"
            >
              <span className="switch-knob" />
            </button>
          </label>
        </div>

        {/* --- Recorrência: única, fixa sem fim, com data fim, ou parcelada ---------- */}
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">REPETIÇÃO</p>
          <div className="grid grid-cols-2 gap-2">
            <BotaoToggle ativo={!recorrente} onClick={() => setRecorrente(false)}>
              Lançamento único
            </BotaoToggle>
            <BotaoToggle ativo={recorrente} onClick={() => setRecorrente(true)}>
              <span className="inline-flex items-center gap-2"><IconRepeat size={16} /> Recorrente</span>
            </BotaoToggle>
          </div>
        </div>

        {recorrente && (
          <div className="card space-y-4" style={{ background: "var(--color-background)" }}>
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted mb-2">FREQUÊNCIA</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(LABEL_PERIODICIDADE) as PeriodicidadeLancamento[]).map((p) => (
                  <BotaoToggle key={p} ativo={periodicidade === p} onClick={() => setPeriodicidade(p)}>
                    {LABEL_PERIODICIDADE[p]}
                  </BotaoToggle>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-wide text-muted mb-2">DURAÇÃO</p>
              <div className="space-y-2">
                {(Object.keys(LABEL_TIPO_FIM) as TipoFimRecorrencia[]).map((opt) => (
                  <label key={opt} className="flex items-center gap-3 bg-card rounded-md px-4 py-3 cursor-pointer border border-border">
                    <input
                      type="radio"
                      name="tipoFim"
                      checked={tipoFim === opt}
                      onChange={() => setTipoFim(opt)}
                      className="w-5 h-5 accent-primary"
                    />
                    <span className="font-medium text-sm">{LABEL_TIPO_FIM[opt]}</span>
                  </label>
                ))}
              </div>
            </div>

            {tipoFim === "data_fim" && (
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted mb-2">REPETE ATÉ</p>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary bg-card"
                />
              </div>
            )}

            {tipoFim === "parcelas" && (
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted mb-2">NÚMERO DE PARCELAS</p>
                <input
                  value={numeroParcelas}
                  onChange={(e) => setNumeroParcelas(e.target.value)}
                  inputMode="numeric"
                  className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary bg-card"
                />
              </div>
            )}
          </div>
        )}

        {/* --- Observações ------------------------------------------------------------ */}
        <div className="card">
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">OBSERVAÇÕES (OPCIONAL)</p>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary"
          />
        </div>

        {erro && <p className="text-error text-sm font-medium">{erro}</p>}

        <button onClick={salvar} disabled={salvando} className="btn-primary">
          {salvando ? "Salvando..." : `Salvar ${tipo === "receita" ? "receita" : "despesa"}`}
        </button>
      </div>

      <SeletorCategoriaModal
        aberto={categoriaModalAberta}
        tipo={tipo}
        categorias={categorias}
        categoriaSelecionadaId={categoriaId}
        onFechar={() => setCategoriaModalAberta(false)}
        onSelecionar={setCategoriaId}
        onCategoriasAtualizadas={setCategorias}
      />
    </div>
  );
}

function BotaoToggle({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={ativo ? "btn-primary !py-3.5" : "btn-outline !py-3.5"}>
      {children}
    </button>
  );
}

export default function NovoLancamentoPage() {
  return (
    <Suspense
      fallback={
        <div>
          <div className="header-gradient flex items-center gap-3">
            <BotaoVoltar href="/financeiro" />
            <h1 className="text-2xl font-bold">Novo lançamento</h1>
          </div>
          <p className="text-center text-muted text-sm py-10">Carregando...</p>
        </div>
      }
    >
      <NovoLancamentoConteudo />
    </Suspense>
  );
}
