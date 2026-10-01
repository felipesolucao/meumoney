import { exigirSessao } from '../../../lib/auth';
import NegociacoesPagina from '../../../components/crm/NegociacoesPagina';
export default async function Page() {
  const sessao = await exigirSessao();
  return <NegociacoesPagina nomeUsuario={sessao.nome} />;
}
