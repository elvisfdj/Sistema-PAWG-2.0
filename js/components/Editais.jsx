function Editais() {
    const [ano, setAno] = useState(new Date().getFullYear());
    const [mes, setMes] = useState(new Date().getMonth());
    const [modoVisualizacao, setModoVisualizacao] = useState('mensal');

    const [filtroTributacao, setFiltroTributacao] = useState({
        'SIMPLES': true,
        'LUCRO PRESUMIDO': true,
        'LUCRO REAL': true,
        'MEI': false,
        'AUTONOMO': false,
        'BANCO': false,
        'ISENTO': false
    });

    const [limitePorEdital, setLimitePorEdital] = useState(50);
    const [numeroInicial, setNumeroInicial] = useState(1);
    const [contribuintes, setContribuintes] = useState([]);
    const [carregando, setCarregando] = useState(false);
    const [gerando, setGerando] = useState(false);
    const [previa, setPrevia] = useState(null);
    const [duplicadosIgnorados, setDuplicadosIgnorados] = useState(0);

    // 🎯 Remove duplicatas por CNPJ/CPF (mesma regra da aba "Duplicidade" em Contribuintes):
    // dentro de cada grupo com o mesmo documento, mantém só a MENOR inscrição municipal —
    // as demais são duplicatas e NÃO devem ir pro edital (senão publica a mesma
    // empresa duas vezes, uma pela inscrição certa e outra pela duplicada).
    const removerDuplicados = (lista) => {
        const documentos = {};
        lista.forEach(c => {
            if (!c.documento) return;
            if (!documentos[c.documento]) documentos[c.documento] = [];
            documentos[c.documento].push(c);
        });
        const idsSecundarios = new Set();
        Object.values(documentos).forEach(grupo => {
            if (grupo.length <= 1) return;
            const ordenado = [...grupo].sort((a, b) => {
                const ia = parseInt(a.inscricaoMunicipal, 10);
                const ib = parseInt(b.inscricaoMunicipal, 10);
                if (!isNaN(ia) && !isNaN(ib)) return ia - ib;
                return String(a.inscricaoMunicipal || '').localeCompare(String(b.inscricaoMunicipal || ''));
            });
            ordenado.slice(1).forEach(c => idsSecundarios.add(c.id));
        });
        setDuplicadosIgnorados(idsSecundarios.size);
        return lista.filter(c => !idsSecundarios.has(c.id));
    };

    useEffect(() => {
        const carregar = async () => {
            setCarregando(true);
            try {
                const lista = [];
                if (modoVisualizacao === 'mensal') {
                    const snap = await db.ref(`contribuintes/${ano}/${mes}`).once('value');
                    const data = snap.val();
                    if (data && typeof data === 'object') {
                        Object.entries(data).forEach(([k, v]) => {
                            if (v && typeof v === 'object') lista.push({ id: k, ...v });
                        });
                    }
                } else {
                    for (let m = 0; m <= 11; m++) {
                        const snap = await db.ref(`contribuintes/${ano}/${m}`).once('value');
                        const data = snap.val();
                        if (data && typeof data === 'object') {
                            Object.entries(data).forEach(([k, v]) => {
                                if (v && typeof v === 'object') lista.push({ id: k, ...v });
                            });
                        }
                    }
                }
                setContribuintes(removerDuplicados(lista));
            } catch (err) {
                console.error('Erro ao carregar:', err);
                alert('Erro ao carregar contribuintes: ' + err.message);
            } finally {
                setCarregando(false);
            }
        };
        carregar();
    }, [ano, mes, modoVisualizacao]);

    useEffect(() => {
        const regimes = Object.keys(filtroTributacao).filter(k => filtroTributacao[k]);
        const filtrados = contribuintes.filter(c => regimes.includes(c.tributacao));
        const ordenados = [...filtrados].sort((a, b) => {
            const ia = Number(a.inscricaoMunicipal) || 0;
            const ib = Number(b.inscricaoMunicipal) || 0;
            return ia - ib;
        });
        const lim = Math.max(1, limitePorEdital);
        const totalLotes = filtrados.length > 0 ? Math.ceil(filtrados.length / lim) : 0;
        setPrevia({ totalFiltrado: filtrados.length, totalEditais: totalLotes, regimes, amostra: ordenados.slice(0, 3) });
    }, [contribuintes, filtroTributacao, limitePorEdital]);

    const toggleFiltro = (regime) => {
        setFiltroTributacao(prev => ({ ...prev, [regime]: !prev[regime] }));
    };

    const gerarEditais = async () => {
        const regimes = Object.keys(filtroTributacao).filter(k => filtroTributacao[k]);
        if (regimes.length === 0) { alert('Selecione pelo menos um regime de tributação.'); return; }
        const filtrados = contribuintes.filter(c => regimes.includes(c.tributacao));
        if (filtrados.length === 0) { alert('Nenhum contribuinte encontrado com os filtros selecionados.'); return; }

        // Etapa 1: ordenar por Inscrição Municipal (ASC)
        const ordenadosPorInscricao = [...filtrados].sort((a, b) => {
            const ia = Number(a.inscricaoMunicipal) || 0;
            const ib = Number(b.inscricaoMunicipal) || 0;
            return ia - ib;
        });

        // Etapa 2: dividir em lotes
        const lim = Math.max(1, limitePorEdital);
        const lotes = [];
        for (let i = 0; i < ordenadosPorInscricao.length; i += lim) {
            lotes.push(ordenadosPorInscricao.slice(i, i + lim));
        }

        if (!confirm(`Gerar ${lotes.length} edital(is) com ${filtrados.length} contribuinte(s)?`)) return;

        setGerando(true);
        try {
            if (typeof docx === 'undefined') {
                alert('❌ Biblioteca DOCX não carregou. Verifique sua conexão e recarregue a página.');
                setGerando(false);
                return;
            }
            const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, BorderStyle } = docx;

            for (let idx = 0; idx < lotes.length; idx++) {
                const numeroEdital = String(numeroInicial + idx).padStart(3, '0');

                // Etapa 3: ordenar lote por Razão Social (A-Z)
                const lote = [...lotes[idx]].sort((a, b) => {
                    return (a.razaoSocial || '').toUpperCase().localeCompare((b.razaoSocial || '').toUpperCase(), 'pt-BR');
                });

                const bordaCell = {
                    top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                    bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                    left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                    right: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
                };

                const headerRow = new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'N°', bold: true, size: 22, font: 'Arial' })], alignment: AlignmentType.CENTER })], width: { size: 8, type: WidthType.PERCENTAGE }, borders: bordaCell, shading: { fill: 'D9D9D9' } }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Inscrição Municipal', bold: true, size: 22, font: 'Arial' })], alignment: AlignmentType.CENTER })], width: { size: 22, type: WidthType.PERCENTAGE }, borders: bordaCell, shading: { fill: 'D9D9D9' } }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Razão Social', bold: true, size: 22, font: 'Arial' })], alignment: AlignmentType.CENTER })], width: { size: 70, type: WidthType.PERCENTAGE }, borders: bordaCell, shading: { fill: 'D9D9D9' } })
                    ],
                    tableHeader: true
                });

                const dataRows = lote.map((contrib, rowIdx) => new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(rowIdx + 1).padStart(2, '0'), size: 20, font: 'Arial' })], alignment: AlignmentType.CENTER })], borders: bordaCell }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: contrib.inscricaoMunicipal || '-', size: 20, font: 'Arial' })], alignment: AlignmentType.CENTER })], borders: bordaCell }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: contrib.razaoSocial || '-', size: 20, font: 'Arial' })] })], borders: bordaCell })
                    ]
                }));

                const tabela = new Table({ rows: [headerRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } });

                // 📅 Data por extenso no padrão "Campos dos Goytacazes, DD de MÊS de AAAA."
                const hoje = new Date();
                const MESES_EXT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
                const dataExtenso = `Campos dos Goytacazes, ${hoje.getDate()} de ${MESES_EXT[hoje.getMonth()]} de ${hoje.getFullYear()}.`;

                const doc = new Document({
                    sections: [{
                        properties: { page: { margin: { top: 720, bottom: 720, left: 1080, right: 1080 } } },
                        children: [
                            new Paragraph({ children: [new TextRun({ text: `EDITAL ${numeroEdital}/SAR/SMF`, bold: true, size: 28, font: 'Arial' })], alignment: AlignmentType.CENTER, spacing: { after: 240 } }),
                            new Paragraph({ children: [new TextRun({ text: EDITAL_TEXTO.paragrafo1, size: 24, font: 'Arial' })], alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 }, indent: { firstLine: 720 } }),
                            new Paragraph({ children: [new TextRun({ text: EDITAL_TEXTO.paragrafo2, size: 24, font: 'Arial' })], alignment: AlignmentType.JUSTIFIED, spacing: { after: 200 }, indent: { firstLine: 720 } }),
                            new Paragraph({
                                children: [
                                    new TextRun({ text: 'Embasamento legal:', bold: true, size: 24, font: 'Arial' }),
                                    new TextRun({ text: ' Artigos 150, 305 (quando houver prestação de serviços) e 357 da Lei Complementar nº 01/2017 (CTM).', size: 24, font: 'Arial' })
                                ],
                                alignment: AlignmentType.JUSTIFIED,
                                spacing: { after: 200 }
                            }),
                            new Paragraph({ children: [new TextRun({ text: EDITAL_TEXTO.paragrafo4, size: 24, font: 'Arial' })], alignment: AlignmentType.JUSTIFIED, spacing: { after: 400 }, indent: { firstLine: 720 } }),
                            tabela,
                            // Data
                            new Paragraph({ children: [new TextRun({ text: '', size: 24, font: 'Arial' })], spacing: { before: 400, after: 200 } }),
                            new Paragraph({ children: [new TextRun({ text: dataExtenso, size: 24, font: 'Arial' })], alignment: AlignmentType.LEFT, spacing: { after: 600 } }),
                            // Assinatura
                            new Paragraph({ children: [new TextRun({ text: EDITAL_ASSINATURA.nome, size: 24, font: 'Arial' })], alignment: AlignmentType.CENTER }),
                            new Paragraph({ children: [new TextRun({ text: EDITAL_ASSINATURA.cargo1, size: 24, font: 'Arial' })], alignment: AlignmentType.CENTER }),
                            new Paragraph({ children: [new TextRun({ text: EDITAL_ASSINATURA.cargo2, size: 24, font: 'Arial' })], alignment: AlignmentType.CENTER }),
                            new Paragraph({ children: [new TextRun({ text: `Matrícula: ${EDITAL_ASSINATURA.matricula}`, size: 24, font: 'Arial' })], alignment: AlignmentType.CENTER })
                        ]
                    }]
                });

                const blob = await Packer.toBlob(doc);
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Edital_${numeroEdital}.docx`;
                link.click();
                URL.revokeObjectURL(url);

                if (idx < lotes.length - 1) await new Promise(r => setTimeout(r, 400));
            }

            alert(`✅ ${lotes.length} edital(is) gerado(s) com sucesso!\n\nArquivos salvos como Edital_${String(numeroInicial).padStart(3,'0')}.docx até Edital_${String(numeroInicial + lotes.length - 1).padStart(3,'0')}.docx`);
        } catch (err) {
            console.error('Erro ao gerar editais:', err);
            alert('Erro ao gerar editais: ' + err.message);
        } finally {
            setGerando(false);
        }
    };

    const regimesDisponiveis = [
        { key: 'SIMPLES', label: 'Simples Nacional', cor: 'green' },
        { key: 'LUCRO PRESUMIDO', label: 'Lucro Presumido', cor: 'blue' },
        { key: 'LUCRO REAL', label: 'Lucro Real', cor: 'indigo' },
        { key: 'MEI', label: 'MEI', cor: 'yellow' },
        { key: 'AUTONOMO', label: 'Autônomo', cor: 'purple' },
        { key: 'BANCO', label: 'Banco', cor: 'gray' },
        { key: 'ISENTO', label: 'Isento', cor: 'red' }
    ];

    const corMap = {
        green: { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-800' },
        blue: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-800' },
        indigo: { bg: 'bg-indigo-50', border: 'border-indigo-400', text: 'text-indigo-800' },
        yellow: { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-800' },
        purple: { bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-800' },
        gray: { bg: 'bg-gray-50', border: 'border-gray-400', text: 'text-gray-800' },
        red: { bg: 'bg-red-50', border: 'border-red-400', text: 'text-red-800' }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <span className="text-4xl">📄</span>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Geração de Editais</h2>
                        <p className="text-gray-500 text-sm">Notificação de contribuintes – SAR/SMF</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-5">

                        {/* PERÍODO */}
                        <div className="bg-white rounded-xl shadow p-5">
                            <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2"><span>📅</span> Base de Dados</h3>
                            <div className="flex flex-wrap gap-3 items-center">
                                <select value={modoVisualizacao} onChange={e => setModoVisualizacao(e.target.value)} className="px-3 py-2 border rounded-lg bg-white">
                                    <option value="mensal">Mensal</option>
                                    <option value="anual">Anual Completo</option>
                                </select>
                                {modoVisualizacao === 'mensal' && (
                                    <select value={mes} onChange={e => setMes(Number(e.target.value))} className="px-3 py-2 border rounded-lg bg-white">
                                        {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                    </select>
                                )}
                                <select value={ano} onChange={e => setAno(Number(e.target.value))} className="px-3 py-2 border rounded-lg bg-white">
                                    {[2024, 2025, 2026, 2027, 2028].map(a => <option key={a} value={a}>{a}</option>)}
                                </select>
                                {carregando ? (
                                    <span className="flex items-center gap-2 text-blue-600 text-sm">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                        Carregando...
                                    </span>
                                ) : (
                                    <span className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200">
                                        {contribuintes.length} contribuintes carregados
                                    </span>
                                )}
                                {!carregando && duplicadosIgnorados > 0 && (
                                    <span className="px-3 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium border border-orange-200" title="Duplicatas (mesmo CNPJ/CPF) removidas automaticamente — só a menor inscrição de cada uma entra no edital">
                                        ⚠️ {duplicadosIgnorados} duplicidade(s) ignorada(s)
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* FILTROS */}
                        <div className="bg-white rounded-xl shadow p-5">
                            <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <span>🏷️</span> Regime de Tributação
                                <span className="ml-auto text-xs text-gray-400 font-normal">Selecione os regimes a incluir</span>
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {regimesDisponiveis.map(({ key, label, cor }) => {
                                    const c = corMap[cor];
                                    const ativo = filtroTributacao[key];
                                    const count = contribuintes.filter(x => x.tributacao === key).length;
                                    return (
                                        <label key={key} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-150 select-none ${ativo ? `${c.bg} ${c.border}` : 'bg-white border-gray-200 opacity-60'}`}>
                                            <input type="checkbox" checked={ativo} onChange={() => toggleFiltro(key)} className="w-4 h-4" />
                                            <div>
                                                <div className={`font-semibold text-sm ${ativo ? c.text : 'text-gray-500'}`}>{label}</div>
                                                <div className="text-xs text-gray-400">{count} contribuinte(s)</div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {/* CONFIGURAÇÕES */}
                        <div className="bg-white rounded-xl shadow p-5">
                            <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2"><span>⚙️</span> Configurações do Edital</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Máx. contribuintes por edital</label>
                                    <input type="number" min="1" max="500" value={limitePorEdital} onChange={e => setLimitePorEdital(Math.max(1, Number(e.target.value)))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-300 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Número inicial do edital</label>
                                    <input type="number" min="1" value={numeroInicial} onChange={e => setNumeroInicial(Math.max(1, Number(e.target.value)))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-300 outline-none" />
                                </div>
                            </div>
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-sm text-gray-500">
                                <strong className="text-gray-700">Regras de ordenação aplicadas:</strong>
                                <ol className="mt-2 space-y-1 list-decimal list-inside">
                                    <li>Filtrar por regime → ordenar por <strong>Inscrição Municipal (ASC)</strong> → dividir em lotes</li>
                                    <li>Dentro de cada edital → reordenar por <strong>Razão Social (A–Z)</strong></li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* PAINEL DIREITO */}
                    <div className="space-y-5">
                        {previa && (
                            <div className="bg-white rounded-xl shadow p-5">
                                <h3 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2"><span>📊</span> Prévia</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                                        <span className="text-sm text-blue-700 font-medium">Contribuintes selecionados</span>
                                        <span className="text-2xl font-bold text-blue-700">{previa.totalFiltrado}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                                        <span className="text-sm text-green-700 font-medium">Editais a gerar</span>
                                        <span className="text-2xl font-bold text-green-700">{previa.totalEditais}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                                        <span className="text-sm text-indigo-700 font-medium">Limite por edital</span>
                                        <span className="text-2xl font-bold text-indigo-700">{limitePorEdital}</span>
                                    </div>
                                </div>
                                {previa.totalEditais > 0 && (
                                    <div className="mt-4">
                                        <p className="text-xs text-gray-500 font-medium mb-2">Arquivos que serão gerados:</p>
                                        <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                                            {Array.from({ length: previa.totalEditais }, (_, i) => (
                                                <div key={i} className="text-xs bg-gray-50 border rounded px-2 py-1 font-mono text-gray-700">
                                                    📄 Edital_{String(numeroInicial + i).padStart(3, '0')}.docx
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={gerarEditais}
                            disabled={gerando || carregando || !previa || previa.totalFiltrado === 0}
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold text-lg rounded-xl shadow-lg hover:from-blue-700 hover:to-indigo-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                        >
                            {gerando ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                    Gerando...
                                </>
                            ) : (
                                <><span>📥</span> Gerar Edital(is)</>
                            )}
                        </button>

                        <div className="bg-white rounded-xl shadow p-4 text-xs text-gray-500 space-y-1">
                            <p className="font-semibold text-gray-700 mb-2">ℹ️ Formato dos arquivos</p>
                            <p>• Extensão: <strong>.docx</strong> (Word)</p>
                            <p>• Cabeçalho oficial SMF/SAR</p>
                            <p>• Tabela com 3 colunas: N°, Inscrição, Razão Social</p>
                            <p>• Ex: Edital_001.docx, Edital_002.docx...</p>
                            <p>• Texto legal conforme CTM (Art. 150, 305 e 357)</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
