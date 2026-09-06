// ============================================================================
// PÁGINA: Histórico de ações
// ----------------------------------------------------------------------------
// Reutilizada em dois lugares:
//   /historico?entidade=Lancamento&voltar=/financeiro   -> histórico do Financeiro
//   /historico?entidade=Contrato&voltar=/contratos       -> histórico de Contratos
//                                                             (inclui ações de Parcela)
// "voltar" define para onde a seta de voltar do topo aponta.
// Traz um seletor de mês (mês atual por padrão) e a timeline, com reversão.
// ============================================================================
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import MesSeletor from "../../components/MesSeletor";
import HistoricoTimeline, { HistoricoItem } from "../../components/HistoricoTimeline";
import BotaoVoltar from "../../components/BotaoVoltar";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default function HistoricoPage() {
  const params = useSearchParams();
  const entidade = params.get("entidade") || "Lancamento";
  const voltar = params.get("voltar") || "/financeiro";

  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [itens, setItens] = useState<HistoricoItem[]>([]);
  const [carregando, setCarregando] = useState(true);

  const { de, ate } = useMemo(() => {
    const inicio = new Date(ano, mes, 1);
    const fim = new Date(ano, mes + 1, 0);
    return {
      de: `${inicio.getFullYear()}-${pad(inicio.getMonth() + 1)}-${pad(inicio.getDate())}`,
      ate: `${fim.getFullYear()}-${pad(fim.getMonth() + 1)}-${pad(fim.getDate())}`,
    };
  }, [ano, mes]);

  useEffect(() => {
    setCarregando(true);
    fetch(`/api/historico?entidade=${entidade}&de=${de}&ate=${ate}`)
      .then((r) => r.json())
      .then((data) => {
        setItens(data);
        setCarregando(false);
      });
  }, [entidade, de, ate]);

  const titulo = entidade === "Contrato" ? "Histórico de contratos" : "Histórico financeiro";
  const subtitulo =
    entidade === "Contrato"
      ? "Contratos criados, editados, parcelas pagas ou renegociadas"
      : "Lançamentos criados, editados, pagos ou excluídos";

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href={voltar} />
        <div>
          <h1 className="text-xl font-bold">{titulo}</h1>
          <p className="text-muted text-sm">{subtitulo}</p>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-5">
        <div className="card">
          <MesSeletor ano={ano} mes={mes} onMudar={(a, m) => { setAno(a); setMes(m); }} />
        </div>

        {carregando ? (
          <p className="text-center text-muted text-sm py-6">Carregando...</p>
        ) : (
          <HistoricoTimeline itens={itens} />
        )}
      </div>
    </div>
  );
}
