// ============================================================================
// PÁGINA: Editar lançamento
// ----------------------------------------------------------------------------
// Edita descrição, valor, data, categoria, conta e observações de um
// lançamento já existente. Não mexe na recorrência (isso continua sendo
// tratado só na criação, em app/financeiro/novo) — editar aqui só afeta
// esta ocorrência específica.
// A alteração fica registrada no Histórico e pode ser desfeita por lá.
// ============================================================================
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { TipoLancamento } from "../../../../lib/financeiro";
import BotaoVoltar from "../../../../components/BotaoVoltar";
import { IconTrash } from "../../../../components/Icons";

type Categoria = { id: string; nome: string; icone: string; tipo: TipoLancamento };
type Conta = { id: string; nome: string; icone: string };

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

export default function EditarLancamentoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

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

  // Carrega o lançamento e, junto, as categorias do tipo dele + contas.
  useEffect(() => {
    fetch(`/api/lancamentos/${params.id}`)
      .then((r) => r.json())
      .then((l: LancamentoDetalhe) => {
        setTipo(l.tipo);
        setDescricao(l.descricao);
        setValor(String(l.valor).replace(".", ","));
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
  }, [tipo, carregando]);

  async function salvar() {
    const valorNum = parseFloat(valor.replace(",", "."));
    if (!valorNum) return setErro("Informe o valor.");
    if (!descricao.trim()) return setErro("Informe uma descrição.");

    setErro("");
    setSalvando(true);
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
      router.push(tipo === "receita" ? "/financeiro/receber" : "/financeiro/pagar");
    } else {
      const data = await res.json();
      setErro(data.error || "Não foi possível salvar as alterações.");
    }
  }

  async function excluir() {
    if (!window.confirm("Tem certeza que deseja excluir este lançamento?")) return;
    setExcluindo(true);
    const res = await fetch(`/api/lancamentos/${params.id}`, { method: "DELETE" });
    setExcluindo(false);
    if (res.ok) {
      router.push(tipo === "receita" ? "/financeiro/receber" : "/financeiro/pagar");
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
            className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 outline-none focus:border-primary"
          />
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">
            VALOR D{tipo === "receita" ? "A RECEITA" : "A DESPESA"} (R$)
          </p>
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            inputMode="decimal"
            className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 outline-none focus:border-primary"
          />
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">DATA DE VENCIMENTO</p>
          <input
            type="date"
            value={dataVencimento}
            onChange={(e) => setDataVencimento(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 outline-none focus:border-primary"
          />
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">CATEGORIA</p>
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 outline-none focus:border-primary bg-white"
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
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">CONTA / CARTEIRA</p>
          <select
            value={contaId}
            onChange={(e) => setContaId(e.target.value)}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 outline-none focus:border-primary bg-white"
          >
            <option value="">Sem conta</option>
            {contas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icone} {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">OBSERVAÇÕES (OPCIONAL)</p>
          <textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 outline-none focus:border-primary"
          />
        </div>

        {erro && <p className="text-danger text-sm font-medium">{erro}</p>}

        <button onClick={salvar} disabled={salvando} className="btn-primary">
          {salvando ? "Salvando..." : "Salvar alterações"}
        </button>
        <button
          onClick={excluir}
          disabled={excluindo}
          className="btn-outline text-danger flex items-center justify-center gap-2"
          style={{ borderColor: "#f4c7c2" }}
        >
          <IconTrash size={16} /> {excluindo ? "Excluindo..." : "Excluir lançamento"}
        </button>
      </div>
    </div>
  );
}
