// ============================================================
// 📡 API DE CONSULTA CNPJ
// ============================================================
// open.cnpja.com — formato canônico .company, sem autenticação.
// Versão pública: 5 consultas/minuto. Rate limiter global gerencia isso.
// Quando falhar, o CNPJ é marcado para revisão manual (sem fallback).
const OPEN_CNPJA_URL = 'https://open.cnpja.com/office/';

// 🆔 LIMPEZA DE DOCUMENTO (CNPJ/CPF) — preparado para o CNPJ alfanumérico
// da Receita Federal (novos CNPJs emitidos a partir de 2026 podem ter letras
// A-Z nos 12 primeiros caracteres; os 2 dígitos verificadores continuam numéricos).
// Por isso NÃO usamos mais \D (que descartaria as letras) — mantemos letras e
// números e removemos só a máscara (pontos, barra, traço, espaços).
const limparDocumento = (doc) => String(doc || '').toUpperCase().replace(/[^0-9A-Z]/g, '');

// ============================================================
// 🚦 RATE LIMITER GLOBAL — compartilhado por TODAS as rotinas
// ============================================================
// open.cnpja.com (versão pública) permite 5 consultas/minuto por IP.
// Implementação: janela deslizante de timestamps. Antes de cada chamada,
// remove timestamps fora da janela de 60s. Se sobrar 5 ou mais, espera
// até a mais antiga sair da janela. Sempre adiciona o timestamp atual.
//
// Por ser declarado fora do componente, sobrevive a re-renders e é compartilhado
// entre consulta individual, lote de consulta e reprocessamento.
const RATE_LIMITER = {
    timestamps: [],              // últimas chamadas à open.cnpja (em ms)
    JANELA_MS: 60 * 1000,        // janela deslizante de 60 segundos
    LIMITE_NA_JANELA: 5,         // máximo de consultas dentro da janela
    ESPACAMENTO_MIN_MS: 12000,   // espaçamento mínimo entre chamadas consecutivas (60s/5 = 12s)
    BACKOFF_429: [30000, 60000, 120000], // 30s, 60s, 120s — usado quando vier 429

    // Espera o necessário pra respeitar o limite, depois marca a chamada atual
    // Dois critérios combinados:
    //   1. Janela deslizante: máximo 5 chamadas nos últimos 60s
    //   2. Espaçamento mínimo: pelo menos 12s entre chamadas consecutivas
    // O segundo previne burst inicial que estouraria o rate limit do servidor.
    esperarVez: async function() {
        while (true) {
            const agora = Date.now();
            // Limpa timestamps fora da janela
            this.timestamps = this.timestamps.filter(t => agora - t < this.JANELA_MS);

            // Critério 1: janela cheia → esperar mais antigo sair
            if (this.timestamps.length >= this.LIMITE_NA_JANELA) {
                const maisAntigo = this.timestamps[0];
                const esperaMs = this.JANELA_MS - (agora - maisAntigo) + 50;
                console.log(`🚦 Rate limit (janela cheia): aguardando ${(esperaMs/1000).toFixed(1)}s`);
                await new Promise(r => setTimeout(r, esperaMs));
                continue;
            }

            // Critério 2: espaçamento mínimo desde a última chamada
            if (this.timestamps.length > 0) {
                const ultima = this.timestamps[this.timestamps.length - 1];
                const desdeUltima = agora - ultima;
                if (desdeUltima < this.ESPACAMENTO_MIN_MS) {
                    const esperaMs = this.ESPACAMENTO_MIN_MS - desdeUltima;
                    console.log(`🚦 Rate limit (espaçamento): aguardando ${(esperaMs/1000).toFixed(1)}s`);
                    await new Promise(r => setTimeout(r, esperaMs));
                    continue;
                }
            }

            // Liberado: marca timestamp e retorna
            this.timestamps.push(agora);
            return;
        }
    },

    // Quando vier 429, executa backoff exponencial e descarta a janela
    // (a janela do nosso lado parece ok, mas o servidor não concorda - melhor zerar e esperar bastante)
    backoff: async function(tentativa) {
        const esperaMs = this.BACKOFF_429[Math.min(tentativa, this.BACKOFF_429.length - 1)];
        console.warn(`🚦 Recebido 429 (tentativa ${tentativa + 1}). Esperando ${esperaMs/1000}s antes de tentar novamente...`);
        await new Promise(r => setTimeout(r, esperaMs));
        this.timestamps = [];   // zera a janela depois do backoff
    }
};

// Função única de consulta com retry automático em 429.
// Retorna { ok, status, data } - encapsula toda a lógica de rate limit + backoff.
const consultarOpenCnpjaComRetry = async (cnpj) => {
    const MAX_TENTATIVAS = 3;
    for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
        await RATE_LIMITER.esperarVez();
        try {
            const r = await fetch(`${OPEN_CNPJA_URL}${cnpj}?simples=true`);
            if (r.status === 429) {
                if (tentativa < MAX_TENTATIVAS - 1) {
                    await RATE_LIMITER.backoff(tentativa);
                    continue;
                }
                return { ok: false, status: 429, data: null };
            }
            if (r.ok) {
                const data = await r.json();
                return { ok: true, status: r.status, data };
            }
            return { ok: false, status: r.status, data: null };
        } catch (e) {
            if (tentativa === MAX_TENTATIVAS - 1) throw e;
            console.warn(`⚠️ Erro de rede tentativa ${tentativa + 1}:`, e.message);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
    return { ok: false, status: 0, data: null };
};

// 🔄 NORMALIZADOR — converte resposta de QUALQUER API CNPJ pro formato esperado pelo app.
// Formato alvo (mesmo que open.cnpja já usa):
//   { company: { simei: { optant }, simples: { optant }, size: { acronym }, name, nature }, status: { text } }
const normalizarRespostaCNPJ = (raw, fonte) => {
    if (!raw) return null;

    // 🎯 HEURÍSTICA MEI compartilhada (aplicada nos dois caminhos do normalizador)
    // Razão social padrão "XX.XXX.XXX NOME": Receita gera assim pra MEI/EI sem nome fantasia.
    // Aplicada SOMENTE quando: API não confirmou MEI E API não confirmou Simples.
    const aplicarHeuristicaMEI = (objetoNormalizado) => {
        if (!objetoNormalizado?.company) return objetoNormalizado;
        const jaEhMEI = objetoNormalizado.company.simei?.optant === true;
        const ehSimples = objetoNormalizado.company.simples?.optant === true;
        if (jaEhMEI || ehSimples) return objetoNormalizado;
        const razao = objetoNormalizado.company.name || '';
        const padraoMEI = /^\d{2}\.\d{3}\.\d{3}\s+[A-ZÀ-Ú]/;
        if (typeof razao === 'string' && padraoMEI.test(razao.trim().toUpperCase())) {
            console.log(`🎯 Heurística MEI ativada: "${razao}" (API não confirmou; padrão de razão social bate).`);
            return {
                ...objetoNormalizado,
                company: {
                    ...objetoNormalizado.company,
                    simei: { optant: true }
                },
                _heuristicaMEI: true
            };
        }
        return objetoNormalizado;
    };

    // Se já está no formato CNPJá (tem .company), aplica heurística e retorna
    if (raw.company && (raw.company.simei !== undefined || raw.company.simples !== undefined || raw.company.size)) {
        return aplicarHeuristicaMEI(raw);
    }

    // Helper: extrai true/false/undefined de várias formas (true, false, "Sim", "Não", "true", "false", "S", "N")
    const toBool = (v) => {
        if (v === true || v === false) return v;
        if (v === null || v === undefined) return undefined;
        const s = String(v).trim().toLowerCase();
        if (s === 'true' || s === 'sim' || s === 's' || s === '1' || s === 'optante') return true;
        if (s === 'false' || s === 'nao' || s === 'não' || s === 'n' || s === '0' || s === 'nao optante' || s === 'não optante') return false;
        return undefined;
    };

    // 📋 EXTRAÇÃO Simples/MEI — atualmente usado: open.cnpja.com.
    // Aliases extras mantidos como defesa (caso uma fonte secundária seja reintroduzida).
    //
    // open.cnpja.com:    company.simples.optant (boolean) / company.simei.optant
    // (genérico/defesa): simples_nacional.optante, opcao_pelo_simples, mei.optante, etc.
    const simplesContainer =
        raw.simples_nacional ||
        raw.simplesNacional ||
        raw.simples ||
        raw.regime_simples ||
        raw.regimeSimples ||
        {};
    const meiContainer =
        raw.simei ||
        raw.mei ||
        raw.microempreendedor_individual ||
        raw.microempreendedorIndividual ||
        {};

    // Para Simples: tenta vários paths, incluindo brasilapi (raw.opcao_pelo_simples direto na raiz)
    const simplesOpt = toBool(
        raw.opcao_pelo_simples ??           // ← brasilapi
        simplesContainer.optante ??
        simplesContainer.optant ??
        simplesContainer.isOptante ??
        simplesContainer.simples            // ← cnpj.ws: raw.simples.simples = "Sim"/"Não"
    ) ?? false;

    // Para MEI: idem, incluindo brasilapi (raw.opcao_pelo_mei direto na raiz)
    const meiOpt = toBool(
        raw.opcao_pelo_mei ??               // ← brasilapi
        meiContainer.optante ??
        meiContainer.optant ??
        meiContainer.isOptante ??
        meiContainer.mei ??                 // ← cnpj.ws: raw.simples.mei = "Sim"/"Não"
        simplesContainer.mei
    ) ?? false;

    // Porte — parsing textual (sem inferir MEI a partir do porte: SIMEI é fonte da verdade pra MEI).
    // Aqui só normalizamos acrônimo de PORTE: ME, EPP ou DEMAIS.
    // open.cnpja:       company.size.acronym ("ME"/"EPP"/"DEMAIS")
    // publica.cnpj.ws:  porte.descricao ("Micro Empresa"/"Empresa de Pequeno Porte"/"Demais")
    // brasilapi:        porte (string direto: "ME"/"EPP"/"DEMAIS")
    const porteRaw =
        (typeof raw.porte === 'string' ? raw.porte : raw.porte?.descricao) ||
        raw.size?.acronym ||
        raw.size?.text ||
        raw.porte_empresa ||
        '';
    let porteAcronym = '';
    if (typeof porteRaw === 'string' && porteRaw.trim() !== '') {
        const p = porteRaw.toUpperCase();
        if (p.includes('MICRO') || /\bME\b/.test(p)) porteAcronym = 'ME';
        else if (p.includes('PEQUENO') || /\bEPP\b/.test(p)) porteAcronym = 'EPP';
        else porteAcronym = 'DEMAIS';
    }

    // Situação cadastral — múltiplos paths
    // brasilapi: descricao_situacao_cadastral
    const situacao =
        raw.descricao_situacao_cadastral ||  // ← brasilapi
        raw.situacao ||
        raw.situacao_cadastral ||
        raw.estabelecimento?.situacao_cadastral ||
        raw.status?.text ||
        raw.status ||
        '';
    const razao = raw.razao_social || raw.razaoSocial || raw.nome || raw.name || raw.company?.name || '';
    const naturezaId =
        raw.codigo_natureza_juridica ||     // ← brasilapi
        raw.natureza_juridica?.id ||
        raw.natureza_juridica?.codigo ||
        raw.naturezaJuridica?.codigo ||
        raw.nature?.id ||
        '';

    // 🚨 DETECÇÃO DE DADOS NULOS CRÍTICOS
    // Quando a API retorna 200 OK mas com porte E simples ambos null/vazios,
    // significa que o CNPJ existe mas a Receita ainda não publicou dados completos.
    // Marca pra revisão manual em vez de chutar "DEMAIS/Lucro Presumido".
    const porteVeioVazio = porteRaw === '' || porteRaw === null || porteRaw === undefined ||
                            (raw.porte === null) || (raw.porte?.descricao === null);
    const simplesVeioNulo = raw.simples === null || raw.simples_nacional === null ||
                             (raw.opcao_pelo_simples === null && raw.opcao_pelo_mei === null);
    const dadosCriticosFaltando = porteVeioVazio && simplesVeioNulo;

    const normalizado = {
        company: {
            name: razao,
            size: { acronym: porteAcronym, text: porteRaw },
            simples: { optant: simplesOpt },
            simei: { optant: meiOpt },
            nature: { id: naturezaId }
        },
        status: { text: typeof situacao === 'string' ? situacao : (situacao?.nome || situacao?.text || '') },
        _fonte: fonte,
        _raw: raw,
        _dadosCriticosFaltando: dadosCriticosFaltando
    };

    if (dadosCriticosFaltando) {
        console.warn(`🚨 ${fonte} retornou OK mas dados críticos vieram nulos (porte+simples). CNPJ provavelmente recém-aberto. Marcando para revisão manual.`);
    }

    return aplicarHeuristicaMEI(normalizado);
};

// 🎯 HELPERS DE CLASSIFICAÇÃO — fonte única de verdade pra todo o app.
// Não inferir MEI/Simples de outras formas; sempre passar pelos helpers.
const isMEI = (empresa) => empresa?.company?.simei?.optant === true;
const isSimples = (empresa) => empresa?.company?.simples?.optant === true;
