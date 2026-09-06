// ============================================================================
// PÁGINA: Novo lançamento (receita ou despesa)
// ----------------------------------------------------------------------------
// O alternador no topo (Receita/Despesa) muda o tipo do lançamento inteiro,
// inclusive as categorias sugeridas. A seção de recorrência define se é:
//   - Único        -> um lançamento avulso, sem repetição
//   - Fixo/sem fim -> repete indefinidamente (ex: salário, aluguel)
//   - Com data fim -> repete até uma data escolhida
//   - Por parcelas -> repete um número exato de vezes (ex: 12x)
// ============================================================================
"use client";

import { Suspense, useEffect, useState } from "react";
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
import { IconWallet, IconReceipt, IconUser, IconBuilding, IconRepeat, IconPlus } from "../../../components/Icons";

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

  async function criarCategoria() {
    const nome = window.prompt(`Nome da nova categoria de ${tipo === "receita" ? "receita" : "despesa"}:`);
    if (!nome) return;
    const res = await fetch("/api/categorias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, tipo }),
    });
    if (res.ok) {
      const nova = await res.json();
      setCategorias((c) => [...c, nova]);
      setCategoriaId(nova.id);
    }
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
        <h1 className="text-2xl font-bold">Novo lançamento</h1>
      </div>

      <div className="px-5 mt-6 space-y-5">
        {/* --- Alternador Receita / Despesa, no topo do formulário --------- */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTipo("receita")}
            className={`flex items-center justify-center gap-2 ${tipo === "receita" ? "btn-primary !py-3.5" : "btn-outline !py-3.5"}`}
          >
            <IconWallet size={18} /> Receita
          </button>
          <button
            type="button"
            onClick={() => setTipo("despesa")}
            className={`flex items-center justify-center gap-2 ${tipo === "despesa" ? "btn-danger !py-3.5" : "btn-outline !py-3.5"}`}
          >
            <IconReceipt size={18} /> Despesa
          </button>
        </div>

        {/* --- Valor ---------------------------------------------------------- */}
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">
            VALOR D{tipo === "receita" ? "A RECEITA" : "A DESPESA"} (R$)
          </p>
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0,00"
            inputMode="decimal"
            className={`w-full rounded-md border border-border px-4 py-3.5 outline-none text-2xl font-extrabold ${
              tipo === "receita" ? "focus:border-primary" : "focus:border-error"
            }`}
          />
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

        {/* --- Categoria ---------------------------------------------------------- */}
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">CATEGORIA</p>
          <div className="flex gap-2">
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              className="flex-1 rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary bg-card"
            >
              {categorias.length === 0 && <option value="">Nenhuma categoria ainda</option>}
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icone} {c.nome}
                </option>
              ))}
            </select>
            <button type="button" onClick={criarCategoria} className="w-14 rounded-md border border-border flex items-center justify-center text-muted">
              <IconPlus size={18} />
            </button>
          </div>
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
            <button type="button" onClick={criarConta} className="w-14 rounded-md border border-border flex items-center justify-center text-muted">
              <IconPlus size={18} />
            </button>
          </div>
        </div>

        {/* --- Status: recebido/pago já ou pendente --------------------------------- */}
        <label className="card flex items-center justify-between cursor-pointer">
          <span className="font-semibold">{tipo === "receita" ? "Já recebido" : "Já pago"}</span>
          <input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} className="w-6 h-6 accent-primary" />
        </label>

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
        <div>
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
