// ============================================================================
// COMPONENTE: Modal de importação de leads por planilha (CSV)
// ----------------------------------------------------------------------------
// Aceita um arquivo .csv (exportado do Excel/Google Sheets) ou colar o
// conteúdo direto. O parse "de verdade" (que decide os leads criados)
// acontece no servidor — ver app/api/crm/leads/importar/route.ts; aqui só
// mostra uma prévia rápida das primeiras linhas pra o usuário conferir antes
// de confirmar.
// ============================================================================
"use client";

import { useRef, useState } from "react";
import { useToast } from "../ToastProvider";

function preverLinhas(csv: string): string[][] {
  return csv
    .trim()
    .split(/\r?\n/)
    .slice(0, 6)
    .map((linha) => linha.split(/;|,/).map((c) => c.replace(/^"|"$/g, "")));
}

export default function ImportarModal({ onFechar, onImportado }: { onFechar: () => void; onImportado: () => void }) {
  const showToast = useToast();
  const [csv, setCsv] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const inputArquivoRef = useRef<HTMLInputElement>(null);

  function lerArquivo(arquivo: File) {
    const leitor = new FileReader();
    leitor.onload = () => setCsv(String(leitor.result || ""));
    leitor.readAsText(arquivo, "utf-8");
  }

  async function importar() {
    if (!csv.trim()) {
      setErro("Cole o conteúdo do CSV ou selecione um arquivo.");
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      const resposta = await fetch("/api/crm/leads/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.error || "Não foi possível importar a planilha.");
      showToast(`${dados.importados} lead(s) importado(s).`);
      onImportado();
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado ao importar.");
    } finally {
      setEnviando(false);
    }
  }

  const linhas = csv ? preverLinhas(csv) : [];

  return (
    <div className="crm-modal-overlay" onClick={onFechar}>
      <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="crm-modal-head">
          <span className="crm-modal-title">Importar planilha</span>
          <button type="button" className="crm-icon-btn" onClick={onFechar} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="crm-modal-body">
          {erro && <div className="crm-error">{erro}</div>}

          <div
            className={`crm-drop-zone${arrastando ? " is-active" : ""}`}
            onClick={() => inputArquivoRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastando(false);
              const arquivo = e.dataTransfer.files?.[0];
              if (arquivo) lerArquivo(arquivo);
            }}
          >
            <strong>Clique para escolher</strong> ou arraste aqui o arquivo .csv exportado da sua planilha
            <input
              ref={inputArquivoRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) lerArquivo(arquivo);
              }}
            />
          </div>

          <div className="crm-field">
            <label className="crm-label">Ou cole o conteúdo do CSV</label>
            <textarea
              className="crm-textarea"
              style={{ minHeight: 110, fontFamily: "monospace", fontSize: 12.5 }}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              placeholder="Nome,Valor em aberto,Quantidade de parcelas,CNPJ,Telefone,Email,Sindicato patronal,Etapa"
            />
            <p className="crm-hint">
              Primeira linha = cabeçalho. Colunas reconhecidas: Nome (obrigatório), Valor em aberto, Quantidade de parcelas, Quantidade de
              colaboradores, CNPJ, Telefone, Telefone 2, Email, Sindicato patronal, Origem, Observações e Etapa. Colunas extras que você
              adicionar são guardadas junto do lead mesmo sem estar nessa lista.
            </p>
          </div>

          {linhas.length > 0 && (
            <div className="crm-import-preview">
              <table>
                <thead>
                  <tr>
                    {linhas[0].map((c, i) => (
                      <th key={i}>{c || `Coluna ${i + 1}`}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linhas.slice(1).map((linha, i) => (
                    <tr key={i}>
                      {linha.map((c, j) => (
                        <td key={j}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="crm-modal-footer" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="crm-btn crm-btn-ghost" onClick={onFechar}>
            Cancelar
          </button>
          <button type="button" className="crm-btn crm-btn-primary" onClick={importar} disabled={enviando}>
            {enviando ? "Importando..." : "Importar"}
          </button>
        </div>
      </div>
    </div>
  );
}
