function Recados() {
    const { useState, useEffect } = React;
    const [recados, setRecados] = useState([]);
    const [form, setForm] = useState({ autor: '', destinatario: '', texto: '', data: new Date().toISOString().split('T')[0] });
    const [salvando, setSalvando] = useState(false);
    const [filtro, setFiltro] = useState('todos');
    const [expandido, setExpandido] = useState(null);

    useEffect(() => {
        const ref = db.ref('recados');
        const handler = ref.orderByChild('criadoEm').on('value', snap => {
            if (!snap.exists()) { setRecados([]); return; }
            const lista = [];
            snap.forEach(child => lista.push({ id: child.key, ...child.val() }));
            setRecados(lista.reverse());
        });
        return () => ref.off('value', handler);
    }, []);

    const salvar = async () => {
        if (!form.autor.trim() || !form.destinatario.trim() || !form.texto.trim() || !form.data) {
            alert('Preencha todos os campos.'); return;
        }
        setSalvando(true);
        try {
            await db.ref('recados').push({ ...form, lido: false, criadoEm: Date.now() });
            setForm({ autor: '', destinatario: '', texto: '', data: new Date().toISOString().split('T')[0] });
        } catch (e) {
            alert('Erro ao salvar: ' + e.message);
        } finally {
            setSalvando(false);
        }
    };

    const marcarLido = async (id, lido) => {
        await db.ref('recados/' + id).update({ lido: !lido });
    };

    const excluir = async (id) => {
        if (!confirm('Excluir este recado?')) return;
        await db.ref('recados/' + id).remove();
    };

    const formatarData = (str) => {
        if (!str) return '';
        const [y, m, d] = str.split('-');
        return `${d}/${m}/${y}`;
    };

    const naoLidos = recados.filter(r => !r.lido).length;
    const filtrados = recados.filter(r => {
        if (filtro === 'nao_lido') return !r.lido;
        if (filtro === 'lido') return r.lido;
        return true;
    });

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">✉️</span>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Recados</h2>
                    <p className="text-sm text-gray-500">Registro de comunicados internos</p>
                </div>
                {naoLidos > 0 && (
                    <span className="ml-auto bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
                        {naoLidos} não {naoLidos === 1 ? 'lido' : 'lidos'}
                    </span>
                )}
            </div>

            {/* FORMULÁRIO */}
            <div className="bg-white rounded-xl shadow p-5 mb-6 border border-blue-100">
                <h3 className="font-semibold text-gray-700 mb-4">✏️ Novo Recado</h3>
                <div className="grid grid-cols-3 gap-3 mb-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">De (Autor)</label>
                        <input value={form.autor} onChange={e => setForm(f => ({ ...f, autor: e.target.value }))} placeholder="Quem envia" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Para (Destinatário)</label>
                        <input value={form.destinatario} onChange={e => setForm(f => ({ ...f, destinatario: e.target.value }))} placeholder="Quem recebe" className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
                        <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                </div>
                <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mensagem</label>
                    <textarea value={form.texto} onChange={e => setForm(f => ({ ...f, texto: e.target.value }))} placeholder="O que foi dito / combinado / comunicado..." rows={3} className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
                </div>
                <div className="flex justify-end">
                    <button onClick={salvar} disabled={salvando} className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50">
                        {salvando ? '💾 Salvando...' : '💾 Salvar Recado'}
                    </button>
                </div>
            </div>

            {/* FILTROS */}
            <div className="flex gap-2 mb-4">
                {[['todos', '📋 Todos', recados.length], ['nao_lido', '🔴 Não lidos', naoLidos], ['lido', '✅ Lidos', recados.length - naoLidos]].map(([val, label, count]) => (
                    <button key={val} onClick={() => setFiltro(val)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filtro === val ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
                        {label} ({count})
                    </button>
                ))}
            </div>

            {/* LISTA */}
            {filtrados.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <div className="text-5xl mb-3">✉️</div>
                    <p className="text-lg">Nenhum recado encontrado.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtrados.map(r => (
                        <div key={r.id} className={`bg-white rounded-xl shadow-sm border-l-4 p-4 transition ${r.lido ? 'border-green-400 opacity-75' : 'border-blue-500'}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">De: {r.autor}</span>
                                        <span className="text-xs text-gray-400">→</span>
                                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Para: {r.destinatario}</span>
                                        <span className="text-xs text-gray-400 ml-auto">📅 {formatarData(r.data)}</span>
                                        {!r.lido && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Novo</span>}
                                    </div>
                                    <p className="text-sm text-gray-700" style={expandido !== r.id && r.texto.length > 180 ? { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}}>
                                        {r.texto}
                                    </p>
                                    {r.texto.length > 180 && (
                                        <button onClick={() => setExpandido(expandido === r.id ? null : r.id)} className="text-xs text-blue-500 hover:text-blue-700 mt-1">
                                            {expandido === r.id ? '▲ Ver menos' : '▼ Ver mais'}
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1.5 shrink-0">
                                    <button onClick={() => marcarLido(r.id, r.lido)} className={`px-3 py-1 rounded-lg text-xs font-medium transition ${r.lido ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                                        {r.lido ? '↩️ Reabrir' : '✅ Lido'}
                                    </button>
                                    <button onClick={() => excluir(r.id)} className="px-3 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 transition">
                                        🗑️ Excluir
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
