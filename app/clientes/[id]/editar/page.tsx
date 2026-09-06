// ============================================================================
// PÁGINA: Editar cliente
// ----------------------------------------------------------------------------
// Formulário completo de edição — inclui os campos que "Novo cliente" não
// pede de cara (nome/telefone/cpf/score bastam para cadastrar rápido), mas
// que fazem falta depois: e-mail, documento, endereço, situação, referência
// e observações internas. Tudo fica registrado no Histórico ao salvar.
// ============================================================================
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BotaoVoltar from "../../../../components/BotaoVoltar";
import { IconTrash } from "../../../../components/Icons";

type ClienteDetalhe = {
  id: string;
  nome: string;
  telefone: string | null;
  telefone2: string | null;
  email: string | null;
  cpf: string | null;
  rg: string | null;
  dataNascimento: string | null;
  score: "baixo" | "medio" | "alto";
  situacao: "ativo" | "inadimplente" | "inativo";
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  referencia: string | null;
  observacoes: string | null;
};

const CAMPO_VAZIO = "";

export default function EditarClientePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState("");

  const [dados, setDados] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`/api/clientes/${params.id}`)
      .then((r) => r.json())
      .then((c: ClienteDetalhe) => {
        setDados({
          nome: c.nome || CAMPO_VAZIO,
          telefone: c.telefone || CAMPO_VAZIO,
          telefone2: c.telefone2 || CAMPO_VAZIO,
          email: c.email || CAMPO_VAZIO,
          cpf: c.cpf || CAMPO_VAZIO,
          rg: c.rg || CAMPO_VAZIO,
          dataNascimento: c.dataNascimento ? c.dataNascimento.slice(0, 10) : CAMPO_VAZIO,
          score: c.score || "medio",
          situacao: c.situacao || "ativo",
          cep: c.cep || CAMPO_VAZIO,
          logradouro: c.logradouro || CAMPO_VAZIO,
          numero: c.numero || CAMPO_VAZIO,
          complemento: c.complemento || CAMPO_VAZIO,
          bairro: c.bairro || CAMPO_VAZIO,
          cidade: c.cidade || CAMPO_VAZIO,
          uf: c.uf || CAMPO_VAZIO,
          referencia: c.referencia || CAMPO_VAZIO,
          observacoes: c.observacoes || CAMPO_VAZIO,
        });
        setCarregando(false);
      });
  }, [params.id]);

  function set(campo: string, valor: string) {
    setDados((d) => ({ ...d, [campo]: valor }));
  }

  async function salvar() {
    if (!dados.nome?.trim()) return setErro("Informe o nome do cliente.");
    setErro("");
    setSalvando(true);
    const res = await fetch(`/api/clientes/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    setSalvando(false);
    if (res.ok) {
      router.push(`/clientes/${params.id}`);
    } else {
      const data = await res.json();
      setErro(data.error || "Não foi possível salvar as alterações.");
    }
  }

  async function excluir() {
    if (!window.confirm("Tem certeza que deseja excluir este cliente? Isso também apaga os contratos vinculados a ele.")) return;
    setExcluindo(true);
    const res = await fetch(`/api/clientes/${params.id}`, { method: "DELETE" });
    setExcluindo(false);
    if (res.ok) router.push("/clientes");
  }

  if (carregando) {
    return (
      <div>
        <div className="header-gradient flex items-center gap-3">
          <BotaoVoltar href="/clientes" />
          <h1 className="text-2xl font-bold">Editar cliente</h1>
        </div>
        <p className="text-center text-muted text-sm py-10">Carregando...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="header-gradient flex items-center gap-3">
        <BotaoVoltar href={`/clientes/${params.id}`} />
        <h1 className="text-2xl font-bold">Editar cliente</h1>
      </div>

      <div className="px-5 mt-6 space-y-5">
        <Secao titulo="DADOS PESSOAIS">
          <Campo label="Nome completo" value={dados.nome} onChange={(v) => set("nome", v)} />
          <Campo label="Telefone" value={dados.telefone} onChange={(v) => set("telefone", v)} placeholder="(62) 99999-9999" />
          <Campo label="Telefone secundário" value={dados.telefone2} onChange={(v) => set("telefone2", v)} placeholder="(62) 98888-8888" />
          <Campo label="E-mail" value={dados.email} onChange={(v) => set("email", v)} placeholder="cliente@email.com" tipo="email" />
          <Campo label="CPF/CNPJ" value={dados.cpf} onChange={(v) => set("cpf", v)} placeholder="000.000.000-00" />
          <Campo label="RG" value={dados.rg} onChange={(v) => set("rg", v)} />
          <Campo label="Data de nascimento" value={dados.dataNascimento} onChange={(v) => set("dataNascimento", v)} tipo="date" />
        </Secao>

        <Secao titulo="ENDEREÇO">
          <Campo label="CEP" value={dados.cep} onChange={(v) => set("cep", v)} placeholder="00000-000" />
          <Campo label="Logradouro" value={dados.logradouro} onChange={(v) => set("logradouro", v)} placeholder="Rua, avenida..." />
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Número" value={dados.numero} onChange={(v) => set("numero", v)} />
            <Campo label="Complemento" value={dados.complemento} onChange={(v) => set("complemento", v)} />
          </div>
          <Campo label="Bairro" value={dados.bairro} onChange={(v) => set("bairro", v)} />
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Cidade" value={dados.cidade} onChange={(v) => set("cidade", v)} />
            <Campo label="UF" value={dados.uf} onChange={(v) => set("uf", v.toUpperCase().slice(0, 2))} placeholder="GO" />
          </div>
        </Secao>

        <Secao titulo="SCORE DE CRÉDITO">
          <div className="grid grid-cols-3 gap-2">
            {[
              { valor: "baixo", label: "Baixo" },
              { valor: "medio", label: "Médio" },
              { valor: "alto", label: "Alto" },
            ].map((opt) => (
              <button
                key={opt.valor}
                type="button"
                onClick={() => set("score", opt.valor)}
                className={dados.score === opt.valor ? "btn-primary !py-3" : "btn-outline !py-3"}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Secao>

        <Secao titulo="SITUAÇÃO CADASTRAL">
          <div className="grid grid-cols-3 gap-2">
            {[
              { valor: "ativo", label: "Ativo" },
              { valor: "inadimplente", label: "Inadimplente" },
              { valor: "inativo", label: "Inativo" },
            ].map((opt) => (
              <button
                key={opt.valor}
                type="button"
                onClick={() => set("situacao", opt.valor)}
                className={dados.situacao === opt.valor ? "btn-primary !py-3 text-xs" : "btn-outline !py-3 text-xs"}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Secao>

        <Secao titulo="OUTRAS INFORMAÇÕES">
          <Campo label="Indicado por" value={dados.referencia} onChange={(v) => set("referencia", v)} placeholder="Nome de quem indicou (opcional)" />
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted mb-2">Observações internas</p>
            <textarea
              value={dados.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
              rows={4}
              placeholder="Notas privadas — não aparecem em PDF nem WhatsApp"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 outline-none focus:border-primary"
            />
          </div>
        </Secao>

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
          <IconTrash size={16} /> {excluindo ? "Excluindo..." : "Excluir cliente"}
        </button>
      </div>
    </div>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-4" style={{ background: "#F6FAF7" }}>
      <p className="text-xs font-semibold tracking-wide text-muted">{titulo}</p>
      {children}
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  tipo = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  tipo?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted mb-2">{label}</p>
      <input
        type={tipo}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-gray-200 px-4 py-3.5 outline-none focus:border-primary bg-white"
      />
    </div>
  );
}
