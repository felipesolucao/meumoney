// ============================================================================
// PÁGINA: Menu
// ============================================================================
import Link from "next/link";
import {
  IconPlus,
  IconReceipt,
  IconWallet,
  IconCalendar,
  IconUser,
  IconDocument,
  IconChart,
} from "../../components/Icons";

const ITENS = [
  { href: "/financeiro/novo", icon: IconPlus, label: "Novo lançamento", desc: "Cadastrar uma receita ou despesa" },
  { href: "/financeiro/pagar", icon: IconReceipt, label: "Contas a pagar", desc: "Histórico de despesas" },
  { href: "/financeiro/receber", icon: IconWallet, label: "Contas a receber", desc: "Histórico de receitas" },
  { href: "/parcelas", icon: IconCalendar, label: "Parcelas", desc: "Ver todas as parcelas por período" },
  { href: "/clientes/novo", icon: IconUser, label: "Novo cliente", desc: "Cadastrar um novo cliente" },
  { href: "/contratos/novo", icon: IconDocument, label: "Novo contrato", desc: "Criar um novo empréstimo" },
  { href: "/relatorios", icon: IconChart, label: "Relatórios", desc: "Visão geral da carteira" },
];

export default function Menu() {
  return (
    <div>
      <div className="header-gradient">
        <h1 className="text-2xl font-bold">Menu</h1>
        <p className="text-muted text-sm">Acesso rápido e suporte</p>
      </div>

      <div className="px-5 mt-5 space-y-3">
        {ITENS.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="card flex items-center gap-3 block">
              <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-primary flex-shrink-0">
                <Icon size={20} />
              </div>
              <div>
                <p className="font-bold">{item.label}</p>
                <p className="text-sm text-muted">{item.desc}</p>
              </div>
            </Link>
          );
        })}

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
