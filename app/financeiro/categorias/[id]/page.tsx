// ============================================================================
// PÁGINA: Detalhe da categoria
// ----------------------------------------------------------------------------
// O "gerenciador" de uma categoria específica: trocar o emoji, renomear e ver
// os lançamentos que caem nela, filtrados por período. Excluir a categoria
// manda de volta pro índice.
//
// CORRIGIDO: só buscava Lancamento — uma categoria usada em compras no
// cartão de crédito (CompraCartao, ver lib/cartao.ts) aparecia com total e
// histórico zerados aqui, mesmo já somando corretamente em Relatórios e
// "Despesas por categoria" (que já contam essas compras, ver
// /api/financeiro/categorias-resumo). Agora busca os dois e soma no total —
// exibidos em seções separadas porque uma compra no cartão não tem as
// mesmas ações de uma despesa comum (pagar/estornar não fazem sentido pra
// ela; ver link para o extrato do cartão em cada item).
//
// CORRIGIDO: o período inicial vinha errado ao abrir a categoria — o cálculo
// de "veio um ?ano=&mes= na URL?" usava Number(null), que dá 0 em vez de
// NaN, então SEMPRE achava que tinha vindo um período (ano 0, mês 0 =
// janeiro do ano 1900) mesmo sem nenhum parâmetro na URL, inclusive
// entrando direto do link de "Despesas por categoria" da Início.
//
// NOVO: troca o antigo MesSeletor (só navega mês a mês) pelo mesmo SeletorData
// usado na Início/Contas (barra com a data por extenso + atalhos prontos —
// Hoje, Ontem, 7/15/30/60/90 dias — e um mini calendário pra período
// personalizado, ver components/SeletorData.tsx), pedido explícito pra ter
// aqui os mesmos filtros prontos de lá em vez de só andar mês a mês.
// ============================================================================
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { TipoLancamento } from "../../../../lib/financeiro";
import { formatarMoeda } from "../../../../lib/financeiro";
import BotaoVoltar from "../../../../components/BotaoVoltar";
import SeletorData from "../../../../components/SeletorData";
import LancamentosLista, { LancamentoItem } from "../../../../components/LancamentosLista";
import ComprasCartaoLista, { CompraCartaoItem } from "../../../../components/ComprasCartaoLista";
import CategoriaCabecalho from "../../../../components/CategoriaCabecalho";
import { useToast } from "../../../../components/ToastProvider";

type Categoria = { id: string; nome: string; icone: string; tipo: TipoLancamento };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatarISO(data: Date) {
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
}

function inicioDoMesAtual() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1);
}

function fimDoMesAtual() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
}

// useSearchParams() só é seguro em build quando o componente que o chama fica
// dentro de um <Suspense> (mesmo motivo de app/financeiro/pagar/page.tsx) —
// por isso a lógica mora aqui, e a exportação padrão só monta o Suspense.
function DetalheCategoriaConteudo({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showToast = useToast();
  // Chegando do link de uma categoria em Relatórios (que tem seu próprio
  // seletor de mês), abre já no mesmo período que estava sendo visto lá —
  // com "de"/"ate" ausentes (ex: vindo de "Despesas por categoria" da
  // Início, que não anexa período algum), cai no mês atual.
  const deParam = searchParams.get("de");
  const ateParam = searchParams.get("ate");

  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [carregandoCategoria, setCarregandoCategoria] = useState(true);

  const [editando, setEditando] = useState(false);
  const [nomeForm, setNomeForm] = useState("");
  const [iconeForm, setIconeForm] = useState("💰");
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);
  const [erroCategoria, setErroCategoria] = useState("");
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const [inicio, setInicio] = useState(() => (deParam ? new Date(`${deParam}T00:00:00`) : inicioDoMesAtual()));
  const [fim, setFim] = useState(() => (ateParam ? new Date(`${ateParam}T00:00:00`) : fimDoMesAtual()));
  const [lancamentos, setLancamentos] = useState<LancamentoItem[]>([]);
  const [carregandoLancamentos, setCarregandoLancamentos] = useState(true);
  const [comprasCartao, setComprasCartao] = useState<CompraCartaoItem[]>([]);
  const [carregandoCompras, setCarregandoCompras] = useState(true);

  // A categoria em si não tem um GET individual — busca a lista completa (sem
  // filtro de tipo) e encontra pelo id, o mesmo que a tela de índice já usa.
  useEffect(() => {
    fetch("/api/categorias")
      .then((r) => r.json())
      .then((data: Categoria[]) => {
        const encontrada = data.find((c) => c.id === params.id) || null;
        setCategoria(encontrada);
        if (encontrada) {
          setNomeForm(encontrada.nome);
          setIconeForm(encontrada.icone);
        }
        setCarregandoCategoria(false);
      });
  }, [params.id]);

  useEffect(() => {
    setCarregandoLancamentos(true);
    const de = formatarISO(inicio);
    const ate = formatarISO(fim);

    fetch(`/api/lancamentos?categoriaId=${params.id}&de=${de}&ate=${ate}`)
      .then((r) => r.json())
      .then((data: LancamentoItem[]) => {
        const ordenado = [...data].sort(
          (a, b) => new Date(b.dataVencimento).getTime() - new Date(a.dataVencimento).getTime()
        );
        setLancamentos(ordenado);
        setCarregandoLancamentos(false);
      });

    setCarregandoCompras(true);
    fetch(`/api/compras-cartao?categoriaId=${params.id}&de=${de}&ate=${ate}`)
      .then((r) => r.json())
      .then((data: CompraCartaoItem[]) => {
        const ordenado = [...data].sort(
          (a, b) => new Date(b.dataCompra).getTime() - new Date(a.dataCompra).getTime()
        );
        setComprasCartao(ordenado);
        setCarregandoCompras(false);
      });
  }, [params.id, inicio, fim]);

  const carregandoLista = carregandoLancamentos || carregandoCompras;
  const totalMes = useMemo(
    () =>
      lancamentos.reduce((s, l) => s + Number(l.valor), 0) +
      comprasCartao.reduce((s, c) => s + Number(c.valor), 0),
    [lancamentos, comprasCartao]
  );

  function iniciarEdicao() {
    if (!categoria) return;
    setNomeForm(categoria.nome);
    setIconeForm(categoria.icone);
    setEditando(true);
    setErroCategoria("");
  }

  async function salvarCategoria() {
    if (!categoria) return;
    if (!nomeForm.trim()) return setErroCategoria("Dê um nome para a categoria.");
    setSalvandoCategoria(true);
    const res = await fetch(`/api/categorias/${categoria.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: nomeForm.trim(), icone: iconeForm }),
    });
    setSalvandoCategoria(false);
    if (!res.ok) {
      const data = await res.json();
      return setErroCategoria(data.error || "Não foi possível salvar.");
    }
    const atualizada: Categoria = await res.json();
    setCategoria(atualizada);
    setEditando(false);
    showToast("Categoria atualizada!");
  }

  async function excluirCategoria() {
    if (!categoria) return;
    setSalvandoCategoria(true);
    const res = await fetch(`/api/categorias/${categoria.id}`, { method: "DELETE" });
    setSalvandoCategoria(false);
    if (!res.ok) {
      const data = await res.json();
      showToast(data.error || "Não foi possível excluir a categoria.", "erro");
      return;
    }
    showToast("Categoria excluída.");
    router.push("/financeiro/categorias");
  }

  if (carregandoCategoria) {
    return (
      <div>
        <div className="header-gradient flex items-center gap-3">
          <BotaoVoltar href="/financeiro/categorias" />
          <h1 className="text-2xl font-bold">Categoria</h1>
        </div>
        <p className="text-center text-muted text-sm py-10">Carregando...</p>
      </div>
    );
  }

  if (!categoria) {
    return (
      <div>
        <div className="header-gradient flex items-center gap-3">
          <BotaoVoltar href="/financeiro/categorias" />
          <h1 className="text-2xl font-bold">Categoria</h1>
        </div>
        <p className="text-center text-muted text-sm py-10">Categoria não encontrada.</p>
      </div>
    );
  }

  const corTotal = categoria.tipo === "receita" ? "var(--color-primary)" : "var(--color-error)";

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href="/financeiro/categorias" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Categoria</h1>
          <p className="text-sm text-muted mt-0.5">{categoria.tipo === "receita" ? "Receita" : "Despesa"}</p>
        </div>
      </div>

      <div className="px-5 mt-6 space-y-4 pb-4">
        <CategoriaCabecalho
          categoria={categoria}
          editando={editando}
          nomeForm={nomeForm}
          iconeForm={iconeForm}
          salvando={salvandoCategoria}
          erro={erroCategoria}
          confirmarExclusao={confirmarExclusao}
          onIniciarEdicao={iniciarEdicao}
          onCancelarEdicao={() => setEditando(false)}
          onSalvar={salvarCategoria}
          onIniciarExclusao={() => setConfirmarExclusao(true)}
          onCancelarExclusao={() => setConfirmarExclusao(false)}
          onConfirmarExclusao={excluirCategoria}
          onNomeChange={setNomeForm}
          onIconeChange={setIconeForm}
        />

        {/* --- Período + total ---------------------------------------------------- */}
        <SeletorData
          inicio={inicio}
          fim={fim}
          onSelecionar={(novoInicio, novoFim) => {
            setInicio(novoInicio);
            setFim(novoFim);
          }}
        />

        <div className="card">
          <p className="text-xs font-semibold tracking-wide text-muted">TOTAL NO PERÍODO</p>
          <p className="text-3xl font-extrabold mt-1" style={{ color: corTotal }}>
            {carregandoLista ? "—" : formatarMoeda(totalMes)}
          </p>
          <p className="text-xs text-muted mt-1">
            {lancamentos.length + comprasCartao.length} lançamento(s)
          </p>
        </div>

        {/* --- Lançamentos do mês nesta categoria --------------------------------- */}
        {carregandoLista ? (
          <p className="text-center text-muted text-sm py-6">Carregando...</p>
        ) : lancamentos.length === 0 && comprasCartao.length === 0 ? (
          <div className="card text-center text-muted text-sm">Nenhum lançamento encontrado.</div>
        ) : (
          <>
            <LancamentosLista lancamentos={lancamentos} />
            <ComprasCartaoLista compras={comprasCartao} />
          </>
        )}
      </div>
    </div>
  );
}

export default function DetalheCategoriaPage({ params }: { params: { id: string } }) {
  return (
    <Suspense
      fallback={
        <div>
          <div className="header-gradient flex items-center gap-3">
            <BotaoVoltar href="/financeiro/categorias" />
            <h1 className="text-2xl font-bold">Categoria</h1>
          </div>
          <p className="text-center text-muted text-sm py-10">Carregando...</p>
        </div>
      }
    >
      <DetalheCategoriaConteudo params={params} />
    </Suspense>
  );
}
