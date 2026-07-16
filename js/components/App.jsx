// 🚩 Ícone de bandeira via SVG (não emoji) — o app converte emojis em imagens fixas via
// Twemoji, o que ignoraria qualquer cor CSS aplicada. SVG com fill-current respeita a cor.
function BandeiraVisaIcone({ className }) {
    return (
        <svg viewBox="0 0 16 16" className={`w-4 h-4 inline-block fill-current ${className || ''}`} xmlns="http://www.w3.org/2000/svg">
            <path d="M14.778.085A.5.5 0 0 1 15 .5V8a.5.5 0 0 1-.314.464L14.5 8l.186.464-.003.001-.006.003-.023.009a12.435 12.435 0 0 1-.397.15c-.264.095-.631.223-1.047.35-.816.252-1.879.523-2.71.523-.847 0-1.548-.28-2.158-.525l-.028-.01C7.68 8.71 7.14 8.5 6.5 8.5c-.7 0-1.638.23-2.437.477A19.626 19.626 0 0 0 3 9.342V15.5a.5.5 0 0 1-1 0V.5a.5.5 0 0 1 1 0v.282c.226-.079.496-.17.79-.26C4.606.272 5.67 0 6.5 0c.84 0 1.524.277 2.121.519l.043.018C9.286.788 9.828 1 10.5 1c.7 0 1.638-.23 2.437-.477a19.587 19.587 0 0 0 1.349-.476l.019-.007.004-.002h.002z"/>
        </svg>
    );
}

function App() {
    const [auth, setAuth] = useState(false);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('doc');
    const [valorUfica, setValorUfica] = useState({ 2026: 179.50, 2027: 0, 2028: 0, 2029: 0, 2030: 0 });
    const [recadosNaoLidos, setRecadosNaoLidos] = useState(0);
    const [mostrarLegendas, setMostrarLegendas] = useState(false);
    const [mostrarManual, setMostrarManual] = useState(false);

    // 📖 Rola até uma seção do Manual (o painel do modal tem overflow próprio,
    // por isso usamos scrollIntoView num contêiner com id em vez de #hash na URL)
    const irParaSecaoManual = (id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    useEffect(() => {
        const ref = db.ref('recados');
        const handler = ref.on('value', snap => {
            if (!snap.exists()) { setRecadosNaoLidos(0); return; }
            let naoLidos = 0;
            snap.forEach(child => { if (!child.val().lido) naoLidos++; });
            setRecadosNaoLidos(naoLidos);
        });
        return () => ref.off('value', handler);
    }, []);

    useEffect(() => {
        const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
            setAuth(!!user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        try {
            await firebase.auth().signOut();
            setAuth(false);
        } catch (error) {
            console.error('Erro ao sair:', error);
            alert('Erro ao fazer logout');
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-700">
            <div className="text-center">
                <div className="animate-spin h-16 w-16 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-white text-lg">Carregando...</p>
            </div>
        </div>
    );

    if (!auth) return <Login onLogin={() => setAuth(true)} />;

    return (
        <div>
            <nav className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg">
                <div className="max-w-[1800px] mx-auto px-4 h-16 flex items-center justify-between">
                    <h1 className="text-white font-bold text-xl">💻 PAWG – Portal de Administração e Workflow de Guias</h1>
                    <div className="flex gap-4">
                        <button onClick={() => setTab('doc')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'doc' ? 'bg-white text-blue-600' : 'text-white hover:bg-blue-500'}`}>📋 Documentos</button>
                        <button onClick={() => setTab('tax')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'tax' ? 'bg-white text-blue-600' : 'text-white hover:bg-blue-500'}`}>👽 Contribuintes</button>
                        <button onClick={() => setTab('editais')} className={`px-4 py-2 rounded-lg font-medium ${tab === 'editais' ? 'bg-white text-blue-600' : 'text-white hover:bg-blue-500'}`}>📄 Editais</button>
                        <button onClick={() => setTab('recados')} className={`relative px-4 py-2 rounded-lg font-medium ${tab === 'recados' ? 'bg-white text-blue-600' : 'text-white hover:bg-blue-500'}`}>
                            ✉️ Recados
                            {recadosNaoLidos > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{recadosNaoLidos}</span>}
                        </button>
                        <button onClick={() => setMostrarManual(true)} className="px-4 py-2 rounded-lg font-medium text-white hover:bg-blue-500">📖 Manual</button>
                        <button onClick={() => setMostrarLegendas(true)} className="px-4 py-2 rounded-lg font-medium text-white hover:bg-blue-500">🎨 Legendas</button>
                        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-medium">🚪 Sair</button>
                    </div>
                </div>
            </nav>
            {mostrarLegendas && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setMostrarLegendas(false)}>
                    <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-gray-800 mb-4">🎨 Legenda de Cores</h3>

                        <p className="text-sm font-semibold text-gray-600 mb-2">Marcador de prioridade (bolinha "Cor")</p>
                        <ul className="space-y-1 mb-4 text-sm">
                            <li className="flex items-center gap-2"><span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: 'red' }}></span> <b>Vermelho</b> — Urgente / pendência crítica</li>
                            <li className="flex items-center gap-2"><span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: 'orange' }}></span> <b>Laranja</b> — Atenção / revisar em breve</li>
                            <li className="flex items-center gap-2"><span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: 'gold' }}></span> <b>Amarelo</b> — Aguardando retorno (contador/contribuinte)</li>
                            <li className="flex items-center gap-2"><span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: 'dodgerblue' }}></span> <b>Azul</b> — Em análise / em andamento</li>
                            <li className="flex items-center gap-2"><span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: 'purple' }}></span> <b>Roxo</b> — Caso especial / observação particular</li>
                            <li className="flex items-center gap-2"><span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: 'green' }}></span> <b>Verde</b> — Regularizado / concluído</li>
                        </ul>

                        <p className="text-sm font-semibold text-gray-600 mb-2">Bandeira VISA (nível de risco do CNAE — Res. SES-RJ 2191/20)</p>
                        <ul className="space-y-1 mb-4 text-sm">
                            <li className="flex items-center gap-2"><BandeiraVisaIcone className="text-red-600" /> <b>Vermelha</b> — Alto risco</li>
                            <li className="flex items-center gap-2"><BandeiraVisaIcone className="text-yellow-500" /> <b>Amarela</b> — Médio risco</li>
                            <li className="flex items-center gap-2"><BandeiraVisaIcone className="text-green-600" /> <b>Verde</b> — Baixo risco</li>
                            <li className="flex items-center gap-2"><BandeiraVisaIcone className="text-blue-500" /> <b>Azul</b> — Marcado manualmente (risco não calculado)</li>
                            <li className="flex items-center gap-2"><BandeiraVisaIcone className="text-gray-300" /> <b>Cinza</b> — Não requer VISA (clique para marcar)</li>
                        </ul>

                        <p className="text-sm font-semibold text-gray-600 mb-2">Situação cadastral</p>
                        <ul className="space-y-1 mb-2 text-sm">
                            <li><span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-800 border border-green-300">Ativa</span> — situação regular</li>
                            <li><span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-300">Suspensa</span> — pendência temporária</li>
                            <li><span className="px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-300">Inapta</span> — pendência de declaração</li>
                            <li><span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-300">Baixada</span> — encerrada na Receita</li>
                            <li><span className="px-2 py-1 rounded text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">Nula</span> — cadastro inválido</li>
                        </ul>

                        <button onClick={() => setMostrarLegendas(false)} className="w-full mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Fechar</button>
                    </div>
                </div>
            )}
            {mostrarManual && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setMostrarManual(false)}>
                    <div className="bg-white rounded-lg max-w-3xl w-full shadow-2xl max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 pb-4 border-b">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">📖 Manual do Sistema</h3>
                                    <p className="text-sm text-gray-500 mt-1">O que cada tela e cada botão do PAWG faz</p>
                                </div>
                                <button onClick={() => setMostrarManual(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-4">
                                {[
                                    ['manual-doc', '📋 Documentos'],
                                    ['manual-tax', '👽 Contribuintes'],
                                    ['manual-editais', '📄 Editais'],
                                    ['manual-recados', '✉️ Recados'],
                                    ['manual-legendas-ref', '🎨 Legendas'],
                                ].map(([id, label]) => (
                                    <button key={id} onClick={() => irParaSecaoManual(id)} className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full font-medium">
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto text-sm text-gray-700 space-y-8">

                            {/* ===================== DOCUMENTOS ===================== */}
                            <section id="manual-doc">
                                <h4 className="text-lg font-bold text-gray-800 mb-2">📋 Documentos — Controle de Numeração</h4>
                                <p className="mb-2">Controla a numeração sequencial de <b>Editais, Ofícios e Memorandos</b> emitidos pela SAR, no formato <code className="bg-gray-100 px-1 rounded">0001/2026</code>. A numeração de cada tipo é automática: o sistema conta quantos documentos daquele tipo já existem no ano e sugere o próximo número.</p>
                                <ul className="list-disc list-inside space-y-1 mb-2">
                                    <li><b>➕ Novo Documento:</b> escolha o tipo, a data, o setor de origem (obrigatório) e destino, e uma observação livre.</li>
                                    <li><b>Filtros:</b> por tipo de documento, por setor (busca em origem e destino) e por intervalo de datas.</li>
                                    <li><b>Cards de resumo:</b> total filtrado e, para cada tipo, quantos existem e qual é o próximo número disponível.</li>
                                    <li><b>✏️ / 🗑️:</b> editar ou excluir um documento diretamente na tabela.</li>
                                    <li><b>Exportar CSV:</b> baixa a lista filtrada em planilha.</li>
                                </ul>
                            </section>

                            {/* ===================== CONTRIBUINTES ===================== */}
                            <section id="manual-tax">
                                <h4 className="text-lg font-bold text-gray-800 mb-2">👽 Contribuintes — Lançamento de Taxas</h4>
                                <p className="mb-2">Tela principal do sistema: controla os contribuintes de um mês/ano, consulta os CNPJs na Receita Federal, calcula TFLF/ISSQN/VISA e organiza tudo em abas.</p>

                                <p className="font-semibold text-gray-700 mt-3 mb-1">Modo de visualização e período</p>
                                <ul className="list-disc list-inside space-y-1 mb-2">
                                    <li><b>Mensal:</b> mostra só o mês/ano selecionados (é o modo com atualização em tempo real).</li>
                                    <li><b>Anual:</b> junta os 12 meses do ano em uma lista só.</li>
                                    <li><b>Período:</b> junta um intervalo de meses (Início/Fim) do ano.</li>
                                    <li><b>Valor da UFICA:</b> editável por ano — é o valor usado pra converter o ISSQN calculado em UFICAs para reais.</li>
                                </ul>

                                <p className="font-semibold text-gray-700 mt-3 mb-1">Cards e abas</p>
                                <ul className="list-disc list-inside space-y-1 mb-2">
                                    <li><b>Total / Pendentes / Verificados / Duplicados / Total TFLF / Total ISSQN / Vigilância (VISA):</b> resumo do mês. O card "Pendentes" é clicável e filtra a lista pra mostrar só quem falta consultar.</li>
                                    <li><b>Abas Principal / MEI / Autônomo / Isento / VISA:</b> filtram pela tributação (ou por precisar de VISA). A aba Principal exclui MEI, Autônomo e Isento.</li>
                                    <li><b>Aba Duplicidade:</b> mostra CNPJs que aparecem mais de uma vez na base; a inscrição de menor número fica na aba original, as demais (as "duplicatas") ficam só aqui.</li>
                                    <li><b>Aba Faltas:</b> vazia até você rodar "Consultar Faltas" (veja abaixo).</li>
                                </ul>

                                <p className="font-semibold text-gray-700 mt-3 mb-1">Barra de ações</p>
                                <ul className="list-disc list-inside space-y-1 mb-2">
                                    <li><b>➕ Inserir:</b> adiciona um contribuinte manualmente (Inscrição, Documento, Nome).</li>
                                    <li><b>📁 Importar TXT:</b> importa várias linhas de uma vez (colunas separadas por Tab: Inscrição, Documento, Nome). Ignora quem já existe (por documento ou inscrição) e classifica CPF automaticamente como Autônomo.</li>
                                    <li><b>🕵️ Consultar CNPJs:</b> consulta na Receita (via open.cnpja.com) todos os CNPJs do mês ainda não verificados, um de cada vez (limite de 5 consultas/minuto — por isso o delay de ~12s entre cada).</li>
                                    <li><b>Consultar Faltas:</b> você informa um intervalo de números de inscrição municipal e o sistema mostra quais números <i>não existem</i> no mês atual — e avisa se aquela inscrição já existe em outro mês do ano, pra facilitar conferência.</li>
                                    <li><b>⚙️ Reprocessar:</b> reconsulta contribuintes já verificados na Receita, deixando você escolher o que atualizar: Porte, Tributação e/ou VISA (o endereço é salvo automaticamente quando a empresa precisa de VISA).</li>
                                    <li><b>Exportar CSV / 📑 Relatório PDF:</b> exporta a lista atual; o relatório em PDF é agrupado por auditor, com subtotais de TFLF/ISSQN/VISA e total geral.</li>
                                    <li><b>💾 Backup / 📥 Restaurar:</b> baixa um arquivo JSON com os dados do mês, ou restaura a partir de um arquivo salvo antes.</li>
                                    <li><b>🧹 Desmarcar Todas:</b> remove a marcação de cor/linha (veja "Cor" abaixo) de todos os contribuintes visíveis na lista, de uma vez.</li>
                                    <li><b>🔍 Busca rápida:</b> pesquisa por CNPJ/CPF, inscrição ou nome em <i>todos os 12 meses do ano</i> (não só no mês selecionado) — útil pra achar uma empresa sem saber em qual mês ela está.</li>
                                </ul>

                                <p className="font-semibold text-gray-700 mt-3 mb-1">Colunas da tabela</p>
                                <ul className="list-disc list-inside space-y-1 mb-2">
                                    <li><b>Status:</b> ícone rápido — 🔄 consultando, ⚠️ duplicado, 🚨 falha na consulta/dados incompletos (revisar manualmente), ✅ verificado, ☑️ editado manualmente, 🕘 pendente.</li>
                                    <li><b>Cor:</b> clique na bolinha pra abrir a paleta — 6 cores de prioridade, a opção "—" (Linha, risca o texto da linha inteira) e "✕" pra limpar. Veja o significado de cada cor em <button type="button" onClick={() => { setMostrarManual(false); setMostrarLegendas(true); }} className="text-blue-600 underline">🎨 Legendas</button>.</li>
                                    <li><b>Identificação do Contribuinte:</b> segure <b>CTRL</b> e passe o mouse sobre o nome pra ver o endereço salvo (quando a empresa precisa de VISA — é só nesse caso que o endereço é guardado).</li>
                                    <li><b>Situação:</b> situação cadastral trazida da Receita (Ativa, Suspensa, Inapta, Baixada, Nula).</li>
                                    <li><b>Porte / Tributação:</b> editáveis a qualquer momento; a consulta de CNPJ também os preenche.</li>
                                    <li><b>VISA?:</b> bandeira colorida pelo nível de risco do CNAE (vermelho=alto, amarelo=médio, verde=baixo, azul=marcado manualmente sem risco calculado). Clique na bandeira liga/desliga manualmente.</li>
                                    <li><b>Área m²:</b> área do estabelecimento — entra no cálculo do valor de VISA.</li>
                                    <li><b>N° OS, Auditor, Trimestre, Nível (ISSQN):</b> campos de controle operacional; Trimestre e Nível só se aplicam a autônomos (CPF).</li>
                                    <li><b>TFLF, ISSQN, VISA R$:</b> valores calculados automaticamente a partir da tributação, porte, nível e área.</li>
                                    <li><b>Finalizado:</b> SIM/NÃO — controle de que a guia daquele contribuinte já foi lançada/finalizada.</li>
                                    <li><b>Ações:</b> 🗑️ excluir, 📘 observação (nota interna sobre o contribuinte), 🔍/🔄 consultar (ou reprocessar, se já verificado) individualmente.</li>
                                </ul>
                            </section>

                            {/* ===================== EDITAIS ===================== */}
                            <section id="manual-editais">
                                <h4 className="text-lg font-bold text-gray-800 mb-2">📄 Editais</h4>
                                <p className="mb-2">Gera os editais de notificação de contribuintes em <b>.docx</b> (Word), prontos pra publicar.</p>
                                <ul className="list-disc list-inside space-y-1 mb-2">
                                    <li><b>Base de dados:</b> escolha um mês específico ou o ano completo.</li>
                                    <li><b>Regime de tributação:</b> marque quais regimes entram (Simples, Lucro Presumido, Lucro Real, MEI, Autônomo, Banco, Isento) — cada opção mostra quantos contribuintes tem naquele regime.</li>
                                    <li><b>Configurações:</b> quantidade máxima de contribuintes por edital (o sistema divide em vários arquivos automaticamente) e o número inicial do edital.</li>
                                    <li><b>Ordenação:</b> primeiro filtra por regime e ordena por Inscrição Municipal pra dividir em lotes; dentro de cada lote, reordena por Razão Social (A–Z).</li>
                                    <li><b>Prévia:</b> mostra quantos contribuintes entraram, quantos editais serão gerados e o nome de cada arquivo antes de gerar.</li>
                                    <li><b>Gerar Edital(is):</b> baixa um .docx por lote (Edital_001.docx, Edital_002.docx...), com o texto legal do CTM (Art. 150, 305 e 357) e tabela de contribuintes.</li>
                                </ul>
                            </section>

                            {/* ===================== RECADOS ===================== */}
                            <section id="manual-recados">
                                <h4 className="text-lg font-bold text-gray-800 mb-2">✉️ Recados</h4>
                                <p className="mb-2">Mural de comunicados internos entre a equipe — não é um chat, é um registro do que foi combinado/avisado.</p>
                                <ul className="list-disc list-inside space-y-1 mb-2">
                                    <li><b>Novo Recado:</b> quem envia, quem recebe, data e a mensagem.</li>
                                    <li><b>✅ Lido / ↩️ Reabrir:</b> marca ou desmarca um recado como lido. O menu superior mostra um contador de recados não lidos.</li>
                                    <li><b>Filtros:</b> Todos / Não lidos / Lidos.</li>
                                    <li><b>🗑️ Excluir:</b> remove o recado.</li>
                                </ul>
                            </section>

                            {/* ===================== LEGENDAS (referência cruzada) ===================== */}
                            <section id="manual-legendas-ref">
                                <h4 className="text-lg font-bold text-gray-800 mb-2">🎨 Legendas</h4>
                                <p className="mb-2">Não é uma aba de trabalho — é só um guia rápido do significado de cada cor usada no sistema (marcador de prioridade, bandeira VISA e situação cadastral). Fica no menu superior, ao lado deste Manual.</p>
                                <button
                                    type="button"
                                    onClick={() => { setMostrarManual(false); setMostrarLegendas(true); }}
                                    className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium"
                                >
                                    Abrir Legendas →
                                </button>
                            </section>
                        </div>

                        <div className="p-4 border-t">
                            <button onClick={() => setMostrarManual(false)} className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">Fechar</button>
                        </div>
                    </div>
                </div>
            )}
            {tab === 'doc' ? <Docs /> : tab === 'tax' ? <Taxas valorUfica={valorUfica} setValorUfica={setValorUfica} /> : tab === 'editais' ? <Editais /> : <Recados />}
            <footer className="bg-white border-t mt-8">
                <div className="max-w-[1800px] mx-auto px-4 py-6 text-center">
                    <p className="text-gray-700 font-semibold mb-2">💻 Desenvolvido por <span className="text-blue-600">Elvis Ferreira</span></p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-gray-600">
                        <a href="mailto:elvis.fdj@aol.com" className="hover:text-blue-600">📧 elvis.fdj@aol.com</a>
                        <span className="hidden sm:inline">•</span>
                        <a href="tel:+5522981382619" className="hover:text-blue-600">📱 (22) 98138-2619</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
