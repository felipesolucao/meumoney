// ============================================================================
// COMPONENTE: Cabeçalho do detalhe de categoria (emoji, nome, editar/excluir)
// ----------------------------------------------------------------------------
// Extraído de app/financeiro/categorias/[id]/page.tsx — três estados dentro
// do mesmo card: exclusão pedindo confirmação, formulário de edição
// (emoji + nome) ou a visualização normal com os botões de editar/excluir.
// ============================================================================
import { EMOJIS_CATEGORIA } from "../lib/emojisCategorias";
import { IconEdit, IconTrash, IconCheck } from "./Icons";

type Categoria = { id: string; nome: string; icone: string };

export default function CategoriaCabecalho({
  categoria,
  editando,
  nomeForm,
  iconeForm,
  salvando,
  erro,
  confirmarExclusao,
  onIniciarEdicao,
  onCancelarEdicao,
  onSalvar,
  onIniciarExclusao,
  onCancelarExclusao,
  onConfirmarExclusao,
  onNomeChange,
  onIconeChange,
}: {
  categoria: Categoria;
  editando: boolean;
  nomeForm: string;
  iconeForm: string;
  salvando: boolean;
  erro: string;
  confirmarExclusao: boolean;
  onIniciarEdicao: () => void;
  onCancelarEdicao: () => void;
  onSalvar: () => void;
  onIniciarExclusao: () => void;
  onCancelarExclusao: () => void;
  onConfirmarExclusao: () => void;
  onNomeChange: (nome: string) => void;
  onIconeChange: (icone: string) => void;
}) {
  if (confirmarExclusao) {
    return (
      <div className="card">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-error">Excluir “{categoria.nome}”? Os lançamentos ficam sem categoria.</span>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={onCancelarExclusao} className="btn-chip bg-background text-foreground">
              Cancelar
            </button>
            <button type="button" disabled={salvando} onClick={onConfirmarExclusao} className="btn-chip btn-danger !min-h-0">
              Excluir
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (editando) {
    return (
      <div className="card space-y-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted mb-2">EMOJI</p>
          <div className="flex items-center gap-3 mb-3">
            <span className="w-14 h-14 rounded-md bg-primary-subtle flex items-center justify-center text-2xl shrink-0">
              {iconeForm}
            </span>
            <input
              value={iconeForm}
              onChange={(e) => onIconeChange(e.target.value.slice(-2) || iconeForm)}
              className="w-20 rounded-md border border-border px-3 py-3 text-center text-xl outline-none focus:border-primary"
              aria-label="Emoji personalizado"
            />
          </div>
          <div className="grid grid-cols-8 gap-1.5 bg-background rounded-md p-2 max-h-40 overflow-y-auto">
            {EMOJIS_CATEGORIA.map((e) => (
              <button
                type="button"
                key={e}
                onClick={() => onIconeChange(e)}
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
            onChange={(e) => onNomeChange(e.target.value)}
            className="w-full rounded-md border border-border px-4 py-3.5 outline-none focus:border-primary"
            autoFocus
          />
        </div>
        {erro && <p className="text-error text-sm font-medium">{erro}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onCancelarEdicao} className="btn-outline">
            Cancelar
          </button>
          <button type="button" onClick={onSalvar} disabled={salvando} className="btn-primary flex items-center justify-center gap-2">
            <IconCheck size={16} /> {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card flex items-center gap-3">
      <span className="w-14 h-14 rounded-md bg-primary-subtle flex items-center justify-center text-2xl shrink-0">
        {categoria.icone}
      </span>
      <span className="font-bold text-lg flex-1 truncate">{categoria.nome}</span>
      <button type="button" onClick={onIniciarEdicao} className="icon-btn text-muted shrink-0" aria-label="Editar categoria">
        <IconEdit size={16} />
      </button>
      <button type="button" onClick={onIniciarExclusao} className="icon-btn text-error shrink-0" aria-label="Excluir categoria">
        <IconTrash size={16} />
      </button>
    </div>
  );
}
