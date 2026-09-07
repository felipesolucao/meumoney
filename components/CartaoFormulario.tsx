// ============================================================================
// COMPONENTE: Formulário de criar/editar cartão de crédito
// ----------------------------------------------------------------------------
// Ícone, nome, bandeira (opcional), limite (opcional), dias de fechamento e
// de vencimento da fatura, a Conta/carteira que paga a fatura, e se o cartão
// é de uso pessoal ou empresarial (herdado pelo Lancamento gerado quando a
// fatura fecha — ver lib/cartao.ts). Mesmo padrão do ContaFormulario: o
// estado dos campos mora no componente pai, aqui só desenha e dispara onSalvar.
// ============================================================================
"use client";

import { EMOJIS_CATEGORIA } from "../lib/emojisCategorias";
import type { OrigemFinanceira } from "../lib/financeiro";
import { IconCheck } from "./Icons";

type Conta = { id: string; nome: string; icone: string };

export default function CartaoFormulario({
  nomeForm, setNomeForm,
  iconeForm, setIconeForm,
  bandeiraForm, setBandeiraForm,
  limiteForm, setLimiteForm,
  diaFechamentoForm, setDiaFechamentoForm,
  diaVencimentoForm, setDiaVencimentoForm,
  contaIdForm, setContaIdForm,
  origemForm, setOrigemForm,
  contas,
  erro,
  salvando,
  onCancelar,
  onSalvar,
}: {
  nomeForm: string; setNomeForm: (v: string) => void;
  iconeForm: string; setIconeForm: (v: string) => void;
  bandeiraForm: string; setBandeiraForm: (v: string) => void;
  limiteForm: string; setLimiteForm: (v: string) => void;
  diaFechamentoForm: string; setDiaFechamentoForm: (v: string) => void;
  diaVencimentoForm: string; setDiaVencimentoForm: (v: string) => void;
  contaIdForm: string; setContaIdForm: (v: string) => void;
  origemForm: OrigemFinanceira; setOrigemForm: (v: OrigemFinanceira) => void;
  contas: Conta[];
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
        <p className="text-xs font-semibold tracking-wide text-muted mb-2">NOME DO CARTÃO</p>
        <input
          value={nomeForm}
          onChange={(e) => setNomeForm(e.target.value)}
          placeholder="Ex: Nubank Ultravioleta"
          className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary"
          autoFocus
        />
      </div>

      <div>
        <p className="text-xs font-semibold tracking-wide text-muted mb-2">BANDEIRA (OPCIONAL)</p>
        <input
          value={bandeiraForm}
          onChange={(e) => setBandeiraForm(e.target.value)}
          placeholder="Ex: Visa, Mastercard"
          className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">DIA DO FECHAMENTO</p>
          <input
            type="number"
            min={1}
            max={31}
            value={diaFechamentoForm}
            onChange={(e) => setDiaFechamentoForm(e.target.value)}
            className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary"
          />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">DIA DO VENCIMENTO</p>
          <input
            type="number"
            min={1}
            max={31}
            value={diaVencimentoForm}
            onChange={(e) => setDiaVencimentoForm(e.target.value)}
            className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary"
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold tracking-wide text-muted mb-2">LIMITE (OPCIONAL)</p>
        <input
          type="number"
          step="0.01"
          value={limiteForm}
          onChange={(e) => setLimiteForm(e.target.value)}
          placeholder="0,00"
          className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary"
        />
      </div>

      <div>
        <p className="text-xs font-semibold tracking-wide text-muted mb-2">CONTA QUE PAGA A FATURA</p>
        <select
          value={contaIdForm}
          onChange={(e) => setContaIdForm(e.target.value)}
          className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary bg-card"
        >
          {contas.length === 0 && <option value="">Cadastre uma conta primeiro</option>}
          {contas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icone} {c.nome}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted mt-1.5">
          Quando a fatura fechar e for marcada como paga, o valor sai do saldo desta conta.
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold tracking-wide text-muted mb-2">USO</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setOrigemForm("pessoal")}
            className={origemForm === "pessoal" ? "btn-primary !py-3" : "btn-outline !py-3"}
          >
            Pessoal
          </button>
          <button
            type="button"
            onClick={() => setOrigemForm("empresarial")}
            className={origemForm === "empresarial" ? "btn-primary !py-3" : "btn-outline !py-3"}
          >
            Empresarial
          </button>
        </div>
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
