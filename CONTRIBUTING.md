# Contribuindo

Obrigado pelo interesse! Issues e pull requests são bem-vindos.

1. Faça um fork e crie uma branch: `git checkout -b minha-melhoria`
2. `pnpm install` e `pnpm dev` (web em :3000, API em :3333)
3. Antes de abrir o PR, rode `pnpm typecheck && pnpm test && pnpm build`
4. Descreva no PR o que mudou e, se for visual, anexe um print

**Ideias boas para começar** estão na seção [Roadmap](README.md#-roadmap) do README.
Mudanças no algoritmo de rota (`packages/shared/src/tsp.ts`) precisam vir com teste.
