class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('🚨 Erro capturado:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
                    <div className="bg-white rounded-lg shadow-2xl p-8 max-w-lg">
                        <div className="text-center mb-6">
                            <div className="text-7xl mb-4">⚠️</div>
                            <h1 className="text-3xl font-bold text-red-600 mb-3">Erro na Aplicação</h1>
                            <p className="text-gray-700 text-lg">Ocorreu um erro inesperado.</p>
                        </div>
                        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
                            <p className="text-sm text-red-900 font-mono break-all">
                                {this.state.error?.message || 'Erro desconhecido'}
                            </p>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-red-600 text-white px-6 py-4 rounded-lg hover:bg-red-700 font-bold text-lg shadow-lg"
                        >
                            🔄 Recarregar Página
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
function Login({ onLogin }) {
    const [u, setU] = useState('');
    const [p, setP] = useState('');
    const [e, setE] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (ev) => {
        ev.preventDefault();
        setLoading(true);
        setE('');

        try {
            await firebase.auth().signInWithEmailAndPassword(u, p);
            onLogin();
        } catch (error) {
            console.error('Erro de autenticação:', error);
            if (error.code === 'auth/user-not-found') setE('❌ Usuário não encontrado');
            else if (error.code === 'auth/wrong-password') setE('❌ Senha incorreta');
            else if (error.code === 'auth/invalid-email') setE('❌ Email inválido');
            else if (error.code === 'auth/too-many-requests') setE('❌ Muitas tentativas. Aguarde alguns minutos');
            else setE('❌ Erro ao fazer login. Verifique suas credenciais');
            setP('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700">
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
                    <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
                </div>
            </div>

            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full opacity-20 animate-float"></div>
                <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-white rounded-full opacity-30 animate-float animation-delay-1000"></div>
                <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-white rounded-full opacity-25 animate-float animation-delay-2000"></div>
                <div className="absolute top-2/3 right-1/3 w-2 h-2 bg-white rounded-full opacity-20 animate-float animation-delay-3000"></div>
            </div>

            <div className="relative z-10 w-full max-w-md">
                <div className="backdrop-blur-xl bg-white/90 rounded-3xl shadow-2xl p-10 border border-white/20 transform transition-all duration-300 hover:scale-[1.02]">
                    <div className="text-center mb-8">
                        <div className="relative inline-block mb-6">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-lg opacity-50 animate-pulse"></div>
                            <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 w-24 h-24 rounded-full flex items-center justify-center shadow-lg transform transition-transform duration-300 hover:rotate-12">
                                <span className="text-5xl animate-bounce-slow">💻</span>
                            </div>
                        </div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                            PAWG – Portal de Administração e Workflow de Guias
                        </h1>
                        <p className="text-gray-600 font-medium">Controle Geral e Gestão</p>
                        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span>Sistema Online</span>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <span className="text-lg">📧</span> Email
                            </label>
                            <input
                                type="email"
                                value={u}
                                onChange={(ev) => setU(ev.target.value)}
                                placeholder="seu.email@exemplo.com"
                                className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 outline-none disabled:opacity-50 disabled:cursor-not-allowed group-hover:border-indigo-300"
                                required
                                disabled={loading}
                            />
                        </div>

                        <div className="group">
                            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                <span className="text-lg">🔑</span> Senha
                            </label>
                            <input
                                type="password"
                                value={p}
                                onChange={(ev) => setP(ev.target.value)}
                                placeholder="••••••••"
                                className="w-full px-5 py-4 bg-white border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 outline-none disabled:opacity-50 disabled:cursor-not-allowed group-hover:border-indigo-300"
                                required
                                disabled={loading}
                            />
                        </div>

                        {e && (
                            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-xl text-sm font-medium flex items-center gap-3 animate-shake">
                                <span className="text-xl">⚠️</span> <span>{e}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Autenticando...</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-2xl">🔓</span>
                                    <span>Entrar no Sistema</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                            <span className="text-lg">🔒</span>
                            <span className="font-medium">Protegido por Firebase Authentication</span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-white text-sm font-medium drop-shadow-lg flex items-center justify-center gap-2">
                        <span className="text-base">💻</span>
                        <span>Desenvolvido por Elvis Ferreira</span>
                    </p>
                </div>
            </div>

            <style>{`
                @keyframes blob { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } }
                @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
                @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
                .animate-blob { animation: blob 7s infinite; }
                .animate-float { animation: float 3s ease-in-out infinite; }
                .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
                .animate-shake { animation: shake 0.3s ease-in-out; }
                .animation-delay-1000 { animation-delay: 1s; }
                .animation-delay-2000 { animation-delay: 2s; }
                .animation-delay-3000 { animation-delay: 3s; }
                .animation-delay-4000 { animation-delay: 4s; }
            `}</style>
        </div>
    );
}
