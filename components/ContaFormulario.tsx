// ============================================================================
// COMPONENTE: Formulário de criar/editar conta bancária
// ----------------------------------------------------------------------------
// Emoji, nome e saldo (inicial/ajuste) — usado tanto para criar uma conta
// nova quanto para editar uma existente na tela /financeiro/contas. O estado
// dos campos mora no componente pai (mesmo padrão do formulário de
// categorias), este componente só desenha os campos e dispara onSalvar.
// ============================================================================
"use client";

import { EMOJIS_CATEGORIA } from "../lib/emojisCategorias";
import { IconCheck } from "./Icons";

export default function ContaFormulario({
  nomeForm,
  setNomeForm,
  iconeForm,
  setIconeForm,
  saldoForm,
  setSaldoForm,
  erro,
  salvando,
  onCancelar,
  onSalvar,
}: {
  nomeForm: string;
  setNomeForm: (v: string) => void;
  iconeForm: string;
  setIconeForm: (v: string) => void;
  saldoForm: string;
  setSaldoForm: (v: string) => void;
  erro: string;
  salvando: boolean;
  onCancelar: () => void;
  onSalvar: () => void;
}) {
  return (
    <div className="card space-y-4">
      <div>
        <p className="text-xs font-semibold tracking-wide text-muted mb-2">ÍCONE</p>
        <div className="flex items-center gap-3 mb-3">
          <span className="w-14 h-14 rounded-md bg-primary-subtle flex items-center justify-center text-2xl shrink-0">
            {iconeForm}
          </span>
          <input
            value={iconeForm}
            onChange={(e) => setIconeForm(e.target.value.slice(-2) || iconeForm)}
            className="w-20 rounded-md border border-border px-3 py-3 text-center text-xl outline-none focus:border-primary"
            aria-label="Emoji personalizado"
          />
        </div>
        <div className="grid grid-cols-8 gap-1.5 bg-background rounded-md p-2 max-h-40 overflow-y-auto">
          {EMOJIS_CATEGORIA.map((e) => (
            <button
              type="button"
              key={e}
              onClick={() => setIconeForm(e)}
              className={`aspect-square rounded-sm flex items-center justify-center text-lg ${
                iconeForm === e ? "bg-primary-subtle ring-2 ring-primary" : "hover:bg-card"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold tracking-wide text-muted mb-2">NOME</p>
        <input
          value={nomeForm}
          onChange={(e) => setNomeForm(e.target.value)}
          placeholder="Ex: Nubank, Carteira"
          className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary"
          autoFocus
        />
      </div>

      <div>
        <p className="text-xs font-semibold tracking-wide text-muted mb-2">SALDO INICIAL / AJUSTE</p>
        <input
          type="number"
          step="0.01"
          value={saldoForm}
          onChange={(e) => setSaldoForm(e.target.value)}
          className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary"
        />
        <p className="text-xs text-muted mt-1.5">
          Ponto de partida do saldo desta conta. O app soma a isso as receitas pagas e subtrai as
          despesas pagas para calcular o saldo atual — mude aqui se o saldo mostrado não bater com
          o banco de verdade.
        </p>
      </div>

      {erro && <p className="text-error text-sm font-medium">{erro}</p>}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancelar} className="btn-outline">
          Cancelar
        </button>
        <button type="button" onClick={onSalvar} disabled={salvando} className="btn-primary flex items-center justify-center gap-2">
          <IconCheck size={16} /> {salvando ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}
