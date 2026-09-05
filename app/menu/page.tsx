// ============================================================================
// PÁGINA: Menu
// ============================================================================
import Link from "next/link";

const ITENS = [
  { href: "/parcelas", icone: "🧾", label: "Parcelas", desc: "Ver todas as parcelas por período" },
  { href: "/clientes/novo", icone: "👤", label: "Novo cliente", desc: "Cadastrar um novo cliente" },
  { href: "/contratos/novo", icone: "📄", label: "Novo contrato", desc: "Criar um novo empréstimo" },
  { href: "/relatorios", icone: "📈", label: "Relatórios", desc: "Visão geral da carteira" },
];

export default function Menu() {
  return (
    <div>
      <div className="header-gradient">
        <h1 className="text-2xl font-bold">Menu</h1>
        <p className="text-muted text-sm">Acesso rápido e suporte</p>
      </div>

      <div className="px-5 mt-5 space-y-3">
        {ITENS.map((item) => (
          <Link key={item.href} href={item.href} className="card flex items-center gap-3 block">
            <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-xl">
              {item.icone}
            </div>
            <div>
              <p className="font-bold">{item.label}</p>
              <p className="text-sm text-muted">{item.desc}</p>
            </div>
          </Link>
        ))}

        <div className="card">
          <p className="font-bold">Suporte</p>
          <p className="text-sm text-muted mt-1">
            Dúvidas ou problemas com o app? Entre em contato com o administrador do sistema.
          </p>
        </div>
      </div>
    </div>
  );
}
