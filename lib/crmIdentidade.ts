import { normalizarCodigo, normalizarDocumento, normalizarNome } from './crmDebitos';
type Empresa = { codigo?: string | null; cnpj?: string | null; nome: string };
// Nome sozinho só identifica empresas sem código nem documento.
export function chavesEmpresa(e: Empresa): string[] {
  const codigo = normalizarCodigo(e.codigo ?? '');
  const documento = normalizarDocumento(e.cnpj ?? '');
  return [codigo && `codigo:${codigo}`, documento && `doc:${documento}`,
    !codigo && !documento && `nome:${normalizarNome(e.nome)}`].filter(Boolean) as string[];
}
export function criarIndiceEmpresas(empresas: Empresa[]) {
  const chaves = new Set(empresas.flatMap(chavesEmpresa));
  return {
    contem: (e: Empresa) => chavesEmpresa(e).some(c => chaves.has(c)),
    adicionar: (e: Empresa) => chavesEmpresa(e).forEach(c => chaves.add(c)),
  };
}
