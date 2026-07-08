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
