function App() {
    const [auth, setAuth] = useState(false);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('doc');
    const [valorUfica, setValorUfica] = useState({ 2026: 179.50, 2027: 0, 2028: 0, 2029: 0, 2030: 0 });
    const [recadosNaoLidos, setRecadosNaoLidos] = useState(0);

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
                        <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 font-medium">🚪 Sair</button>
                    </div>
                </div>
            </nav>
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
