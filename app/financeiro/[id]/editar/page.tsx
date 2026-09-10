// ============================================================================
// PÁGINA: Editar lançamento
// ----------------------------------------------------------------------------
// Edita descrição, valor, data, categoria, conta/cartão e observações de um
// lançamento já existente. Não mexe na recorrência (isso continua sendo
// tratado só na criação, em app/financeiro/novo) — editar aqui só afeta
// esta ocorrência específica.
// A alteração fica registrada no Histórico e pode ser desfeita por lá.
//
// NOVO: valor usa o mesmo campo mascarado (CampoMoeda) das outras telas —
// antes era um <input> livre com parseFloat(valor.replace(",", ".")), que
// quebrava com separador de milhar (ex: "1.234,56" virava 1.234, perdendo os
// centavos). E despesa ganhou a mesma forma de pagamento "Cartão de crédito"
// que a tela de Nova transação já tinha — como um Lancamento normal não
// pertence a um cartão (compras de cartão são um model à parte, CompraCartao,
// que só vira Lancamento quando a fatura fecha — ver lib/cartao.ts), mudar
// pra cartão aqui CONVERTE o lançamento: exclui este Lancamento e cria uma
// CompraCartao equivalente na fatura do cartão escolhido.
// ============================================================================
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { TipoLancamento } from "../../../../lib/financeiro";
import BotaoVoltar from "../../../../components/BotaoVoltar";
import { useToast } from "../../../../components/ToastProvider";
import CampoMoeda, { valorFormatadoParaNumero, numeroParaValorFormatado } from "../../../../components/CampoMoeda";
import { IconTrash, IconCreditCard } from "../../../../components/Icons";

type Categoria = { id: string; nome: string; icone: string; tipo: TipoLancamento };
type Conta = { id: string; nome: string; icone: string };
type Cartao = { id: string; nome: string; icone: string };

type LancamentoDetalhe = {
  id: string;
  descricao: string;
  valor: string;
  tipo: TipoLancamento;
  status: "pendente" | "pago";
  dataVencimento: string;
  categoriaId: string | null;
  contaId: string | null;
  observacoes: string | null;
};

type FormaPagamento = "conta" | "cartao";

export default function EditarLancamentoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const showToast = useToast();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState("");

  const [tipo, setTipo] = useState<TipoLancamento>("receita");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [dataVencimento, setDataVencimento] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [contaId, setContaId] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);

  // --- Forma de pagamento: Conta/Carteira ou Cartão de crédito (NOVO) --------
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("conta");
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [cartaoId, setCartaoId] = useState("");

  // Carrega o lançamento e, junto, as categorias do tipo dele + contas.
  useEffect(() => {
    fetch(`/api/lancamentos/${params.id}`)
      .then((r) => r.json())
      .then((l: LancamentoDetalhe) => {
        setTipo(l.tipo);
        setDescricao(l.descricao);
        setValor(numeroParaValorFormatado(Number(l.valor)));
        setDataVencimento(l.dataVencimento.slice(0, 10));
        setCategoriaId(l.categoriaId || "");
        setContaId(l.contaId || "");
        setObservacoes(l.observacoes || "");
        setCarregando(false);
      });
  }, [params.id]);

  useEffect(() => {
    if (carregando) return;
    fetch(`/api/categorias?tipo=${tipo}`)
      .then((r) => r.json())
      .then(setCategorias);
    fetch("/api/contas")
      .then((r) => r.json())
      .then(setContas);
    if (tipo === "despesa") {
      fetch("/api/cartoes")
        .then((r) => r.json())
        .then((data: Cartao[]) => {
          setCartoes(data);
          setCartaoId((atual) => atual || data[0]?.id || "");
        });
    }
  }, [tipo, carregando]);

  async function salvar() {
    const valorNum = valorFormatadoParaNumero(valor);
    if (!valorNum) return setErro("Informe o valor.");
    if (!descricao.trim()) return setErro("Informe uma descrição.");

    setErro("");
    setSalvando(true);

    // --- Convertendo pra cartão: exclui o Lancamento e cria uma CompraCartao
    if (tipo === "despesa" && formaPagamento === "cartao") {
      if (!cartaoId) {
        setSalvando(false);
        return setErro("Escolha um cartão.");
      }
      const resCompra = await fetch("/api/compras-cartao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartaoId,
          descricao,
          valor: valorNum,
          dataCompra: dataVencimento,
          categoriaId: categoriaId || undefined,
          observacoes: observacoes || undefined,
        }),
      });
      if (!resCompra.ok) {
        setSalvando(false);
        const data = await resCompra.json().catch(() => ({}));
        setErro(data.error || "Não foi possível lançar a compra no cartão.");
        showToast(data.error || "Não foi possível lançar a compra no cartão.", "erro");
        return;
      }
      const resExcluir = await fetch(`/api/lancamentos/${params.id}`, { method: "DELETE" });
      setSalvando(false);
      if (!resExcluir.ok) {
        // A compra já foi lançada no cartão — avisa em vez de deixar
        // duplicado (lançamento antigo + compra nova) sem explicação.
        showToast("Compra lançada no cartão, mas não deu pra remover o lançamento antigo. Exclua-o manualmente.", "erro");
        router.push(`/financeiro/cartoes/${cartaoId}`);
        return;
      }
      showToast("Lançamento movido para o cartão!");
      router.push(`/financeiro/cartoes/${cartaoId}`);
      return;
    }

    const res = await fetch(`/api/lancamentos/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        descricao,
        valor: valorNum,
        dataVencimento,
        categoriaId: categoriaId || undefined,
        contaId: contaId || undefined,
        observacoes: observacoes || undefined,
      }),
    });
    setSalvando(false);

    if (res.ok) {
      showToast("Lançamento atualizado com sucesso!");
      router.push(tipo === "receita" ? "/financeiro/receber" : "/financeiro/pagar");
    } else {
      const data = await res.json().catch(() => ({}));
      setErro(data.error || "Não foi possível salvar as alterações.");
      showToast(data.error || "Não foi possível salvar as alterações.", "erro");
    }
  }

  async function excluir() {
    if (!window.confirm("Tem certeza que deseja excluir este lançamento?")) return;
    setExcluindo(true);
    const res = await fetch(`/api/lancamentos/${params.id}`, { method: "DELETE" });
    setExcluindo(false);
    if (res.ok) {
      showToast("Lançamento excluído.");
      router.push(tipo === "receita" ? "/financeiro/receber" : "/financeiro/pagar");
    } else {
      showToast("Não foi possível excluir o lançamento.", "erro");
    }
  }

  if (carregando) {
    return (
      <div>
        <div className="header-gradient flex items-center gap-3">
          <BotaoVoltar href="/financeiro" />
          <h1 className="text-2xl font-bold">Editar lançamento</h1>
        </div>
        <p className="text-center text-muted text-sm py-10">Carregando...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href={tipo === "receita" ? "/financeiro/receber" : "/financeiro/pagar"} />
        <h1 className="text-2xl font-bold">Editar lançamento</h1>
      </div>

      <div className="px-5 mt-6 space-y-5">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">DESCRIÇÃO</p>
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary"
          />
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">
            VALOR D{tipo === "receita" ? "A RECEITA" : "A DESPESA"}
          </p>
          <CampoMoeda value={valor} onChange={setValor} />
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">DATA DE VENCIMENTO</p>
          <input
            type="date"
            value={dataVencimento}
            onChange={(e) => setDataVencimento(e.target.value)}
            className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary"
          />
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">CATEGORIA</p>
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary bg-card"
          >
            <option value="">Sem categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icone} {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">FORMA DE PAGAMENTO</p>

          {/* A aba só aparece pra despesa — não existe "pagar" uma receita
              no cartão (mesma regra de app/financeiro/novo). */}
          {tipo === "despesa" && (
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                type="button"
                onClick={() => setFormaPagamento("conta")}
                className={`chip-toggle w-full ${formaPagamento === "conta" ? "chip-toggle-ativo" : ""}`}
              >
                Conta / Carteira
              </button>
              <button
                type="button"
                onClick={() => setFormaPagamento("cartao")}
                className={`chip-toggle w-full ${formaPagamento === "cartao" ? "chip-toggle-ativo" : ""}`}
              >
                <span className="inline-flex items-center gap-2">
                  <IconCreditCard size={16} /> Cartão de crédito
                </span>
              </button>
            </div>
          )}

          {formaPagamento === "cartao" && tipo === "despesa" ? (
            cartoes.length === 0 ? (
              <div className="rounded-md border border-border px-4 py-3.5 bg-card text-sm text-muted">
                Nenhum cartão cadastrado ainda.
              </div>
            ) : (
              <>
                <select
                  value={cartaoId}
                  onChange={(e) => setCartaoId(e.target.value)}
                  className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary bg-card"
                >
                  {cartoes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icone} {c.nome}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted mt-1.5">
                  Move este lançamento pra fatura do cartão escolhido — deixa de ser um lançamento avulso.
                </p>
              </>
            )
          ) : (
            <select
              value={contaId}
              onChange={(e) => setContaId(e.target.value)}
              className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary bg-card"
            >
              <option value="">Sem conta</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icone} {c.nome}
                </option>
              ))}
            </select>
          )}
        </div>

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
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
        <button
          onClick={excluir}
          disabled={excluindo}
          className="btn-outline text-error flex items-center justify-center gap-2"
          style={{ borderColor: "var(--color-border-error)" }}
        >
          <IconTrash size={16} /> {excluindo ? "Excluindo..." : "Excluir lançamento"}
        </button>
      </div>
    </div>
  );
}
