function Docs() {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editando, setEditando] = useState(null);
    const [filtros, setFiltros] = useState({ tipo: 'TODOS', setor: '', dataInicio: '', dataFim: '' });
    const [form, setForm] = useState({ tipo: 'EDITAL', data: new Date().toISOString().split('T')[0], setorOrigem: 'Subsecretaria Adjunta de Receita', setorDestino: '', obs: '' });
    const [mostrarForm, setMostrarForm] = useState(false);
    const year = new Date().getFullYear();

    useEffect(() => {
        const ref = db.ref('documentos/' + year);
        ref.on('value', (snap) => {
            const data = snap.val();
            setDocs(data ? Object.entries(data).map(([k, v]) => ({ id: k, ...v })) : []);
            setLoading(false);
        });
        return () => ref.off();
    }, []);

    const add = async () => {
        if (!form.setorOrigem.trim()) return alert('Preencha o Setor de Origem');
        const num = docs.filter(d => d.tipo === form.tipo).length + 1;
        await db.ref('documentos/' + year).push({ ...form, numero: `${String(num).padStart(4, '0')}/${year}`, criadoEm: Date.now(), criadoPor: 'SAR' });
        setForm({ tipo: 'EDITAL', data: new Date().toISOString().split('T')[0], setorOrigem: 'Subsecretaria Adjunta de Receita', setorDestino: '', obs: '' });
        setMostrarForm(false);
        alert('✅ Documento adicionado!');
    };

    const update = async (id) => {
        await db.ref('documentos/' + year + '/' + id).update({ ...editando, editadoEm: Date.now(), editadoPor: 'SAR' });
        setEditando(null);
        alert('✅ Documento atualizado!');
    };

    const del = async (id) => {
        if (confirm('Excluir documento?')) {
            await db.ref('documentos/' + year + '/' + id).remove();
        }
    };

    const formatDate = (dateStr) => {
        const [y, m, d] = dateStr.split('-');
        return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
    };

    const exportCSV = () => {
        const headers = ['Tipo', 'Número', 'Data', 'Setor Origem', 'Setor Destino', 'Observação'];
        const rows = docsFiltrados.map(d => [d.tipo, d.numero, formatDate(d.data), d.setorOrigem, d.setorDestino || '', d.obs || '']);
        const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `documentos_${year}.csv`;
        link.click();
    };

    const docsFiltrados = docs.filter(d => {
        const tipoOk = filtros.tipo === 'TODOS' || d.tipo === filtros.tipo;
        const setorOk = !filtros.setor || d.setorOrigem.toLowerCase().includes(filtros.setor.toLowerCase()) || (d.setorDestino && d.setorDestino.toLowerCase().includes(filtros.setor.toLowerCase()));
        const dataOk = (!filtros.dataInicio || d.data >= filtros.dataInicio) && (!filtros.dataFim || d.data <= filtros.dataFim);
        return tipoOk && setorOk && dataOk;
    });

    const stats = {
        total: docsFiltrados.length,
        EDITAL: docsFiltrados.filter(d => d.tipo === 'EDITAL').length,
        OFICIO: docsFiltrados.filter(d => d.tipo === 'OFICIO').length,
        MEMORANDO: docsFiltrados.filter(d => d.tipo === 'MEMORANDO').length,
        proximoEdital: String(docs.filter(d => d.tipo === 'EDITAL').length + 1).padStart(4, '0') + '/' + year,
        proximoOficio: String(docs.filter(d => d.tipo === 'OFICIO').length + 1).padStart(4, '0') + '/' + year,
        proximoMemorando: String(docs.filter(d => d.tipo === 'MEMORANDO').length + 1).padStart(4, '0') + '/' + year
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-16 w-16 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-[1800px] mx-auto">
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">📝 Controle de Numeração - {year}</h2>
                        <button onClick={exportCSV} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">Exportar CSV</button>
                    </div>

                    <div className="grid md:grid-cols-4 gap-4 mb-6">
                        <select value={filtros.tipo} onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })} className="px-3 py-2 border rounded-lg">
                            <option value="TODOS">Todos os Tipos</option>
                            <option value="EDITAL">EDITAL</option>
                            <option value="OFICIO">OFÍCIO</option>
                            <option value="MEMORANDO">MEMORANDO</option>
                        </select>
                        <input type="text" value={filtros.setor} onChange={(e) => setFiltros({ ...filtros, setor: e.target.value })} placeholder="Buscar por setor..." className="px-3 py-2 border rounded-lg" />
                        <input type="date" value={filtros.dataInicio} onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })} className="px-3 py-2 border rounded-lg" />
                        <input type="date" value={filtros.dataFim} onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })} className="px-3 py-2 border rounded-lg" />
                    </div>

                    <div className="grid md:grid-cols-4 gap-4">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                            <div className="text-sm text-blue-600 font-medium">Total</div>
                            <div className="text-3xl font-bold text-blue-700">{stats.total}</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <div className="text-sm text-gray-600 mb-1">EDITAL</div>
                            <div className="text-3xl font-bold text-green-600">{stats.EDITAL}</div>
                            <div className="text-xs text-green-600 mt-1 font-medium">Próximo: {stats.proximoEdital}</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <div className="text-sm text-gray-600 mb-1">OFÍCIO</div>
                            <div className="text-3xl font-bold text-purple-600">{stats.OFICIO}</div>
                            <div className="text-xs text-purple-600 mt-1 font-medium">Próximo: {stats.proximoOficio}</div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                            <div className="text-sm text-gray-600 mb-1">MEMORANDO</div>
                            <div className="text-3xl font-bold text-orange-600">{stats.MEMORANDO}</div>
                            <div className="text-xs text-orange-600 mt-1 font-medium">Próximo: {stats.proximoMemorando}</div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                    <h3 className="text-xl font-bold mb-4">➕ Novo Documento</h3>
                    <div className="grid md:grid-cols-3 gap-4">
                        <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="px-3 py-2 border rounded-lg">
                            <option>EDITAL</option>
                            <option>OFICIO</option>
                            <option>MEMORANDO</option>
                        </select>
                        <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="px-3 py-2 border rounded-lg" />
                        <input type="text" value={form.setorOrigem} onChange={(e) => setForm({ ...form, setorOrigem: e.target.value })} placeholder="Setor Origem *" className="px-3 py-2 border rounded-lg" />
                        <input type="text" value={form.setorDestino} onChange={(e) => setForm({ ...form, setorDestino: e.target.value })} placeholder="Setor Destino" className="px-3 py-2 border rounded-lg" />
                        <input type="text" value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} placeholder="Observação" className="px-3 py-2 border rounded-lg md:col-span-2" />
                    </div>
                    <button onClick={add} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">➕ Adicionar</button>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                                <tr>
                                    <th className="px-4 py-3 text-left">Tipo</th>
                                    <th className="px-4 py-3 text-left">Número</th>
                                    <th className="px-4 py-3 text-left">Data</th>
                                    <th className="px-4 py-3 text-left">Origem</th>
                                    <th className="px-4 py-3 text-left">Destino</th>
                                    <th className="px-4 py-3 text-left">Observação</th>
                                    <th className="px-4 py-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {docsFiltrados.length === 0 ? (
                                    <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-500">Nenhum documento encontrado</td></tr>
                                ) : (
                                    docsFiltrados.slice().reverse().map((d, i) => (
                                        <tr key={d.id} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                            {editando?.id === d.id ? (
                                                <>
                                                    <td className="px-4 py-3"><select value={editando.tipo} onChange={(e) => setEditando({ ...editando, tipo: e.target.value })} className="px-2 py-1 border rounded w-full"><option>EDITAL</option><option>OFICIO</option><option>MEMORANDO</option></select></td>
                                                    <td className="px-4 py-3 font-mono">{d.numero}</td>
                                                    <td className="px-4 py-3"><input type="date" value={editando.data} onChange={(e) => setEditando({ ...editando, data: e.target.value })} className="px-2 py-1 border rounded w-full" /></td>
                                                    <td className="px-4 py-3"><input type="text" value={editando.setorOrigem} onChange={(e) => setEditando({ ...editando, setorOrigem: e.target.value })} className="px-2 py-1 border rounded w-full" /></td>
                                                    <td className="px-4 py-3"><input type="text" value={editando.setorDestino || ''} onChange={(e) => setEditando({ ...editando, setorDestino: e.target.value })} className="px-2 py-1 border rounded w-full" /></td>
                                                    <td className="px-4 py-3"><input type="text" value={editando.obs || ''} onChange={(e) => setEditando({ ...editando, obs: e.target.value })} className="px-2 py-1 border rounded w-full" /></td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button onClick={() => update(d.id)} className="text-green-600 hover:text-green-800 mr-2 text-xl">✓</button>
                                                        <button onClick={() => setEditando(null)} className="text-gray-600 hover:text-gray-800 text-xl">✗</button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                            d.tipo === 'EDITAL' ? 'bg-green-50 text-green-700 border border-green-200' :
                                                            d.tipo === 'OFICIO' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                                                            'bg-orange-50 text-orange-700 border border-orange-200'
                                                        }`}>
                                                            {d.tipo}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono">{d.numero}</td>
                                                    <td className="px-4 py-3">{formatDate(d.data)}</td>
                                                    <td className="px-4 py-3">{d.setorOrigem}</td>
                                                    <td className="px-4 py-3">{d.setorDestino || '-'}</td>
                                                    <td className="px-4 py-3 text-sm">{d.obs || '-'}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button onClick={() => setEditando(d)} className="text-blue-600 hover:text-blue-800 mr-2">✏️</button>
                                                        <button onClick={() => del(d.id)} className="text-red-600 hover:text-red-800">🗑️</button>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

