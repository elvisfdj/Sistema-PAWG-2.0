function Taxas({ valorUfica, setValorUfica }) {
    const [list, setList] = useState([]);
    const [mes, setMes] = useState(new Date().getMonth());
    const [ano, setAno] = useState(new Date().getFullYear());
    const [consultandoQueue, setConsultandoQueue] = useState([]);
    const [consultasRealizadas, setConsultasRealizadas] = useState(0);
    const [abaAtiva, setAbaAtiva] = useState('principal');
    const [modalInserir, setModalInserir] = useState(false);
    const [formInserir, setFormInserir] = useState({ inscricao: '', documento: '', nome: '' });
    const [modalInserirFalta, setModalInserirFalta] = useState(false);
    const [faltaSelecionada, setFaltaSelecionada] = useState(null);
    const [modoVisualizacao, setModoVisualizacao] = useState('mensal');
    const [periodoInicio, setPeriodoInicio] = useState(0);
    const [periodoFim, setPeriodoFim] = useState(11);
    const [marcadores, setMarcadores] = useState({});
    const [menuCorAberto, setMenuCorAberto] = useState(null);

    // ── Estados para revelar Endereço (CTRL + hover na linha) ──
    const [ctrlPressionado, setCtrlPressionado] = useState(false);
    const [linhaHoverEndereco, setLinhaHoverEndereco] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const onKeyDown = (e) => { if (e.key === 'Control') setCtrlPressionado(true); };
        const onKeyUp = (e) => { if (e.key === 'Control') setCtrlPressionado(false); };
        const onBlur = () => setCtrlPressionado(false);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', onBlur);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('blur', onBlur);
        };
    }, []);

    // ── Estados para modal de observação ───────────────
    const [modalObservacao, setModalObservacao] = useState(null); // { id, observacao, razaoSocial }
    const [observacaoTexto, setObservacaoTexto] = useState('');

    // ── Estados para Faltas e Ordenação ────────────────
    const [faltas, setFaltas] = useState([]);
    const [consultandoFaltas, setConsultandoFaltas] = useState(false);
    const [carregandoFaltas, setCarregandoFaltas] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // ── Estados para Filtros Avançados ─────────────────
    const [filtros, setFiltros] = useState({
        busca: '',
        auditor: '',
        situacao: '',
        tributacao: '',
        apenasVerificados: false,
        apenasPendentes: false
    });

    // ── Estados para intervalo dinâmico ─────────────────
    const [intervaloInicio, setIntervaloInicio] = useState('');
    const [intervaloFim, setIntervaloFim] = useState('');

    // ── Estados para Reprocessamento ───────────────────
    const [modalReprocessar, setModalReprocessar] = useState(false);
    const [opcoesReproc, setOpcoesReproc] = useState({ visa: true, porte: true, trib: true });
    const [rodando, setRodando] = useState(false);

    // PROGRESSO
    const [processando, setProcessando] = useState(false);
    const [processoTitulo, setProcessoTitulo] = useState('');
    const [processoAtual, setProcessoAtual] = useState(0);
    const [processoTotal, setProcessoTotal] = useState(0);
    const [processoItemAtual, setProcessoItemAtual] = useState('');
    const [processoTempoEstimado, setProcessoTempoEstimado] = useState('');
    const [processoAviso, setProcessoAviso] = useState(''); // Avisos temporários (404, 429, etc)

    // PESQUISA RÁPIDA
    const [pesquisaRapida, setPesquisaRapida] = useState('');
    const [buscandoGlobal, setBuscandoGlobal] = useState(false);

    const valorUficaAtual = valorUfica[ano] || VALOR_UFICA_2026;

    useEffect(() => {
        let listeners = [];

        const carregarDados = async () => {
            try {
                console.log('🔄 Carregando:', { modoVisualizacao, ano, mes });

                if (modoVisualizacao === 'mensal') {
                    // ✅ MODO TEMPO REAL: Usar .on() em vez de .once()
                    const chave = `contribuintes/${ano}/${mes}`;
                    const ref = db.ref(chave);
                    
                    const listener = ref.on('value', (snapshot) => {
                        const data = snapshot.val();

                        if (data && typeof data === 'object') {
                            const lista = Object.entries(data)
                                .filter(([k, v]) => v && typeof v === 'object')
                                .map(([k, v]) => ({ id: k, ...v }));
                            setList(lista);

                            const marks = {};
                            lista.forEach(item => {
                                if (item && item.marcador) marks[item.id] = item.marcador;
                            });
                            setMarcadores(marks);

                            const inscricoesNumericas = lista
                                .filter(item => item && item.inscricaoMunicipal)
                                .map(item => item.inscricaoMunicipal.trim())
                                .filter(insc => insc && !isNaN(insc))
                                .map(insc => Number(insc));

                            if (inscricoesNumericas.length > 0) {
                                const minInscricao = Math.min(...inscricoesNumericas);
                                const maxInscricao = Math.max(...inscricoesNumericas);
                                setIntervaloInicio(String(minInscricao));
                                setIntervaloFim(String(maxInscricao));
                            }
                        } else {
                            console.warn('⚠️ Sem dados para', chave);
                            setList([]);
                            setMarcadores({});
                        }
                    });

                    listeners.push({ ref, listener });


                } else if (modoVisualizacao === 'anual') {
                    // Modo anual: carregar todos os meses do ano
                    const listaCombinada = [];
                    const marksCombinados = {};

                    for (let m = 0; m <= 11; m++) {
                        const snapshot = await db.ref(`contribuintes/${ano}/${m}`).once('value');
                        const data = snapshot.val();

                        // ✅ VALIDAÇÃO: Verificar se data existe e é objeto
                        if (data && typeof data === 'object') {
                            Object.entries(data).forEach(([k, v]) => {
                                // ✅ VALIDAÇÃO: Verificar se v é objeto válido
                                if (v && typeof v === 'object') {
                                    listaCombinada.push({ id: k, ...v, mesOrigem: m });
                                    if (v.marcador) marksCombinados[k] = v.marcador;
                                }
                            });
                        }
                    }

                    console.log('✅ Anual:', listaCombinada.length, 'registros');
                    setList(listaCombinada);
                    setMarcadores(marksCombinados);

                } else if (modoVisualizacao === 'periodo') {
                    // Modo período: carregar meses do período selecionado
                    const listaCombinada = [];
                    const marksCombinados = {};

                    // ✅ VALIDAÇÃO: Garantir valores válidos
                    const inicio = Math.min(Math.max(0, periodoInicio || 0), 11);
                    const fim = Math.min(Math.max(0, periodoFim || 11), 11);
                    const mesInicio = Math.min(inicio, fim);
                    const mesFim = Math.max(inicio, fim);

                    for (let m = mesInicio; m <= mesFim; m++) {
                        const snapshot = await db.ref(`contribuintes/${ano}/${m}`).once('value');
                        const data = snapshot.val();

                        // ✅ VALIDAÇÃO: Verificar se data existe e é objeto
                        if (data && typeof data === 'object') {
                            Object.entries(data).forEach(([k, v]) => {
                                // ✅ VALIDAÇÃO: Verificar se v é objeto válido
                                if (v && typeof v === 'object') {
                                    listaCombinada.push({ id: k, ...v, mesOrigem: m });
                                    if (v.marcador) marksCombinados[k] = v.marcador;
                                }
                            });
                        }
                    }

                    console.log('✅ Período:', listaCombinada.length, 'registros');
                    setList(listaCombinada);
                    setMarcadores(marksCombinados);
                }
            } catch (error) {
                console.error('❌ Erro ao carregar dados:', error);
                // ✅ NÃO deixar tela branca - mostrar lista vazia
                setList([]);
                setMarcadores({});
                alert('Erro ao carregar dados do ano ' + ano + ':\n' + error.message);
            }
        };

        carregarDados();

        // ✅ CLEANUP: Desconectar listeners ao trocar mês/ano/modo
        return () => {
            listeners.forEach(({ ref, listener }) => {
                ref.off('value', listener);
            });
        };
    }, [mes, ano, modoVisualizacao, periodoInicio, periodoFim]);

    // Carregar faltas do Firebase
    useEffect(() => {
        setCarregandoFaltas(true);
        const chaveFaltas = `contribuintes/_faltas_${ano}_${mes}`;
        const refFaltas = db.ref(chaveFaltas);

        console.log('🔄 Carregando faltas de:', chaveFaltas);

        const listener = refFaltas.on('value', (snap) => {
            const data = snap.val();
            console.log('📥 Dados de faltas recebidos:', data);

            if (data) {
                const listaFaltas = Object.entries(data).map(([k, v]) => ({ id: k, ...v }));
                console.log('📋 Faltas processadas:', listaFaltas.length, 'itens');
                setFaltas(listaFaltas);
            } else {
                console.log('⚠️ Nenhuma falta encontrada no Firebase');
                setFaltas([]);
            }
            setCarregandoFaltas(false);
        });

        return () => {
            console.log('🔌 Desconectando listener de faltas');
            refFaltas.off('value', listener);
        };
    }, [mes, ano]);

    // ============================================
    // BUSCA GLOBAL (todos os meses)
    // ============================================
    useEffect(() => {
        const buscarGlobal = async () => {
            if (!pesquisaRapida || pesquisaRapida.trim().length < 2) {
                // Se não tem pesquisa, não faz nada (usa o mês atual)
                return;
            }

            setBuscandoGlobal(true);
            const termo = pesquisaRapida.trim().toLowerCase();
            const resultados = [];

            try {
                // Buscar em TODOS os meses do ano atual
                for (let m = 0; m <= 11; m++) {
                    const snapshot = await db.ref(`contribuintes/${ano}/${m}`).once('value');
                    const data = snapshot.val();

                    if (data && typeof data === 'object') {
                        Object.entries(data).forEach(([k, v]) => {
                            if (v && typeof v === 'object') {
                                const item = { id: k, ...v, mesOrigem: m };
                                
                                // Verificar se corresponde ao termo de busca
                                const matchDoc = item.documento && item.documento.replace(/\D/g, '').includes(termo.replace(/\D/g, ''));
                                const matchInsc = item.inscricaoMunicipal && item.inscricaoMunicipal.toLowerCase().includes(termo);
                                const matchNome = item.razaoSocial && item.razaoSocial.toLowerCase().includes(termo);
                                
                                if (matchDoc || matchInsc || matchNome) {
                                    resultados.push(item);
                                }
                            }
                        });
                    }
                }

                // Atualizar lista com resultados da busca global
                if (resultados.length > 0) {
                    setList(resultados);
                    console.log(`🔍 Busca global encontrou ${resultados.length} resultado(s)`);
                } else {
                    setList([]);
                    console.log('🔍 Busca global: nenhum resultado');
                }
            } catch (error) {
                console.error('Erro na busca global:', error);
            } finally {
                setBuscandoGlobal(false);
            }
        };

        // Debounce: aguardar 500ms após parar de digitar
        const timer = setTimeout(buscarGlobal, 500);
        return () => clearTimeout(timer);
    }, [pesquisaRapida, ano]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedList = () => {
        // ✅ SEMPRE ordenar por inscrição municipal crescente
        return [...list].sort((a, b) => {
            const inscA = Number(a.inscricaoMunicipal) || 0;
            const inscB = Number(b.inscricaoMunicipal) || 0;
            return inscA - inscB;
        });
    };

    const consultarFaltas = async () => {
        setConsultandoFaltas(true);
        setFaltas([]);

        if (!intervaloInicio || !intervaloFim || isNaN(intervaloInicio) || isNaN(intervaloFim)) {
            alert('Preencha os campos "Início" e "Fim" com números válidos.');
            setConsultandoFaltas(false);
            return;
        }

        const inicio = Number(intervaloInicio);
        const fim = Number(intervaloFim);

        if (inicio > fim) {
            alert('O início deve ser menor ou igual ao fim.');
            setConsultandoFaltas(false);
            return;
        }

        if (fim - inicio > 2000) {
            alert('Intervalo muito grande (> 2000 itens). Por favor, reduza.');
            setConsultandoFaltas(false);
            return;
        }

        try {
            const inscricoesExistentesNoAno = new Set();

            for (let m = 0; m <= 11; m++) {
                const chave = `contribuintes/${ano}/${m}`;
                const snapshot = await db.ref(chave).once('value');
                const data = snapshot.val();
                if (data) {
                    Object.values(data).forEach(item => {
                        const inscr = item.inscricaoMunicipal?.trim();
                        if (inscr && inscr !== '') {
                            inscricoesExistentesNoAno.add(inscr);
                        }
                    });
                }
            }

            const inscricoesMesAtual = new Set(
                list
                    .filter(item => item.inscricaoMunicipal?.trim())
                    .map(item => item.inscricaoMunicipal.trim())
            );

            const intervaloEsperado = new Set();
            for (let i = inicio; i <= fim; i++) {
                intervaloEsperado.add(String(i));
            }

            const faltandoNoMes = [...intervaloEsperado].filter(inscr => !inscricoesMesAtual.has(inscr));

            const faltasComInfo = [];

            for (const inscr of faltandoNoMes) {
                let encontradoEmOutroMes = null;
                let mesEncontrado = null;

                for (let m = 0; m <= 11; m++) {
                    if (m === mes) continue;
                    const chave = `contribuintes/${ano}/${m}`;
                    const snap = await db.ref(chave)
                        .orderByChild('inscricaoMunicipal')
                        .equalTo(inscr)
                        .limitToFirst(1)
                        .once('value');

                    const val = snap.val();
                    if (val) {
                        encontradoEmOutroMes = Object.values(val)[0];
                        mesEncontrado = m;
                        break;
                    }
                }

                faltasComInfo.push({
                    inscricaoMunicipal: inscr,
                    documento: encontradoEmOutroMes?.documento || '-',
                    razaoSocial: encontradoEmOutroMes?.razaoSocial || 'Não encontrado',
                    status: encontradoEmOutroMes
                        ? `Existe em ${MESES[mesEncontrado]}/${ano}`
                        : 'Não cadastrada em nenhum mês deste ano',
                });
            }

            setFaltas(faltasComInfo);

            // ✅ SALVAR AS FALTAS NO FIREBASE
            const chaveFaltas = `contribuintes/_faltas_${ano}_${mes}`;
            console.log('💾 Salvando faltas no Firebase:', chaveFaltas);

            // Limpar faltas antigas deste mês/ano primeiro
            await db.ref(chaveFaltas).remove();

            // Salvar cada falta
            for (const falta of faltasComInfo) {
                await db.ref(chaveFaltas).push(falta);
            }

            console.log('✅ Faltas salvas com sucesso no Firebase!');

            if (faltasComInfo.length === 0) {
                alert(`Nenhuma falta no intervalo ${inicio}–${fim} para ${MESES[mes]}/${ano}.`);
            } else {
                alert(`Encontradas ${faltasComInfo.length} faltas no intervalo informado!`);
            }
        } catch (err) {
            console.error('Erro ao consultar faltas:', err);
            alert('Erro ao consultar faltas: ' + err.message);
        } finally {
            setConsultandoFaltas(false);
        }
    };

    const salvarNoFirebase = async (contribuinte) => {
        const chave = `contribuintes/${ano}/${mes}`;
        await db.ref(chave).push(contribuinte);
    };

    const consultarCNPJ = async (cnpj, id) => {
        try {
            console.log('🔍 Iniciando consulta CNPJ:', cnpj, 'ID:', id);
            // (rate limit gerenciado pelo RATE_LIMITER global em consultarOpenCnpjaComRetry)

            let data = null;
            let fonteAPI = '';

            // 📡 ESTRATÉGIA: open.cnpja.com com rate limiter + retry em 429.
            // SEM fallback: se falhar, marca pra revisão manual em vez de classificar com dados parciais.
            // 404 → CNPJ não existe; outros erros → revisão manual.

            try {
                console.log('📡 Tentando open.cnpja.com...');
                const r1 = await consultarOpenCnpjaComRetry(cnpj);
                if (r1.ok) {
                    const norm1 = normalizarRespostaCNPJ(r1.data, 'open.cnpja');
                    const tem1 = norm1?.company?.simei?.optant !== undefined ||
                                 norm1?.company?.simples?.optant !== undefined;
                    if (norm1 && tem1) {
                        data = norm1;
                        fonteAPI = 'open.cnpja';
                        console.log('✅ Dados recebidos de open.cnpja.com');
                    } else {
                        console.warn('⚠️ open.cnpja respondeu mas sem info de Simples/MEI. Tentando fallback...');
                    }
                } else if (r1.status === 404) {
                    console.warn(`⚠️ CNPJ ${cnpj} não encontrado em open.cnpja (404).`);
                    setProcessoAviso('⚠️ CNPJ não encontrado - Pulando...');
                    setTimeout(() => setProcessoAviso(''), 3000);

                    // 🎯 PERSISTIR o estado de "não encontrado" pra exibir 🚨 na linha
                    try {
                        await db.ref(`contribuintes/${ano}/${mes}/${id}`).update({
                            consultaIncerta: true,
                            verificado: false
                        });
                        setList(prev => prev.map(item =>
                            item.id === id
                                ? { ...item, consultaIncerta: true, verificado: false }
                                : item
                        ));
                    } catch (e) {
                        console.warn('⚠️ Não foi possível persistir consultaIncerta:', e.message);
                    }

                    return { success: false, error: 'CNPJ não encontrado (404)' };
                } else if (r1.status === 429) {
                    console.warn(`⚠️ open.cnpja persistentemente em 429 após retries.`);
                } else {
                    console.warn(`⚠️ open.cnpja HTTP ${r1.status}.`);
                }
            } catch (e) {
                console.warn('⚠️ Erro de rede em open.cnpja:', e.message);
            }

            // Sem fallback: se a open.cnpja falhou, marca pra revisão manual
            if (!data) {
                console.warn(`🚨 CNPJ ${cnpj}: consulta falhou na open.cnpja, sem dados disponíveis.`);
                setProcessoAviso('⚠️ Consulta falhou - revisar manualmente');
                setTimeout(() => setProcessoAviso(''), 3000);

                // 🎯 PERSISTIR o estado de falha no Firebase pra exibir 🚨 na linha
                try {
                    await db.ref(`contribuintes/${ano}/${mes}/${id}`).update({
                        consultaIncerta: true,
                        verificado: false
                    });
                    setList(prev => prev.map(item =>
                        item.id === id
                            ? { ...item, consultaIncerta: true, verificado: false }
                            : item
                    ));
                } catch (e) {
                    console.warn('⚠️ Não foi possível persistir consultaIncerta:', e.message);
                }

                return { success: false, error: 'Consulta open.cnpja falhou' };
            }

            // Processar dados (mesma lógica)
            let porte = '';
            if (data.company?.size?.acronym) {
                porte = data.company.size.acronym;
            } else if (data.company?.size?.text) {
                const porteText = data.company.size.text.toUpperCase();
                if (porteText.includes('MICRO')) porte = 'ME';
                else if (porteText.includes('PEQUENO')) porte = 'ME';
                else porte = 'DEMAIS';
            }

            // 🎯 REGRA ANTIGA RESTAURADA — funciona com dados de qualquer fonte normalizada
            let tributacao = '';
            let consultaIncerta = false;

            // 🚨 Se a API retornou OK mas com dados críticos faltando (porte E simples nulos),
            // NÃO classifica — marca como INCERTO pra revisão manual.
            // Cenário típico: CNPJ recém-aberto, Receita ainda não publicou dados.
            if (data._dadosCriticosFaltando) {
                tributacao = '';
                consultaIncerta = true;
                console.warn(`🚨 CNPJ ${cnpj}: dados incompletos da Receita (porte+simples nulos). Marcado como INCERTO.`);
            } else if (isMEI(data)) {
                tributacao = 'MEI';
            } else if (porte === 'ME') {
                // ME sempre é SIMPLES (exceto se for MEI já detectado acima) — regra operacional CTM Art. 359 Item 1
                tributacao = 'SIMPLES';
            } else if (isSimples(data)) {
                tributacao = 'SIMPLES';
            } else {
                tributacao = 'LUCRO PRESUMIDO';
            }

            let situacao = data.status?.text || '';

            const cnaes = [];
            if (data.mainActivity?.id) {
                cnaes.push(data.mainActivity.id);
            }
            if (data.sideActivities) {
                data.sideActivities.forEach(sec => {
                    if (sec.id || sec.code) {
                        cnaes.push(sec.id || sec.code);
                    }
                });
            }

            const precisaVisa = cnaes.some(cnae => precisaVisaPorCnae(cnae));
            const visaRisco = getMaiorRiscoVisa(cnaes);

            const atualizado = { porte, tributacao, situacao, precisaVisa, visaRisco, verificado: true, consultaIncerta, dadosAPI: data };

            // 📍 ENDEREÇO — salvo direto no contribuinte pra não precisar reconsultar o CNPJ depois.
            // Só para quem precisa de VISA (é pra isso que o endereço serve: inspeção do imóvel).
            if (data.address && precisaVisa) {
                atualizado.endereco = {
                    logradouro: data.address.street || '',
                    numero: data.address.number || '',
                    complemento: data.address.details || '',
                    bairro: data.address.district || '',
                    cidade: data.address.city || '',
                    uf: data.address.state || '',
                    cep: data.address.zip || ''
                };
            }

            console.log('💾 Atualizando com:', atualizado);

            setList(prevList => prevList.map(item =>
                item.id === id ? { ...item, ...atualizado } : item
            ));

            await db.ref(`contribuintes/${ano}/${mes}/${id}`).update(atualizado);

            setConsultasRealizadas(prev => prev + 1);

            console.log('✅ Consulta concluída com sucesso');
            return { success: true, porte, tributacao, situacao };
        } catch (error) {
            console.warn('⚠️ Erro ao consultar CNPJ', cnpj, ':', error.message);
            // 🎯 PERSISTIR o estado de erro pra exibir 🚨 na linha
            try {
                await db.ref(`contribuintes/${ano}/${mes}/${id}`).update({
                    consultaIncerta: true,
                    verificado: false
                });
                setList(prev => prev.map(item =>
                    item.id === id
                        ? { ...item, consultaIncerta: true, verificado: false }
                        : item
                ));
            } catch (e) {
                console.warn('⚠️ Não foi possível persistir consultaIncerta:', e.message);
            }
            return { success: false, error: error.message };
        }
    };

    const consultarCNPJIndividual = async (cnpj, id, razaoSocial) => {
        setProcessando(true);
        setProcessoTitulo('🔍 Consultando CNPJ');
        setProcessoTotal(1);
        setProcessoAtual(0);
        setProcessoItemAtual(razaoSocial || cnpj);
        setProcessoTempoEstimado('~12 segundos');
        setProcessoAviso(''); // Limpar avisos anteriores
        try {
            setProcessoAtual(1);
            const resultado = await consultarCNPJ(cnpj, id);
            return resultado;
        } finally {
            setProcessando(false);
            setProcessoAtual(0);
            setProcessoTotal(0);
            setProcessoItemAtual('');
            setProcessoTempoEstimado('');
            setProcessoAviso('');
        }
    };

    const consultarTodos = async () => {
        const naoConsultados = list.filter(l => !l.verificado && l.tipoPessoa === 'CNPJ');

        if (naoConsultados.length === 0) {
            alert('✅ Todos os CNPJs já foram consultados!');
            return;
        }

        if (!confirm(`🔍 Consultar ${naoConsultados.length} CNPJs?\n\n⏱️ Tempo estimado: ~${Math.ceil(naoConsultados.length * 12 / 60)} minutos\n\n⚠️ Delay de 12 segundos entre consultas.`)) {
            return;
        }

        // ✅ ATIVAR CONTADOR
        setProcessando(true);
        setProcessoTitulo('🔍 Consultando CNPJs');
        setProcessoTotal(naoConsultados.length);
        setProcessoAtual(0);
        setProcessoAviso(''); // Limpar avisos anteriores

        const tempoEstimadoMin = Math.ceil(naoConsultados.length * 12 / 60);
        setProcessoTempoEstimado(`~${tempoEstimadoMin} minutos`);
        setConsultandoQueue(naoConsultados.map(l => l.id));

        try {
            for (let i = 0; i < naoConsultados.length; i++) {
                const item = naoConsultados[i];

                // ✅ ATUALIZAR CONTADOR
                setProcessoAtual(i + 1);
                setProcessoItemAtual(`${item.razaoSocial || item.documento}`);

                await consultarCNPJ(item.documento, item.id);
                // rate limit gerenciado pelo RATE_LIMITER global - não precisa de sleep extra
            }

            alert(`✅ Consulta concluída!\n\n${naoConsultados.length} CNPJs consultados.`);
        } catch (error) {
            console.error('❌ Erro na consulta em lote:', error);
            alert('Erro: ' + error.message);
        } finally {
            setConsultandoQueue([]);
            // ✅ DESATIVAR CONTADOR
            setProcessando(false);
            setProcessoAtual(0);
            setProcessoTotal(0);
            setProcessoItemAtual('');
            setProcessoTempoEstimado('');
            setProcessoAviso('');
        }
    };

    const toggleMarcador = async (id, cor) => {
        const novosMarcadores = { ...marcadores, [id]: cor };
        setMarcadores(novosMarcadores);
        await db.ref(`contribuintes/${ano}/${mes}/${id}`).update({ marcador: cor });
    };

    // 🧹 Desmarca a cor/linha de TODOS os contribuintes carregados (mês/ano atual)
    const desmarcarTodasCores = async () => {
        const idsComMarcador = list.filter(l => marcadores[l.id]).map(l => l.id);
        if (idsComMarcador.length === 0) {
            alert('Nenhuma linha está marcada com cor.');
            return;
        }
        if (!confirm(`Remover a marcação de cor/linha de ${idsComMarcador.length} contribuinte(s)?`)) return;
        setMarcadores({});
        await Promise.all(idsComMarcador.map(id => db.ref(`contribuintes/${ano}/${mes}/${id}`).update({ marcador: null })));
    };

    const calcISSQN = (nivel, trimestre, isento, tipoPessoa) => {
        if (isento || tipoPessoa !== 'CPF' || nivel === 'VARIAVEL') return 0;
        const base = nivel === 'SUPERIOR' ? 8 : 5;
        const trimestres = 4 - (trimestre - 1);
        return (base / 4) * trimestres;
    };

    // 📅 Trimestre da competência aberta (autoplaceholder para autônomos).
    // mes é 0-indexado no app (jan=0, fev=1, ...). Resultado: 1, 2, 3 ou 4.
    const getTrimestreDaCompetencia = (mes) => Math.floor(mes / 3) + 1;

    // 🎯 Trimestre efetivo: se o operador editou manualmente, respeita o salvo.
    // Senão, retorna o trimestre calculado pela competência aberta.
    const getTrimestreEfetivo = (l, mes) => {
        if (l.trimestreEditadoManual && l.trimestreAbertura) return l.trimestreAbertura;
        return getTrimestreDaCompetencia(mes);
    };

    const calcVISA = (area, tributacao, porte, precisaVisa) => {
        if (tributacao === 'MEI' || tributacao === 'ISENTO' || !precisaVisa) return 0;
        if (!area || area === 0) return 0;

        const faixa = TABELA_VISA.find(f => area >= f.min && area <= f.max);
        if (!faixa) return 0;

        if (tributacao === 'SIMPLES') return faixa.valorME_EPP;
        return faixa.valorIntegral;
    };

    // 🚩 BANDEIRA VISA — cor por nível de risco do CNAE (Res. SES-RJ 2191/20).
    // Continua marcável/desmarcável manualmente (clique na bandeira alterna precisaVisa);
    // quando marcado manualmente sem CNAE de risco calculado, mostra bandeira neutra (azul).
    const infoBandeiraVisa = (l) => {
        if (!l.precisaVisa) return { cor: 'text-gray-300', label: 'Sem VISA — clique para marcar' };
        if (l.visaRisco === 'ALTO') return { cor: 'text-red-600', label: 'VISA — Alto risco' };
        if (l.visaRisco === 'MEDIO') return { cor: 'text-yellow-500', label: 'VISA — Médio risco' };
        if (l.visaRisco === 'BAIXO') return { cor: 'text-green-600', label: 'VISA — Baixo risco' };
        return { cor: 'text-blue-500', label: 'VISA — marcado manualmente (risco não calculado)' };
    };

    // 📍 Formata o endereço salvo do contribuinte pra exibição no tooltip CTRL+hover.
    const formatarCEP = (cep) => {
        const digits = String(cep || '').replace(/\D/g, '');
        return digits.length === 8 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : cep;
    };
    const formatarEndereco = (e) => {
        if (!e) return null;
        const partes = [];
        if (e.logradouro) partes.push(e.numero ? `${e.logradouro}, ${e.numero}` : e.logradouro);
        if (e.complemento) partes.push(e.complemento);
        if (e.bairro) partes.push(e.bairro);
        if (e.cidade || e.uf) partes.push([e.cidade, e.uf].filter(Boolean).join('/'));
        if (e.cep) partes.push(`CEP ${formatarCEP(e.cep)}`);
        return partes.length ? partes.join(' — ') : null;
    };

    // 🏛️ CÁLCULO TFLF — REGRA OPERACIONAL ANTIGA (validada em produção)
    // Decide pelo campo Tributação (o que o usuário marca na coluna).
    // A escolha manual do usuário é a fonte da verdade.
    const getPorteUFICAS = (tributacao, tipoPessoa) => {
        if (tributacao === 'MEI' || tributacao === 'ISENTO') return 0;

        const valores = {
            'MEI': 0,
            'SIMPLES': 2.5,
            'EPP': 2.5,
            'LUCRO PRESUMIDO': 8,
            'LUCRO REAL': 20,
            'BANCO': 150,
            'AUTONOMO': 2.5,
            'ISENTO': 0
        };

        if (tipoPessoa === 'CPF') return 2.5;
        return valores[tributacao] || 0;
    };

    const calcTFLFReais = (tributacao, tipoPessoa) => {
        const uficas = getPorteUFICAS(tributacao, tipoPessoa);
        return uficas * valorUficaAtual;
    };

    const calcDashboard = () => {
        let listaCalculo = list;

        const total = listaCalculo.length;
        const pendentes = listaCalculo.filter(l => l.taxasLancadas === 'NAO' && l.tributacao !== 'MEI').length;
        const verificados = listaCalculo.filter(l => l.verificado).length;

        const documentos = {};
        const duplicados = [];
        listaCalculo.forEach(l => {
            if (documentos[l.documento]) duplicados.push(l.documento);
            documentos[l.documento] = (documentos[l.documento] || 0) + 1;
        });
        const totalDuplicados = new Set(duplicados).size;

        let totalUFICAS = 0;
        let totalReais = 0;
        let totalISSQN = 0;

        listaCalculo.forEach(l => {
            const uficas = getPorteUFICAS(l.tributacao, l.tipoPessoa);
            const reais = uficas * valorUficaAtual;
            const issqn = calcISSQN(l.nivelISSQN, getTrimestreEfetivo(l, mes), l.issqnIsento, l.tipoPessoa);

            totalUFICAS += uficas;
            totalReais += reais;
            totalISSQN += issqn * valorUficaAtual;
        });

        const vigilancia = listaCalculo.reduce((sum, l) => sum + calcVISA(l.areaM2 || 0, l.tributacao, l.porte, l.precisaVisa), 0);

        return { total, pendentes, verificados, totalUFICAS, totalReais, vigilancia, totalDuplicados, totalISSQN };
    };

    const formatarMoeda = (valor) => {
        return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const inserirManual = async () => {
        if (!formInserir.documento.trim() || !formInserir.nome.trim()) {
            alert('Preencha pelo menos Documento e Nome!');
            return;
        }

        const clean = formInserir.documento.replace(/\D/g, '');
        const novo = {
            inscricaoMunicipal: formInserir.inscricao || '',
            documento: clean,
            tipoPessoa: clean.length === 11 ? 'CPF' : 'CNPJ',
            razaoSocial: formInserir.nome,
            porte: '',
            tributacao: clean.length === 11 ? 'AUTONOMO' : '',
            situacao: '',
            areaM2: 0,
            ordemServico: '',
            nivelISSQN: clean.length === 11 ? 'MEDIO' : 'VARIAVEL',
            issqnIsento: false,
            trimestreAbertura: getTrimestreDaCompetencia(mes),
            taxasLancadas: 'NAO',
            verificado: false,
            precisaVisa: false,
            criadoEm: Date.now()
        };

        await salvarNoFirebase(novo);
        setFormInserir({ inscricao: '', documento: '', nome: '' });
        setModalInserir(false);
        alert('✅ Contribuinte adicionado!');
    };

    const importarTXT = (event) => {
        const file = event.target ? event.target.files[0] : event; // Adaptação para aceitar event ou file direto
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const texto = e.target.result;
                const linhas = texto.split('\n').filter(l => l.trim());

                if (linhas.length === 0) {
                    alert('❌ Arquivo vazio!');
                    return;
                }

                if (!confirm(`📁 Importar ${linhas.length} linhas?`)) {
                    return;
                }

                // ✅ ATIVAR CONTADOR
                setProcessando(true);
                setProcessoTitulo('📁 Importando Arquivo TXT');
                setProcessoTotal(linhas.length);
                setProcessoAtual(0);

                let novos = 0;
                let ignorados = 0;
                
                // Criar Sets com TODOS os dados existentes (não só verificados)
                const docsExistentes = new Set(list.map(l => l.documento));
                const inscricoesExistentes = new Set(list.map(l => l.inscricaoMunicipal).filter(Boolean));

                for (let i = 0; i < linhas.length; i++) {
                    const l = linhas[i];

                    // ✅ ATUALIZAR CONTADOR
                    setProcessoAtual(i + 1);
                    setProcessoItemAtual(`Processando linha ${i + 1}...`);

                    // Pequeno delay para renderizar UI
                    await new Promise(r => setTimeout(r, 0));

                    const partes = l.split('\t').map(p => p.trim());
                    const [insc, doc, nome] = partes;

                    if (!doc) continue;

                    const clean = doc.replace(/\D/g, '');

                    // ✅ VERIFICAR DUPLICIDADE por DOCUMENTO ou INSCRIÇÃO
                    if (docsExistentes.has(clean) || (insc && inscricoesExistentes.has(insc))) {
                        ignorados++;
                        continue;
                    }

                    const isCPF = clean.length === 11;
                    const contribuinte = {
                        inscricaoMunicipal: insc || '',
                        documento: clean,
                        tipoPessoa: isCPF ? 'CPF' : 'CNPJ',
                        razaoSocial: nome || '',
                        porte: '',
                        tributacao: isCPF ? 'AUTONOMO' : '',
                        areaM2: 0,
                        nivelISSQN: isCPF ? 'MEDIO' : 'VARIAVEL',
                        issqnIsento: false,
                        trimestreAbertura: getTrimestreDaCompetencia(mes),
                        taxasLancadas: 'NAO',
                        verificado: isCPF ? true : false,
                        precisaVisa: false,
                        criadoEm: Date.now()
                    };

                    await salvarNoFirebase(contribuinte);
                    novos++;
                }

                alert(`✅ ${novos} contribuintes importados!\n⏭️ ${ignorados} já verificados foram ignorados.`);
            } catch (error) {
                console.error('❌ Erro ao importar:', error);
                alert('Erro ao importar: ' + error.message);
            } finally {
                // ✅ DESATIVAR CONTADOR
                setProcessando(false);
                setProcessoAtual(0);
                setProcessoTotal(0);
                setProcessoItemAtual('');
                if (event.target) event.target.value = ''; // Limpar input se for evento
            }
        };

        reader.readAsText(file);
    };

    const exportCSV = () => {
        const header = ['Inscrição', 'Documento', 'Identificação do Contribuinte', 'Porte', 'Tributação', 'N° OS', 'Auditor', 'TFLF (R$)', 'ISSQN (R$)', 'VISA (R$)', 'Verificado', 'Taxas Lançadas'];
        const rows = list.map(l => {
            const tflf = calcTFLFReais(l.tributacao, l.tipoPessoa);
            const issqnUficas = calcISSQN(l.nivelISSQN, getTrimestreEfetivo(l, mes), l.issqnIsento, l.tipoPessoa);
            const issqnReais = issqnUficas * valorUficaAtual;
            const visa = calcVISA(l.areaM2 || 0, l.tributacao, l.porte, l.precisaVisa);

            return [
                l.inscricaoMunicipal,
                l.documento,
                l.razaoSocial,
                l.porte || '',
                l.tributacao || '',
                l.ordemServico || '',
                l.auditor || '',
                tflf.toFixed(2),
                issqnReais.toFixed(2),
                visa.toFixed(2),
                l.verificado ? 'SIM' : 'NAO',
                l.taxasLancadas
            ];
        });

        const csv = [header, ...rows].map(r => r.join(';')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `taxas_${MESES[mes]}_${ano}.csv`;
        a.click();
    };

    // ============================================
    // 📑 RELATÓRIO PDF POR AUDITOR + COMPETÊNCIA
    // Gera um ZIP com 1 PDF por auditor + 1 PDF de Resumo Geral
    // ============================================
    const gerarRelatorioAuditores = async () => {
        try {
            if (typeof window.jspdf === 'undefined') {
                alert('❌ Biblioteca jsPDF não carregou. Verifique sua conexão e recarregue a página.');
                return;
            }
            if (typeof window.JSZip === 'undefined') {
                alert('❌ Biblioteca JSZip não carregou. Verifique sua conexão e recarregue a página.');
                return;
            }
            if (!list || list.length === 0) {
                alert('⚠️ Não há contribuintes lançados na competência atual.');
                return;
            }

            const { jsPDF } = window.jspdf;
            const JSZip = window.JSZip;

            // Agrupar por auditor (vazio/null vira "SEM AUDITOR ATRIBUÍDO")
            const agrupado = {};
            list.forEach(l => {
                const aud = (l.auditor && String(l.auditor).trim()) || 'SEM AUDITOR ATRIBUÍDO';
                if (!agrupado[aud]) agrupado[aud] = [];
                agrupado[aud].push(l);
            });

            const nomesAuditores = Object.keys(agrupado).sort((a, b) => {
                if (a === 'SEM AUDITOR ATRIBUÍDO') return 1;
                if (b === 'SEM AUDITOR ATRIBUÍDO') return -1;
                return a.localeCompare(b, 'pt-BR');
            });

            const competencia = `${MESES[mes]}/${ano}`;
            const hoje = new Date();
            const dataGeracao = `Gerado em ${String(hoje.getDate()).padStart(2,'0')}/${String(hoje.getMonth()+1).padStart(2,'0')}/${hoje.getFullYear()} às ${String(hoje.getHours()).padStart(2,'0')}:${String(hoje.getMinutes()).padStart(2,'0')}`;

            const fmt = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            // Sanitiza nome para uso em arquivo: remove acentos, espaços viram _, só letras/números/underscore
            const sanitizarNome = (nome) => {
                return String(nome)
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
                    .replace(/[^a-zA-Z0-9\s]/g, '')                    // remove especiais
                    .trim()
                    .replace(/\s+/g, '_')
                    .substring(0, 60) || 'Auditor';
            };

            // Funções auxiliares de cabeçalho/tabela compartilhadas
            const desenharCabecalhoSecao = (doc, nomeAud) => {
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('RELATÓRIO DE CONTRIBUINTES POR AUDITOR', doc.internal.pageSize.getWidth() / 2, 36, { align: 'center' });

                doc.setFontSize(11);
                doc.setFont('helvetica', 'normal');
                doc.text(`Competência: ${competencia}`, 40, 58);
                doc.text(`Auditor: ${nomeAud}`, 40, 74);
                doc.text(dataGeracao, doc.internal.pageSize.getWidth() - 40, 58, { align: 'right' });
            };

            const calcularTotaisAuditor = (itens) => {
                let subTFLF = 0, subISSQN = 0, subVISA = 0;
                itens.forEach(l => {
                    subTFLF += calcTFLFReais(l.tributacao, l.tipoPessoa);
                    subISSQN += calcISSQN(l.nivelISSQN, getTrimestreEfetivo(l, mes), l.issqnIsento, l.tipoPessoa) * valorUficaAtual;
                    subVISA += calcVISA(l.areaM2 || 0, l.tributacao, l.porte, l.precisaVisa);
                });
                return { subTFLF, subISSQN, subVISA, subTotal: subTFLF + subISSQN + subVISA };
            };

            // Mostrar progresso simples no botão
            setProcessoAviso('📑 Gerando relatórios PDF...');

            const zip = new JSZip();
            let totalGeralTFLF = 0, totalGeralISSQN = 0, totalGeralVISA = 0;

            // 1️⃣ Gerar 1 PDF por auditor
            for (let i = 0; i < nomesAuditores.length; i++) {
                const nomeAud = nomesAuditores[i];
                const itens = [...agrupado[nomeAud]].sort((a, b) => {
                    const ia = parseInt(a.inscricaoMunicipal, 10);
                    const ib = parseInt(b.inscricaoMunicipal, 10);
                    if (!isNaN(ia) && !isNaN(ib)) return ia - ib;
                    return String(a.inscricaoMunicipal || '').localeCompare(String(b.inscricaoMunicipal || ''));
                });

                const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
                desenharCabecalhoSecao(doc, nomeAud);

                const rows = itens.map((l, idx) => {
                    const tflf = calcTFLFReais(l.tributacao, l.tipoPessoa);
                    const issqnU = calcISSQN(l.nivelISSQN, getTrimestreEfetivo(l, mes), l.issqnIsento, l.tipoPessoa);
                    const issqn = issqnU * valorUficaAtual;
                    const visa = calcVISA(l.areaM2 || 0, l.tributacao, l.porte, l.precisaVisa);
                    const total = tflf + issqn + visa;
                    return [
                        String(idx + 1),
                        l.inscricaoMunicipal || '-',
                        l.documento || '-',
                        l.razaoSocial || '-',
                        l.porte || '-',
                        l.tributacao || '-',
                        l.numeroOS || '-',
                        'R$ ' + fmt(tflf),
                        'R$ ' + fmt(issqn),
                        'R$ ' + fmt(visa),
                        'R$ ' + fmt(total)
                    ];
                });

                const tot = calcularTotaisAuditor(itens);
                totalGeralTFLF += tot.subTFLF;
                totalGeralISSQN += tot.subISSQN;
                totalGeralVISA += tot.subVISA;

                doc.autoTable({
                    startY: 88,
                    head: [['Nº', 'Inscrição', 'CNPJ/CPF', 'Razão Social', 'Porte', 'Tributação', 'Nº OS', 'TFLF', 'ISSQN', 'VISA', 'Total']],
                    body: rows,
                    foot: [[
                        { content: `Total do auditor (${itens.length} contribuintes)`, colSpan: 7, styles: { halign: 'right', fontStyle: 'bold' } },
                        { content: 'R$ ' + fmt(tot.subTFLF), styles: { fontStyle: 'bold' } },
                        { content: 'R$ ' + fmt(tot.subISSQN), styles: { fontStyle: 'bold' } },
                        { content: 'R$ ' + fmt(tot.subVISA), styles: { fontStyle: 'bold' } },
                        { content: 'R$ ' + fmt(tot.subTotal), styles: { fontStyle: 'bold' } }
                    ]],
                    styles: { fontSize: 8, cellPadding: 3 },
                    headStyles: { fillColor: [49, 46, 129], textColor: 255, fontStyle: 'bold' },
                    footStyles: { fillColor: [243, 244, 246], textColor: 17 },
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 24 },
                        1: { halign: 'center', cellWidth: 50 },
                        2: { cellWidth: 90 },
                        3: { cellWidth: 'auto' },
                        4: { halign: 'center', cellWidth: 40 },
                        5: { halign: 'center', cellWidth: 60 },
                        6: { halign: 'center', cellWidth: 45 },
                        7: { halign: 'right', cellWidth: 60 },
                        8: { halign: 'right', cellWidth: 60 },
                        9: { halign: 'right', cellWidth: 60 },
                        10: { halign: 'right', cellWidth: 65 }
                    },
                    didDrawPage: () => {
                        const str = `Página ${doc.internal.getNumberOfPages()}`;
                        doc.setFontSize(8);
                        doc.text(str, doc.internal.pageSize.getWidth() - 40, doc.internal.pageSize.getHeight() - 16, { align: 'right' });
                    },
                    margin: { left: 40, right: 40 }
                });

                // Numeração ordenada do arquivo: 01_Nome.pdf, 02_Nome.pdf...
                const prefixo = String(i + 1).padStart(2, '0');
                const nomeArquivo = `${prefixo}_${sanitizarNome(nomeAud)}.pdf`;
                zip.file(nomeArquivo, doc.output('arraybuffer'));
            }

            // 2️⃣ PDF de Resumo Geral
            const resumoDoc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
            resumoDoc.setFontSize(14);
            resumoDoc.setFont('helvetica', 'bold');
            resumoDoc.text('RESUMO GERAL DA COMPETÊNCIA', resumoDoc.internal.pageSize.getWidth() / 2, 50, { align: 'center' });
            resumoDoc.setFontSize(11);
            resumoDoc.setFont('helvetica', 'normal');
            resumoDoc.text(`Competência: ${competencia}`, 40, 74);
            resumoDoc.text(`Total de auditores com lançamentos: ${nomesAuditores.length}`, 40, 90);
            resumoDoc.text(`Total de contribuintes: ${list.length}`, 40, 106);
            resumoDoc.text(dataGeracao, resumoDoc.internal.pageSize.getWidth() - 40, 74, { align: 'right' });

            resumoDoc.autoTable({
                startY: 130,
                head: [['Auditor', 'Contribuintes', 'TFLF', 'ISSQN', 'VISA', 'Total']],
                body: nomesAuditores.map(nome => {
                    const t = calcularTotaisAuditor(agrupado[nome]);
                    return [nome, String(agrupado[nome].length), 'R$ ' + fmt(t.subTFLF), 'R$ ' + fmt(t.subISSQN), 'R$ ' + fmt(t.subVISA), 'R$ ' + fmt(t.subTotal)];
                }),
                foot: [[
                    { content: `TOTAL GERAL (${list.length} contribuintes)`, colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: 'R$ ' + fmt(totalGeralTFLF), styles: { fontStyle: 'bold' } },
                    { content: 'R$ ' + fmt(totalGeralISSQN), styles: { fontStyle: 'bold' } },
                    { content: 'R$ ' + fmt(totalGeralVISA), styles: { fontStyle: 'bold' } },
                    { content: 'R$ ' + fmt(totalGeralTFLF + totalGeralISSQN + totalGeralVISA), styles: { fontStyle: 'bold' } }
                ]],
                styles: { fontSize: 9, cellPadding: 4 },
                headStyles: { fillColor: [49, 46, 129], textColor: 255, fontStyle: 'bold' },
                footStyles: { fillColor: [243, 244, 246], textColor: 17 },
                columnStyles: {
                    0: { cellWidth: 'auto' },
                    1: { halign: 'center', cellWidth: 90 },
                    2: { halign: 'right', cellWidth: 100 },
                    3: { halign: 'right', cellWidth: 100 },
                    4: { halign: 'right', cellWidth: 100 },
                    5: { halign: 'right', cellWidth: 110 }
                },
                margin: { left: 40, right: 40 }
            });

            zip.file('00_Resumo_Geral.pdf', resumoDoc.output('arraybuffer'));

            // 3️⃣ Gerar ZIP e baixar
            const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Relatorios_Auditores_${MESES[mes]}_${ano}.zip`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            setProcessoAviso('');
            alert(`✅ ZIP gerado com ${nomesAuditores.length} relatório(s) de auditor + Resumo Geral.\n\nArquivo: Relatorios_Auditores_${MESES[mes]}_${ano}.zip`);
        } catch (err) {
            setProcessoAviso('');
            console.error('Erro ao gerar relatório PDF:', err);
            alert('Erro ao gerar relatório: ' + err.message);
        }
    };

    // ============================================
    // FUNÇÃO DE BACKUP COMPLETO
    // ============================================
    const fazerBackup = async () => {
        try {
            const confirmacao = confirm('💾 Deseja fazer backup completo dos dados?\n\nIsso salvará TODOS os contribuintes de todos os meses/anos.');
            if (!confirmacao) return;

            const dados = {};

            // Backup de contribuintes de todos os anos/meses
            const anosParaBackup = [2024, 2025, 2026, 2027];

            for (const anoBackup of anosParaBackup) {
                dados[`contribuintes_${anoBackup}`] = {};

                for (let mesBackup = 0; mesBackup <= 11; mesBackup++) {
                    const snapshot = await db.ref(`contribuintes/${anoBackup}/${mesBackup}`).once('value');
                    const dadosMes = snapshot.val();
                    if (dadosMes) {
                        dados[`contribuintes_${anoBackup}`][MESES[mesBackup]] = dadosMes;
                    }
                }
            }

            // Backup de faltas
            for (const anoBackup of anosParaBackup) {
                for (let mesBackup = 0; mesBackup <= 11; mesBackup++) {
                    const snapshotFaltas = await db.ref(`contribuintes/_faltas_${anoBackup}_${mesBackup}`).once('value');
                    const dadosFaltas = snapshotFaltas.val();
                    if (dadosFaltas) {
                        if (!dados.faltas) dados.faltas = {};
                        dados.faltas[`${anoBackup}_${mesBackup}`] = dadosFaltas;
                    }
                }
            }

            // Criar arquivo JSON para download
            const dataStr = JSON.stringify(dados, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            const dataHora = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            link.download = `backup_pawg_${dataHora}.json`;
            link.click();

            URL.revokeObjectURL(url);

            alert('✅ Backup realizado com sucesso!\n\nArquivo salvo: backup_pawg_' + dataHora + '.json');
        } catch (error) {
            console.error('Erro ao fazer backup:', error);
            alert('❌ Erro ao fazer backup: ' + error.message);
        }
    };

    // ============================================
    // FUNÇÃO DE RESTAURAÇÃO DE BACKUP
    // ============================================
    const restaurarBackup = async (arquivo) => {
        try {
            const confirmacao = confirm('⚠️ ATENÇÃO: Restaurar backup pode sobrescrever dados atuais!\n\nTem certeza que deseja continuar?');
            if (!confirmacao) return;

            const texto = await arquivo.text();
            const dados = JSON.parse(texto);

            let totalRestaurado = 0;

            // Restaurar contribuintes
            for (const [chave, valor] of Object.entries(dados)) {
                if (chave.startsWith('contribuintes_')) {
                    const anoRestore = chave.split('_')[1];
                    for (const [mesNome, dadosMes] of Object.entries(valor)) {
                        const mesIndex = MESES.indexOf(mesNome);
                        if (mesIndex !== -1) {
                            await db.ref(`contribuintes/${anoRestore}/${mesIndex}`).set(dadosMes);
                            totalRestaurado++;
                        }
                    }
                } else if (chave === 'faltas') {
                    for (const [periodo, dadosFaltas] of Object.entries(valor)) {
                        const [anoF, mesF] = periodo.split('_');
                        await db.ref(`contribuintes/_faltas_${anoF}_${mesF}`).set(dadosFaltas);
                    }
                }
            }

            alert(`✅ Backup restaurado com sucesso!\n\n${totalRestaurado} períodos restaurados.\n\nA página será recarregada.`);
            window.location.reload();
        } catch (error) {
            console.error('Erro ao restaurar backup:', error);
            alert('❌ Erro ao restaurar: ' + error.message);
        }
    };

    // ============================================
    // FUNÇÃO DE FILTROS AVANÇADOS
    // ============================================
    const aplicarFiltros = (lista) => {
        let listaFiltrada = [...lista];

        // 🔍 PESQUISA RÁPIDA (prioridade máxima)
        if (pesquisaRapida) {
            const termo = pesquisaRapida.trim().toLowerCase();
            listaFiltrada = listaFiltrada.filter(item =>
                (item.documento && item.documento.replace(/\D/g, '').includes(termo.replace(/\D/g, ''))) ||
                (item.inscricaoMunicipal && item.inscricaoMunicipal.toLowerCase().includes(termo)) ||
                (item.razaoSocial && item.razaoSocial.toLowerCase().includes(termo))
            );
        }

        // Filtro de busca (nome, documento, inscrição)
        if (filtros.busca) {
            const buscaLower = filtros.busca.toLowerCase();
            listaFiltrada = listaFiltrada.filter(item =>
                (item.razaoSocial && item.razaoSocial.toLowerCase().includes(buscaLower)) ||
                (item.nomeContribuinte && item.nomeContribuinte.toLowerCase().includes(buscaLower)) ||
                (item.documento && item.documento.includes(filtros.busca)) ||
                (item.inscricaoMunicipal && item.inscricaoMunicipal.includes(filtros.busca))
            );
        }

        // Filtro por auditor
        if (filtros.auditor) {
            listaFiltrada = listaFiltrada.filter(item => item.auditor === filtros.auditor);
        }

        // Filtro por situação
        if (filtros.situacao) {
            listaFiltrada = listaFiltrada.filter(item => item.status === filtros.situacao);
        }

        // Filtro por tributação
        if (filtros.tributacao) {
            listaFiltrada = listaFiltrada.filter(item => item.tributacao === filtros.tributacao);
        }

        // Apenas verificados
        if (filtros.apenasVerificados) {
            listaFiltrada = listaFiltrada.filter(item => item.verificado);
        }

        // Apenas pendentes de lançamento
        if (filtros.apenasPendentes) {
            listaFiltrada = listaFiltrada.filter(item => item.taxasLancadas === 'NAO');
        }

        return listaFiltrada;
    };

    const limparFiltros = () => {
        setFiltros({
            busca: '',
            auditor: '',
            situacao: '',
            tributacao: '',
            apenasVerificados: false,
            apenasPendentes: false
        });
    };

    const update = async (id, campo, valor) => {
        // Campos críticos que indicam edição manual em registros não-verificados
        const camposCriticos = ['porte', 'tributacao', 'precisaVisa'];
        
        setList(list.map(item => {
            if (item.id === id) {
                const itemAtualizado = { ...item, [campo]: valor };
                
                // Se editou campo crítico e NÃO estava verificado pela API, marcar como editado manualmente
                if (camposCriticos.includes(campo) && !item.verificado) {
                    itemAtualizado.editadoManualmente = true;
                }
                
                // Se editou tributação, limpar flag de consulta incerta (foi resolvido manualmente)
                if (campo === 'tributacao' && item.consultaIncerta) {
                    itemAtualizado.consultaIncerta = false;
                }
                
                return itemAtualizado;
            }
            return item;
        }));
        
        const updates = { [campo]: valor };
        
        // Marcar editadoManualmente no Firebase também
        const item = list.find(i => i.id === id);
        if (item && camposCriticos.includes(campo) && !item.verificado) {
            updates.editadoManualmente = true;
        }
        
        // Limpar flag de consulta incerta ao corrigir tributação
        if (item && campo === 'tributacao' && item.consultaIncerta) {
            updates.consultaIncerta = false;
        }
        
        await db.ref(`contribuintes/${ano}/${mes}/${id}`).update(updates);
    };

    const excluir = async (id) => {
        if (confirm('Tem certeza que deseja excluir?')) {
            // ✅ Remove do Firebase
            await db.ref(`contribuintes/${ano}/${mes}/${id}`).remove();

            // ✅ Remove da lista local IMEDIATAMENTE
            setList(prev => prev.filter(item => item.id !== id));

            console.log('✅ Contribuinte excluído:', id);
        }
    };

    const rodarReprocessamento = async () => {
        // Filtrar contribuintes PRELIMINARMENTE - apenas CNPJs verificados
        let listaParaReprocessar = [];
        if (opcoesReproc.visa || opcoesReproc.porte || opcoesReproc.trib) {
            listaParaReprocessar = list.filter(x => x.verificado && x.documento && x.tipoPessoa === 'CNPJ');
        } else {
            alert('⚠️ Marque pelo menos uma opção: VISA, Porte ou Tributação');
            return;
        }

        if (listaParaReprocessar.length === 0) {
            alert('ℹ️ Nenhum contribuinte verificado encontrado para reprocessar.');
            return;
        }

        if (!confirm(`⚠️ ATENÇÃO!\n\nReprocessar ${listaParaReprocessar.length} contribuintes?\n\nIsso levará MUITO TEMPO devido ao delay de 12 segundos entre cada consulta.\n\nTempo estimado: ~${Math.ceil(listaParaReprocessar.length * 12 / 60)} minutos\n\nDeseja continuar?`)) {
            return;
        }

        setRodando(true);

        // ✅ ATIVAR CONTADOR
        setProcessando(true);
        setProcessoTitulo('⚙️ Reprocessando Contribuintes');
        setProcessoTotal(listaParaReprocessar.length);
        setProcessoAtual(0);
        setProcessoAviso(''); // Limpar avisos anteriores

        const tempoEstimadoMin = Math.ceil(listaParaReprocessar.length * 12 / 60);
        setProcessoTempoEstimado(`~${tempoEstimadoMin} minutos`);

        try {
            console.log(`🔄 Iniciando reprocessamento de ${listaParaReprocessar.length} contribuintes...`);

            let sucessos = 0;
            let erros = 0;

            for (let i = 0; i < listaParaReprocessar.length; i++) {
                const c = listaParaReprocessar[i];
                const cnpj = c.documento.replace(/\D/g, ''); // Remove formatação

                // ✅ ATUALIZAR CONTADOR
                setProcessoAtual(i + 1);
                setProcessoItemAtual(`${c.razaoSocial || c.documento}`);

                console.log(`🔄 [${i + 1}/${listaParaReprocessar.length}] Reprocessando: ${c.razaoSocial} (${cnpj})`);

                try {
                    // 📡 ESTRATÉGIA MULTI-API: open.cnpja (com rate limiter + retry 429) → brasilapi fallback
                    let data = null;

                    try {
                        const r1 = await consultarOpenCnpjaComRetry(cnpj);
                        if (r1.ok) {
                            const norm = normalizarRespostaCNPJ(r1.data, 'open.cnpja');
                            const tem = norm?.company?.simei?.optant !== undefined ||
                                        norm?.company?.simples?.optant !== undefined;
                            if (norm && tem) {
                                data = norm;
                                console.log('✅ Dados de open.cnpja.com');
                            }
                        } else if (r1.status === 404) {
                            console.warn(`⚠️ CNPJ ${cnpj} não encontrado (404).`);
                            setProcessoAviso('⚠️ CNPJ não encontrado - Pulando...');
                            setTimeout(() => setProcessoAviso(''), 2000);
                            // 🎯 PERSISTIR para exibir 🚨
                            try {
                                await db.ref(`contribuintes/${ano}/${mes}/${c.id}`).update({
                                    consultaIncerta: true,
                                    verificado: false
                                });
                            } catch (e) {
                                console.warn('⚠️ Não persistiu consultaIncerta:', e.message);
                            }
                            erros++;
                            continue;
                        } else if (r1.status === 429) {
                            console.warn(`⚠️ open.cnpja persistentemente em 429 após retries.`);
                        }
                    } catch (e) {
                        console.warn('⚠️ open.cnpja falhou no reproc:', e.message);
                    }

                    // Sem fallback: se a open.cnpja falhou, pula este CNPJ
                    if (!data) {
                        console.warn(`🚨 CNPJ ${cnpj}: open.cnpja falhou. Pulando...`);
                        setProcessoAviso('⚠️ Consulta falhou - revisar manualmente');
                        setTimeout(() => setProcessoAviso(''), 2000);
                        // 🎯 PERSISTIR para exibir 🚨
                        try {
                            await db.ref(`contribuintes/${ano}/${mes}/${c.id}`).update({
                                consultaIncerta: true,
                                verificado: false
                            });
                        } catch (e) {
                            console.warn('⚠️ Não persistiu consultaIncerta:', e.message);
                        }
                        erros++;
                        continue;
                    }

                    // 🔄 PROCESSAR DADOS
                    const u = { dadosAPI: data };

                    // PORTE
                    if (opcoesReproc.porte) {
                        let p = '';
                        if (data.company?.size?.acronym) {
                            p = data.company.size.acronym;
                        } else if (data.company?.size?.text) {
                            const txt = data.company.size.text.toUpperCase();
                            p = txt.includes('MICRO') || txt.includes('PEQUENO') ? 'ME' : 'DEMAIS';
                        }
                        u.porte = p;
                    }

                    // TRIBUTAÇÃO — regra antiga restaurada
                    if (opcoesReproc.trib) {
                        let trib = '';
                        let incerta = false;
                        const porteAtual = u.porte || c.porte;

                        if (data._dadosCriticosFaltando) {
                            trib = '';
                            incerta = true;
                            console.warn(`🚨 CNPJ ${cnpj}: dados incompletos da Receita. Marcado como INCERTO.`);
                        } else if (isMEI(data)) {
                            trib = 'MEI';
                        } else if (porteAtual === 'ME') {
                            trib = 'SIMPLES';
                        } else if (isSimples(data)) {
                            trib = 'SIMPLES';
                        } else {
                            trib = 'LUCRO PRESUMIDO';
                        }

                        u.tributacao = trib;
                        u.consultaIncerta = incerta;
                    }

                    // VISA
                    if (opcoesReproc.visa) {
                        const cnaes = [];

                        // CNAE Principal
                        if (data.mainActivity?.id) {
                            cnaes.push(data.mainActivity.id);
                        }

                        // CNAEs Secundários
                        if (data.sideActivities) {
                            data.sideActivities.forEach(s => {
                                if (s.id || s.code) {
                                    cnaes.push(s.id || s.code);
                                }
                            });
                        }

                        u.precisaVisa = cnaes.some(z => precisaVisaPorCnae(z));
                        u.visaRisco = getMaiorRiscoVisa(cnaes);
                    }

                    // SITUAÇÃO (SEMPRE atualiza)
                    u.situacao = data.status?.text || '';

                    // 📍 ENDEREÇO — só pra quem precisa de VISA (é pra isso que serve: inspeção do imóvel).
                    // Se a opção VISA não foi marcada neste reprocessamento, usa o precisaVisa já salvo do contribuinte.
                    const precisaVisaAtual = opcoesReproc.visa ? u.precisaVisa : c.precisaVisa;
                    if (data.address && precisaVisaAtual) {
                        u.endereco = {
                            logradouro: data.address.street || '',
                            numero: data.address.number || '',
                            complemento: data.address.details || '',
                            bairro: data.address.district || '',
                            cidade: data.address.city || '',
                            uf: data.address.state || '',
                            cep: data.address.zip || ''
                        };
                    }

                    // ✅ Marcar como verificado
                    u.verificado = true;

                    // 💾 ATUALIZAR FIREBASE + LISTA LOCAL
                    await db.ref(`contribuintes/${ano}/${mes}/${c.id}`).update(u);
                    setList(prevList => prevList.map(item =>
                        item.id === c.id ? { ...item, ...u } : item
                    ));

                    // ✅ Atualizar contador
                    setConsultasRealizadas(prev => prev + 1);

                    sucessos++;
                    console.log(`✅ [${i + 1}/${listaParaReprocessar.length}] Reprocessado com sucesso`);
                    // rate limit gerenciado pelo RATE_LIMITER global

                } catch (error) {
                    console.warn(`⚠️ Erro ao reprocessar ${cnpj}:`, error.message);
                    erros++;
                    // Continua para o próximo sem bloquear (rate limit já gerenciado globalmente)
                }
            }

            // 🎉 CONCLUÍDO
            const mensagemFinal = `✅ Reprocessamento concluído!\n\n✅ Sucessos: ${sucessos}\n⚠️ Erros/Ignorados: ${erros}\n📊 Total processado: ${listaParaReprocessar.length}`;
            if (erros > 0) {
                alert(mensagemFinal + '\n\nℹ️ CNPJs com erro foram ignorados e continuam sem alteração.\nVerifique o Console (F12) para detalhes.');
            } else {
                alert(mensagemFinal);
            }
            setModalReprocessar(false);

        } catch (e) {
            console.error('❌ ERRO GERAL:', e);
            alert('Erro no reprocessamento: ' + e.message);
        } finally {
            setRodando(false);
            // ✅ DESATIVAR CONTADOR
            setProcessando(false);
            setProcessoAtual(0);
            setProcessoTotal(0);
            setProcessoItemAtual('');
            setProcessoTempoEstimado('');
            setProcessoAviso('');
            setModalReprocessar(false);
        }
    };

    const getDuplicados = () => {
        const documentos = {};
        list.forEach(l => {
            if (!documentos[l.documento]) documentos[l.documento] = [];
            documentos[l.documento].push(l);
        });
        return Object.values(documentos).filter(grupo => grupo.length > 1).flat();
    };

    // 🎯 Retorna Set com IDs das DUPLICATAS SECUNDÁRIAS:
    // dentro de cada grupo duplicado, considera "principal" o registro de MENOR inscrição
    // (com fallback alfabético quando a inscrição não é numérica/válida).
    // As demais inscrições do grupo entram no Set e são escondidas das abas operacionais.
    const getDuplicadosSecundariosIds = () => {
        const documentos = {};
        list.forEach(l => {
            if (!l.documento) return;
            if (!documentos[l.documento]) documentos[l.documento] = [];
            documentos[l.documento].push(l);
        });
        const ids = new Set();
        Object.values(documentos).forEach(grupo => {
            if (grupo.length <= 1) return;
            // Ordena pela inscrição numérica ascendente; menor é o "principal"
            const ordenado = [...grupo].sort((a, b) => {
                const ia = parseInt(a.inscricaoMunicipal, 10);
                const ib = parseInt(b.inscricaoMunicipal, 10);
                if (!isNaN(ia) && !isNaN(ib)) return ia - ib;
                return String(a.inscricaoMunicipal || '').localeCompare(String(b.inscricaoMunicipal || ''));
            });
            // Tudo a partir do índice 1 é secundário
            ordenado.slice(1).forEach(l => ids.add(l.id));
        });
        return ids;
    };

    const dashboard = calcDashboard();

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">💵</span>
                    <h2 className="text-2xl font-bold">Lançamento de Taxas</h2>
                </div>

                <div className="flex gap-4 mb-4 flex-wrap items-center">
                    <select value={modoVisualizacao} onChange={e => setModoVisualizacao(e.target.value)} className="px-4 py-2 border rounded bg-white min-w-[180px]">
                        <option value="mensal">📅 Mensal</option>
                        <option value="anual">📊 Consolidado Anual</option>
                        <option value="periodo">📆 Por Período</option>
                    </select>

                    {modoVisualizacao === 'mensal' && (
                        <select value={mes} onChange={e => setMes(Number(e.target.value))} className="px-4 py-2 border rounded bg-white min-w-[140px]">
                            {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                    )}

                    {modoVisualizacao === 'periodo' && (
                        <>
                            <select value={periodoInicio} onChange={e => setPeriodoInicio(Number(e.target.value))} className="px-4 py-2 border rounded bg-white min-w-[140px]">
                                {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                            </select>
                            <span className="flex items-center text-gray-600 font-medium">até</span>
                            <select value={periodoFim} onChange={e => setPeriodoFim(Number(e.target.value))} className="px-4 py-2 border rounded bg-white min-w-[140px]">
                                {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                            </select>
                        </>
                    )}

                    <select value={ano} onChange={e => setAno(Number(e.target.value))} className="px-4 py-2 border rounded bg-white min-w-[100px]">
                        {[2026, 2027, 2028, 2029, 2030].map(a => <option key={a} value={a}>{a}</option>)}
                    </select>

                    <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded border border-blue-200 font-medium min-w-[180px] text-center">
                        {modoVisualizacao === 'mensal' && `${MESES[mes]}/${ano}`}
                        {modoVisualizacao === 'anual' && `Ano ${ano}`}
                        {modoVisualizacao === 'periodo' && `${MESES[periodoInicio]} - ${MESES[periodoFim]}/${ano}`}
                    </div>

                    {ano >= 2027 ? (
                        <div key={`ufica-input-${ano}`} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded px-3 py-2">
                            <label className="text-sm text-green-700 font-medium">💵 UFICA {ano}:</label>
                            <input type="number" step="0.01" value={valorUfica[ano] || ''} onChange={e => setValorUfica({ ...valorUfica, [ano]: parseFloat(e.target.value) || 0 })} className="px-3 py-1 border rounded w-32 text-sm" placeholder="0.00" />
                        </div>
                    ) : (
                        <div key={`ufica-display-${ano}`} className="px-4 py-2 bg-green-50 text-green-700 rounded border border-green-200 text-sm">
                            💵 UFICA {ano}: R$ {formatarMoeda(valorUficaAtual)}
                        </div>
                    )}

                    <div className="flex items-end gap-4 ml-auto">
                        <div>
                            <label className="block text-sm text-gray-700 font-medium">Início intervalo</label>
                            <input
                                type="number"
                                value={intervaloInicio}
                                onChange={e => setIntervaloInicio(e.target.value)}
                                placeholder="Ex: 154610"
                                className="px-2 py-2 border rounded bg-white w-28"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-700 font-medium">Fim intervalo</label>
                            <input
                                type="number"
                                value={intervaloFim}
                                onChange={e => setIntervaloFim(e.target.value)}
                                placeholder="Ex: 154694"
                                className="px-2 py-2 border rounded bg-white w-28"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 border">
                        <div className="text-sm text-gray-600 mb-1">Total</div>
                        <div className="text-3xl font-bold text-gray-800">{dashboard.total}</div>
                    </div>
                    <div 
                        onClick={() => setFiltros({...filtros, apenasPendentes: !filtros.apenasPendentes})} 
                        className="bg-yellow-50 rounded-lg p-4 border border-yellow-200 cursor-pointer hover:bg-yellow-100 transition-colors"
                    >
                        <div className="text-sm text-gray-600 mb-1">Pendentes {filtros.apenasPendentes && '✓'}</div>
                        <div className="text-3xl font-bold text-yellow-600">{dashboard.pendentes}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="text-sm text-gray-600 mb-1">✅ Verificados</div>
                        <div className="text-3xl font-bold text-green-600">{dashboard.verificados}</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                        <div className="text-sm text-gray-600 mb-1">⚠️ Duplicados</div>
                        <div className="text-3xl font-bold text-orange-600">{dashboard.totalDuplicados}</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="text-sm text-gray-600 mb-1">Total TFLF</div>
                        <div className="text-3xl font-bold text-blue-600">R$ {formatarMoeda(dashboard.totalReais)}</div>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                        <div className="text-sm text-gray-600 mb-1">Total ISSQN</div>
                        <div className="text-3xl font-bold text-indigo-600">R$ {formatarMoeda(dashboard.totalISSQN)}</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <div className="text-sm text-gray-600 mb-1">Vigilância</div>
                        <div className="text-3xl font-bold text-purple-600">R$ {formatarMoeda(dashboard.vigilancia)}</div>
                    </div>
                </div>


                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    {(() => {
                        // 🔢 Contadores das abas (calculados uma vez, com duplicatas secundárias filtradas)
                        const idsDupSec = getDuplicadosSecundariosIds();
                        const semDup = list.filter(l => !idsDupSec.has(l.id));
                        const cPrincipal = semDup.filter(l => l.tributacao !== 'MEI' && l.tributacao !== 'AUTONOMO' && l.tributacao !== 'ISENTO').length;
                        const cMei = semDup.filter(l => l.tributacao === 'MEI').length;
                        const cAuto = semDup.filter(l => l.tributacao === 'AUTONOMO').length;
                        const cIsento = semDup.filter(l => l.tributacao === 'ISENTO').length;
                        const cVisa = semDup.filter(l => l.precisaVisa).length;
                        const cDup = idsDupSec.size;
                        return (
                            <div className="flex gap-2 mb-4 border-b overflow-x-auto">
                                <button onClick={() => setAbaAtiva('principal')} className={`px-4 py-2 font-medium ${abaAtiva === 'principal' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}>
                                    📋 Principal ({cPrincipal})
                                </button>
                                <button onClick={() => setAbaAtiva('mei')} className={`px-4 py-2 font-medium ${abaAtiva === 'mei' ? 'text-green-600 border-b-2 border-green-600' : 'text-gray-600'}`}>
                                    🏪 MEI ({cMei})
                                </button>
                                <button onClick={() => setAbaAtiva('autonomo')} className={`px-4 py-2 font-medium ${abaAtiva === 'autonomo' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-600'}`}>
                                    🧔🏽 Autônomo ({cAuto})
                                </button>
                                <button onClick={() => setAbaAtiva('isento')} className={`px-4 py-2 font-medium ${abaAtiva === 'isento' ? 'text-yellow-600 border-b-2 border-yellow-600' : 'text-gray-600'}`}>
                                    ✨ Isento ({cIsento})
                                </button>
                                <button onClick={() => setAbaAtiva('visa')} className={`px-4 py-2 font-medium ${abaAtiva === 'visa' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600'}`}>
                                    🏥 VISA ({cVisa})
                                </button>
                                <button onClick={() => setAbaAtiva('duplicados')} className={`px-4 py-2 font-medium ${abaAtiva === 'duplicados' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-600'}`}>
                                    ⚠️ Duplicidade ({cDup})
                                </button>
                                <button onClick={() => setAbaAtiva('Faltas')} className={`px-4 py-2 font-medium ${abaAtiva === 'Faltas' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-600'}`}>
                                    📢 Faltas ({faltas.length})
                                </button>
                            </div>
                        );
                    })()}

                    <div className="flex flex-wrap gap-4">
                        <button onClick={() => setModalInserir(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                            ➕ Inserir
                        </button>

                        <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded cursor-pointer hover:bg-indigo-700">
                            <span>📁 Importar TXT</span>
                            <input type="file" accept=".txt" onChange={e => importarTXT(e.target.files[0])} className="hidden" />
                        </label>

                        <button onClick={consultarTodos} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700" disabled={consultandoQueue.length > 0}>
                            {consultandoQueue.length > 0 ? '🔄 Consultando...' : '🔍 Consultar CNPJs'}
                        </button>

                        <button
                            onClick={consultarFaltas}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            disabled={consultandoFaltas}
                        >
                            {consultandoFaltas ? '🔄 Buscando...' : '🕵️ Consultar Faltas'}
                        </button>

                        <button
                            onClick={() => setModalReprocessar(true)}
                            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                        >
                            ⚙️ Reprocessar
                        </button>

                        <button onClick={exportCSV} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                            Exportar CSV
                        </button>

                        <button onClick={gerarRelatorioAuditores} className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700">
                            📑 Relatório PDF
                        </button>

                        <button onClick={fazerBackup} className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">
                            💾 Backup
                        </button>

                        <label className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded cursor-pointer hover:bg-orange-700">
                            <span>📥 Restaurar</span>
                            <input type="file" accept=".json" onChange={e => { if (e.target.files[0]) restaurarBackup(e.target.files[0]); }} className="hidden" />
                        </label>

                        <button onClick={desmarcarTodasCores} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600" title="Remove a marcação de cor/linha de todos os contribuintes deste mês">
                            🧹 Desmarcar Todas
                        </button>

                        <div className="flex items-center gap-2 bg-white border-2 border-blue-500 rounded px-3 py-2 min-w-[300px]">
                            <span className="text-blue-600">{buscandoGlobal ? '⏳' : '🔍'}</span>
                            <input
                                type="text"
                                value={pesquisaRapida}
                                onChange={e => setPesquisaRapida(e.target.value)}
                                placeholder="Buscar CNPJ, CPF ou Inscrição..."
                                className="flex-1 outline-none text-sm"
                            />
                            {buscandoGlobal && (
                                <span className="text-xs text-blue-600 animate-pulse">Buscando...</span>
                            )}
                            {pesquisaRapida && !buscandoGlobal && (
                                <button
                                    onClick={() => setPesquisaRapida('')}
                                    className="text-gray-400 hover:text-gray-600 font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                </div>


                {modoVisualizacao !== 'mensal' && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                    <strong>Modo de visualização {modoVisualizacao === 'anual' ? 'Anual' : 'por Período'}:</strong> Você está vendo dados consolidados. Algumas funções (inserir, importar, consultar faltas) estão desabilitadas. Volte ao modo "Mensal" para editar.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {modalInserir && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                                <h3 className="text-xl font-bold mb-4">➕ Inserir Contribuinte</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Inscrição Municipal</label>
                                        <input type="text" value={formInserir.inscricao} onChange={e => setFormInserir({ ...formInserir, inscricao: e.target.value })} className="w-full px-3 py-2 border rounded" placeholder="Opcional" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">CPF/CNPJ *</label>
                                        <input type="text" value={formInserir.documento} onChange={e => setFormInserir({ ...formInserir, documento: e.target.value })} className="w-full px-3 py-2 border rounded" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nome/Razão Social *</label>
                                        <input type="text" value={formInserir.nome} onChange={e => setFormInserir({ ...formInserir, nome: e.target.value })} className="w-full px-3 py-2 border rounded" required />
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-6">
                                    <button onClick={inserirManual} className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">✓ Confirmar</button>
                                    <button onClick={() => { setModalInserir(false); setFormInserir({ inscricao: '', documento: '', nome: '' }); }} className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">✗ Cancelar</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {modalInserirFalta && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                                <h3 className="text-xl font-bold mb-4">➕ Inserir Contribuinte</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Inscrição Municipal</label>
                                        <input
                                            type="text"
                                            value={formInserir.inscricao}
                                            className="w-full px-3 py-2 border rounded bg-gray-100"
                                            placeholder="Opcional"
                                            readOnly
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">CPF/CNPJ *</label>
                                        <input
                                            type="text"
                                            value={formInserir.documento}
                                            onChange={e => setFormInserir({ ...formInserir, documento: e.target.value })}
                                            className="w-full px-3 py-2 border rounded"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Nome/Razão Social *</label>
                                        <input
                                            type="text"
                                            value={formInserir.nome}
                                            onChange={e => setFormInserir({ ...formInserir, nome: e.target.value })}
                                            className="w-full px-3 py-2 border rounded"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-6">
                                    <button
                                        onClick={async () => {
                                            if (!formInserir.documento.trim() || !formInserir.nome.trim()) {
                                                alert('❌ Preencha pelo menos Documento e Nome!');
                                                return;
                                            }

                                            const clean = formInserir.documento.replace(/\D/g, '');
                                            const novo = {
                                                inscricaoMunicipal: formInserir.inscricao || '',
                                                documento: clean,
                                                tipoPessoa: clean.length === 11 ? 'CPF' : 'CNPJ',
                                                razaoSocial: formInserir.nome,
                                                porte: '',
                                                tributacao: clean.length === 11 ? 'AUTONOMO' : '',
                                                situacao: '',
                                                areaM2: 0,
                                                ordemServico: '',
                                                nivelISSQN: clean.length === 11 ? 'MEDIO' : 'VARIAVEL',
                                                issqnIsento: false,
                                                trimestreAbertura: getTrimestreDaCompetencia(mes),
                                                taxasLancadas: 'NAO',
                                                verificado: false,
                                                precisaVisa: false,
                                                criadoEm: Date.now()
                                            };


                                            const ref = await db.ref(`contribuintes/${ano}/${mes}`).push(novo);

                                            // ✅ Adicionar à lista local IMEDIATAMENTE
                                            setList(prev => [...prev, { id: ref.key, ...novo }]);

                                            // ✅ Remover da lista de faltas
                                            setFaltas(prev => prev.filter(f => f.inscricaoMunicipal !== formInserir.inscricao));

                                            // ✅ Mudar para aba correta automaticamente
                                            if (novo.tributacao === 'MEI') {
                                                setAbaAtiva('mei');
                                            } else if (novo.tributacao === 'AUTONOMO') {
                                                setAbaAtiva('autonomo');
                                            } else {
                                                setAbaAtiva('principal');
                                            }

                                            setModalInserirFalta(false);
                                            setFaltaSelecionada(null);
                                            setFormInserir({ inscricao: '', documento: '', nome: '' });

                                            alert('✅ Contribuinte inserido com sucesso!\n\nFoi adicionado na aba correta automaticamente.');
                                        }}
                                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                    >
                                        ✓ Confirmar
                                    </button>
                                    <button
                                        onClick={() => {
                                            setModalInserirFalta(false);
                                            setFaltaSelecionada(null);
                                            setFormInserir({ inscricao: '', documento: '', nome: '' });
                                        }}
                                        className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                                    >
                                        ✗ Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-indigo-600 text-white">
                                <tr>
                                    <th className="px-2 py-2 text-center w-12" title="Número sequencial dentro da aba">Nº</th>
                                    <th className="px-3 py-2 text-left " >
                                        Status
                                    </th>
                                    <th className="px-3 py-2 text-left " >
                                        Cor
                                    </th>
                                    <th className="px-3 py-2 text-left " >
                                        Inscrição
                                    </th>
                                    {pesquisaRapida && (
                                        <th className="px-3 py-2 text-center">
                                            Mês
                                        </th>
                                    )}
                                    <th className="px-3 py-2 text-left " >
                                        Documento
                                    </th>
                                    <th className="px-3 py-2 text-left " >
                                        Identificação do Contribuinte
                                    </th>
                                    <th className="px-3 py-2 text-left " >
                                        Situação
                                    </th>
                                    <th className="px-3 py-2">Porte</th>
                                    <th className="px-3 py-2">Tributação</th>
                                    <th className="px-3 py-2">VISA?</th>
                                    <th className="px-3 py-2">Área m²</th>
                                    <th className="px-3 py-2">N° OS</th>
                                    <th className="px-3 py-2">Auditor</th>
                                    <th className="px-3 py-2">Trimestre</th>
                                    <th className="px-3 py-2">Nível</th>
                                    <th className="px-3 py-2">TFLF</th>
                                    <th className="px-3 py-2">ISSQN</th>
                                    <th className="px-3 py-2">VISA R$</th>
                                    <th className="px-3 py-2">Finalizado</th>
                                    <th className="px-3 py-2">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    let listaExibir = getSortedList();

                                    // ✅ APLICAR FILTROS AVANÇADOS
                                    listaExibir = aplicarFiltros(listaExibir);


                                    // Mostrar contador de registros filtrados
                                    const totalFiltrado = listaExibir.length;
                                    const totalGeral = list.length;
                                    const filtrosAtivos = filtros.busca || filtros.auditor || filtros.situacao ||
                                        filtros.tributacao || filtros.apenasVerificados || filtros.apenasPendentes;
                                    // 🎯 IDs das duplicatas secundárias (escondidas das abas operacionais)
                                    const idsDuplicSecundarios = getDuplicadosSecundariosIds();

                                    if (abaAtiva === 'principal') {
                                        listaExibir = listaExibir.filter(l => l.tributacao !== 'MEI' && l.tributacao !== 'AUTONOMO' && l.tributacao !== 'ISENTO' && !idsDuplicSecundarios.has(l.id));
                                    } else if (abaAtiva === 'mei') {
                                        listaExibir = listaExibir.filter(l => l.tributacao === 'MEI' && !idsDuplicSecundarios.has(l.id));
                                    } else if (abaAtiva === 'autonomo') {
                                        listaExibir = listaExibir.filter(l => l.tributacao === 'AUTONOMO' && !idsDuplicSecundarios.has(l.id));
                                    } else if (abaAtiva === 'isento') {
                                        listaExibir = listaExibir.filter(l => l.tributacao === 'ISENTO' && !idsDuplicSecundarios.has(l.id));
                                    } else if (abaAtiva === 'visa') {
                                        listaExibir = listaExibir.filter(l => l.precisaVisa && !idsDuplicSecundarios.has(l.id));
                                    } else if (abaAtiva === 'duplicados') {
                                        // Aba Duplicidade: somente as inscrições secundárias (não a menor)
                                        listaExibir = aplicarFiltros(list.filter(l => idsDuplicSecundarios.has(l.id)));
                                    } else if (abaAtiva === 'Faltas') {
                                        if (faltas.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan="21" className="px-4 py-8 text-center text-gray-500">
                                                        Clique em "Consultar Faltas" para verificar inscrições ausentes neste mês.
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return faltas.map((falta, idx) => (
                                            <tr key={idx} className="bg-red-50 border-t hover:bg-red-100">
                                                <td className="px-2 py-2 text-center font-semibold text-gray-700">{idx + 1}</td>
                                                <td className="px-3 py-2 text-center">❗</td>
                                                <td className="px-3 py-2">-</td>
                                                <td className="px-3 py-2 font-medium">{falta.inscricaoMunicipal}</td>
                                                <td className="px-3 py-2 font-mono">{falta.documento}</td>
                                                <td className="px-3 py-2">{falta.razaoSocial}</td>
                                                <td className="px-3 py-2 text-center">-</td>
                                                <td className="px-3 py-2">-</td>
                                                <td className="px-3 py-2">-</td>
                                                <td className="px-3 py-2 text-center">-</td>
                                                <td className="px-3 py-2">-</td>
                                                <td className="px-3 py-2">-</td>
                                                <td className="px-3 py-2">-</td>
                                                <td className="px-3 py-2">-</td>
                                                <td className="px-3 py-2">-</td>
                                                <td className="px-3 py-2 text-right">-</td>
                                                <td className="px-3 py-2 text-right">-</td>
                                                <td className="px-3 py-2 text-right">-</td>
                                                <td className="px-3 py-2">-</td>
                                                <td className="px-3 py-2 text-center">
                                                    <button
                                                        onClick={() => {
                                                            setFaltaSelecionada(falta);
                                                            setFormInserir({
                                                                inscricao: falta.inscricaoMunicipal || '',
                                                                documento: falta.documento || '',
                                                                nome: falta.razaoSocial !== 'Não encontrado' ? falta.razaoSocial : ''
                                                            });
                                                            setModalInserirFalta(true);
                                                        }}
                                                        className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                                                    >
                                                        ➕
                                                    </button>
                                                </td>
                                            </tr>
                                        ));
                                    }

                                    if (listaExibir.length === 0) {
                                        return (
                                            <tr>
                                                <td colSpan="21" className="px-4 py-8 text-center text-gray-500">
                                                    {abaAtiva === 'duplicados' ? '✅ Nenhum duplicado!' : 'Nenhum contribuinte nesta aba.'}
                                                </td>
                                            </tr>
                                        );
                                    }

                                    return listaExibir.map((l, idx) => {
                                        const tflf = calcTFLFReais(l.tributacao, l.tipoPessoa);
                                        const issqnUficas = calcISSQN(l.nivelISSQN, getTrimestreEfetivo(l, mes), l.issqnIsento, l.tipoPessoa);
                                        const issqnReais = issqnUficas * valorUficaAtual;
                                        const visa = calcVISA(l.areaM2 || 0, l.tributacao, l.porte, l.precisaVisa);
                                        const consultando = consultandoQueue.includes(l.id);
                                        const isDuplicado = getDuplicados().some(d => d.id === l.id);

                                        const getRowBgColor = () => {
                                            if (marcadores[l.id] === 'red') return 'bg-red-100';
                                            if (marcadores[l.id] === 'yellow') return 'bg-yellow-100';
                                            if (marcadores[l.id] === 'green') return 'bg-green-100';
                                            if (marcadores[l.id] === 'blue') return 'bg-blue-100';
                                            if (marcadores[l.id] === 'purple') return 'bg-purple-100';
                                            if (marcadores[l.id] === 'orange') return 'bg-orange-100';
                                            if (isDuplicado && abaAtiva === 'duplicados') return 'bg-orange-50';
                                            return '';
                                        };

                                        return (
                                            <tr key={l.id} className={`border-t hover:bg-gray-50 ${getRowBgColor()} ${marcadores[l.id] === 'linha' ? 'line-through text-gray-400' : ''}`}>
                                                <td className="px-2 py-2 text-center font-semibold text-gray-700 bg-gray-50">{idx + 1}</td>
                                                <td className="px-3 py-2 text-center">
                                                    {consultando ? <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-blue-100 border border-blue-300" title="Consultando...">🔄</span> :
                                                        isDuplicado ? <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-orange-100 border border-orange-300" title="Duplicado">⚠️</span> :
                                                            l.consultaIncerta ? <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-red-100 border border-red-300" title="Falha na consulta ou dados incompletos da Receita - revisar manualmente">🚨</span> :
                                                                l.verificado ? <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-green-100 border border-green-300" title="Verificado">✅</span> :
                                                                    l.editadoManualmente ? <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-purple-100 border border-purple-300" title="Editado manualmente">☑️</span> :
                                                                        <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-gray-100 border border-gray-300" title="Pendente">🕘</span>}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setMenuCorAberto(menuCorAberto === l.id ? null : l.id)}
                                                            className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-gray-400 flex items-center justify-center text-[10px] font-bold text-gray-600"
                                                            style={{ backgroundColor: (marcadores[l.id] && marcadores[l.id] !== 'linha') ? marcadores[l.id] : '#e5e7eb' }}
                                                        >
                                                            {marcadores[l.id] === 'linha' && '—'}
                                                        </button>
                                                        {menuCorAberto === l.id && (
                                                            <div className="absolute z-10 mt-1 bg-white border rounded shadow-lg p-2 flex gap-1">
                                                                {['red', 'yellow', 'green', 'blue', 'purple', 'orange'].map(cor => (
                                                                    <button
                                                                        key={cor}
                                                                        onClick={() => {
                                                                            toggleMarcador(l.id, marcadores[l.id] === cor ? null : cor);
                                                                            setMenuCorAberto(null);
                                                                        }}
                                                                        className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-gray-800"
                                                                        style={{ backgroundColor: cor }}
                                                                    />
                                                                ))}
                                                                <button
                                                                    onClick={() => {
                                                                        toggleMarcador(l.id, marcadores[l.id] === 'linha' ? null : 'linha');
                                                                        setMenuCorAberto(null);
                                                                    }}
                                                                    className="w-6 h-6 rounded-full border-2 border-gray-400 hover:border-gray-800 bg-white flex items-center justify-center text-[10px] font-bold text-gray-700"
                                                                    title="Linha (riscar a linha inteira)"
                                                                >—</button>
                                                                <button
                                                                    onClick={() => { toggleMarcador(l.id, null); setMenuCorAberto(null); }}
                                                                    className="w-6 h-6 rounded-full border-2 border-gray-300 hover:border-gray-800 bg-white text-xs"
                                                                    title="Limpar marcação desta linha"
                                                                >✕</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">{l.inscricaoMunicipal}</td>
                                                {pesquisaRapida && (
                                                    <td className="px-3 py-2 text-center !bg-white">
                                                        <span className="px-3 py-1.5 rounded-md text-xs font-bold !bg-blue-600 !text-white shadow-sm">
                                                            {MESES[l.mesOrigem || mes]}
                                                        </span>
                                                    </td>
                                                )}
                                                <td className="px-3 py-2 font-mono">{l.documento}</td>
                                                <td
                                                    className="px-3 py-2 relative"
                                                    onMouseEnter={() => setLinhaHoverEndereco(l.id)}
                                                    onMouseLeave={() => setLinhaHoverEndereco(null)}
                                                    onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}
                                                >
                                                    {l.razaoSocial}
                                                    {l.endereco && <span className="text-gray-400 ml-1" title="Segure CTRL e passe o mouse para ver o endereço">📍</span>}
                                                    {linhaHoverEndereco === l.id && ctrlPressionado && (
                                                        <div
                                                            className="fixed z-50 bg-gray-900 text-white text-xs rounded shadow-lg px-3 py-2 max-w-xs whitespace-normal break-words"
                                                            style={{ left: mousePos.x + 14, top: mousePos.y + 14 }}
                                                        >
                                                            📍 {formatarEndereco(l.endereco) || 'Endereço não disponível — consulte o CNPJ'}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${l.situacao === 'Ativa' ? 'bg-green-100 text-green-800 border border-green-300' :
                                                        l.situacao === 'Suspensa' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                                                            l.situacao === 'Inapta' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                                                                l.situacao === 'Baixada' ? 'bg-red-100 text-red-800 border border-red-300' :
                                                                    l.situacao === 'Nula' ? 'bg-purple-100 text-purple-800 border border-purple-300' :
                                                                        'bg-gray-100 text-gray-700 border border-gray-300'}`}>
                                                        {l.situacao || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <select value={l.porte || ''} onChange={e => update(l.id, 'porte', e.target.value)} className="px-2 py-1 border rounded bg-white text-xs" disabled={l.tipoPessoa === 'CPF'}>
                                                        <option value="">-</option>
                                                        <option value="ME">ME</option>
                                                        <option value="EPP">EPP</option>
                                                        <option value="DEMAIS">DEMAIS</option>
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <select value={l.tributacao || ''} onChange={e => update(l.id, 'tributacao', e.target.value)} className="px-2 py-1 border rounded bg-white text-xs">
                                                        <option value="">Selecione</option>
                                                        <option value="ISENTO">Isento</option>
                                                        <option value="MEI">MEI</option>
                                                        <option value="AUTONOMO">Autônomo</option>
                                                        <option value="SIMPLES">Simples</option>
                                                        <option value="LUCRO PRESUMIDO">L. Presumido</option>
                                                        <option value="LUCRO REAL">L. Real</option>
                                                        <option value="BANCO">Banco</option>                                                                                                                              
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => update(l.id, 'precisaVisa', !l.precisaVisa)}
                                                        title={infoBandeiraVisa(l).label}
                                                        className={`inline-block hover:scale-110 transition-transform ${infoBandeiraVisa(l).cor}`}
                                                    >
                                                        <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M14.778.085A.5.5 0 0 1 15 .5V8a.5.5 0 0 1-.314.464L14.5 8l.186.464-.003.001-.006.003-.023.009a12.435 12.435 0 0 1-.397.15c-.264.095-.631.223-1.047.35-.816.252-1.879.523-2.71.523-.847 0-1.548-.28-2.158-.525l-.028-.01C7.68 8.71 7.14 8.5 6.5 8.5c-.7 0-1.638.23-2.437.477A19.626 19.626 0 0 0 3 9.342V15.5a.5.5 0 0 1-1 0V.5a.5.5 0 0 1 1 0v.282c.226-.079.496-.17.79-.26C4.606.272 5.67 0 6.5 0c.84 0 1.524.277 2.121.519l.043.018C9.286.788 9.828 1 10.5 1c.7 0 1.638-.23 2.437-.477a19.587 19.587 0 0 0 1.349-.476l.019-.007.004-.002h.002z"/>
                                                        </svg>
                                                    </button>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input type="number" value={l.areaM2 || ''} onChange={e => update(l.id, 'areaM2', Number(e.target.value))} className="px-2 py-1 border rounded w-16 text-xs" disabled={!l.precisaVisa} />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input type="text" value={l.ordemServico || ''} onChange={e => update(l.id, 'ordemServico', e.target.value)} placeholder="N° OS" className="px-2 py-1 border rounded w-20 text-xs" />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <select value={l.auditor || ''} onChange={e => update(l.id, 'auditor', e.target.value)} className="px-2 py-1 border rounded text-xs bg-white">
                                                        <option value="">Selecione</option>
                                                        {AUDITORES.map((aud, idx) => <option key={idx} value={aud}>{aud}</option>)}
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2">
                                                    {l.tipoPessoa === 'CNPJ' ? (
                                                        <span class="block w-full text-center text-gray-500">N/A</span>
                                                    ) : (
                                                        <select
                                                            value={l.trimestreEditadoManual ? l.trimestreAbertura : getTrimestreDaCompetencia(mes)}
                                                            onChange={e => {
                                                                const novoValor = Number(e.target.value);
                                                                // Marca como editado manualmente apenas se difere do calculado pela competência
                                                                const ehEdicaoManual = novoValor !== getTrimestreDaCompetencia(mes);
                                                                update(l.id, 'trimestreAbertura', novoValor);
                                                                update(l.id, 'trimestreEditadoManual', ehEdicaoManual);
                                                            }}
                                                            className={`px-2 py-1 border rounded text-xs ${l.trimestreEditadoManual ? 'bg-yellow-50 border-yellow-400' : 'bg-white'}`}
                                                            title={l.trimestreEditadoManual ? 'Editado manualmente — não recalcula automaticamente' : 'Calculado automaticamente pela competência'}
                                                        >
                                                            <option value={1}>1°</option>
                                                            <option value={2}>2°</option>
                                                            <option value={3}>3°</option>
                                                            <option value={4}>4°</option>
                                                        </select>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <select value={l.nivelISSQN} onChange={e => update(l.id, 'nivelISSQN', e.target.value)} className="px-2 py-1 border rounded text-xs" disabled={l.tipoPessoa === 'CNPJ'}>
                                                        {l.tipoPessoa === 'CNPJ' ? <option value="VARIAVEL">Variável</option> : <><option value="MEDIO">Médio</option><option value="SUPERIOR">Superior</option></>}
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2 text-right">R$ {formatarMoeda(tflf)}</td>
                                                <td className="px-3 py-2 text-right">R$ {formatarMoeda(issqnReais)}</td>
                                                <td className="px-3 py-2 text-right">R$ {formatarMoeda(visa)}</td>
                                                <td className="px-3 py-2">
                                                    <select value={l.taxasLancadas} onChange={e => update(l.id, 'taxasLancadas', e.target.value)} className={`px-2 py-1 border rounded text-xs ${l.taxasLancadas === 'SIM' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                                                        <option value="NAO">NÃO</option>
                                                        <option value="SIM">SIM</option>
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <button onClick={() => excluir(l.id)} className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs mr-1">🗑️</button>
                                                    <button
                                                        onClick={() => {
                                                            setModalObservacao({ id: l.id, razaoSocial: l.razaoSocial, documento: l.documento });
                                                            setObservacaoTexto(l.observacao || '');
                                                        }}
                                                        className={`px-2 py-1 rounded text-xs mr-1 ${l.observacao ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                                                        title={l.observacao ? `Observação: ${l.observacao}` : 'Adicionar observação'}
                                                    >📘</button>
                                                    {l.tipoPessoa === 'CNPJ' && (
                                                        <button
                                                            onClick={() => consultarCNPJIndividual(l.documento, l.id, l.razaoSocial)}
                                                            className={`px-2 py-1 text-white rounded text-xs ${l.verificado ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                                                            title={l.verificado ? 'Reprocessar este contribuinte' : 'Consultar CNPJ'}
                                                        >
                                                            {l.verificado ? '🔄' : '🔍'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ⚙️ MODAL REPROCESSAR */}
            {modalReprocessar && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded p-6 max-w-md">
                        <h3 className="text-xl font-bold mb-4">⚙️ Reprocessar</h3>
                        <div className="space-y-2 mb-4">
                            <label className="flex gap-2">
                                <input
                                    type="checkbox"
                                    checked={opcoesReproc.visa}
                                    onChange={e => setOpcoesReproc({ ...opcoesReproc, visa: e.target.checked })}
                                />
                                🏥 VISA (CNAEs principais + secundários)
                            </label>
                            <label className="flex gap-2">
                                <input
                                    type="checkbox"
                                    checked={opcoesReproc.porte}
                                    onChange={e => setOpcoesReproc({ ...opcoesReproc, porte: e.target.checked })}
                                />
                                📊 Porte (ME/DEMAIS)
                            </label>
                            <label className="flex gap-2">
                                <input
                                    type="checkbox"
                                    checked={opcoesReproc.trib}
                                    onChange={e => setOpcoesReproc({ ...opcoesReproc, trib: e.target.checked })}
                                />
                                💰 Tributação (MEI/Simples/Lucro)
                            </label>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={rodarReprocessamento}
                                className="flex-1 bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700"
                                disabled={rodando}
                            >
                                {rodando ? '🔄 Processando...' : '▶️ Executar'}
                            </button>
                            <button
                                onClick={() => setModalReprocessar(false)}
                                className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                                disabled={rodando}
                            >
                                ✗ Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 📝 MODAL OBSERVAÇÃO */}
            {modalObservacao && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-2xl">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <span>📘</span> Observação
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    <span className="font-medium">{modalObservacao.razaoSocial}</span>
                                    {modalObservacao.documento && (
                                        <span className="text-gray-400 ml-2 font-mono text-xs">{modalObservacao.documento}</span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <textarea
                            value={observacaoTexto}
                            onChange={e => setObservacaoTexto(e.target.value)}
                            placeholder="Ex: Empresa em processo de baixa / Aguardando retorno do contador / Endereço divergente..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none text-sm"
                            rows={5}
                            autoFocus
                        />
                        <div className="text-xs text-gray-500 mt-1 mb-4">
                            {observacaoTexto.length} caracteres
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={async () => {
                                    await update(modalObservacao.id, 'observacao', observacaoTexto.trim());
                                    setModalObservacao(null);
                                    setObservacaoTexto('');
                                }}
                                className="flex-1 bg-amber-500 text-white px-4 py-2 rounded hover:bg-amber-600 font-medium"
                            >
                                💾 Salvar
                            </button>
                            {modalObservacao && (
                                <button
                                    onClick={async () => {
                                        if (confirm('Remover a observação deste contribuinte?')) {
                                            await update(modalObservacao.id, 'observacao', '');
                                            setModalObservacao(null);
                                            setObservacaoTexto('');
                                        }
                                    }}
                                    className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                                    title="Remover observação"
                                >
                                    🗑️
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setModalObservacao(null);
                                    setObservacaoTexto('');
                                }}
                                className="flex-1 bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                            >
                                ✗ Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* OVERLAY DE PROGRESSO */}
            {processando && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl mx-4">
                        <div className="text-center">
                            <div className="text-4xl mb-3">⚙️</div>
                            <h3 className="text-xl font-bold mb-1 text-gray-800">{processoTitulo}</h3>

                            <div className="text-5xl font-extrabold text-blue-600 my-4">
                                {processoAtual} <span className="text-2xl font-normal text-gray-400">de</span> {processoTotal}
                            </div>

                            <div className="w-full bg-gray-200 rounded-full h-5 mb-3 overflow-hidden">
                                <div
                                    className="bg-gradient-to-r from-blue-500 to-blue-700 h-5 rounded-full transition-all duration-500"
                                    style={{ width: `${processoTotal > 0 ? (processoAtual / processoTotal) * 100 : 0}%` }}
                                ></div>
                            </div>

                            <div className="text-lg font-semibold text-blue-600 mb-3">
                                {processoTotal > 0 ? ((processoAtual / processoTotal) * 100).toFixed(0) : 0}% concluído
                            </div>

                            {processoItemAtual && (
                                <div className="text-sm text-gray-500 bg-gray-50 rounded px-3 py-2 truncate">
                                    📋 {processoItemAtual}
                                </div>
                            )}

                            {processoAviso && (
                                <div className="text-sm text-orange-600 bg-orange-50 border border-orange-200 rounded px-3 py-2 mt-2 animate-pulse">
                                    {processoAviso}
                                </div>
                            )}

                            {processoTempoEstimado && (
                                <div className="text-xs text-gray-400 mt-2">
                                    ⏱️ Tempo estimado: {processoTempoEstimado}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
