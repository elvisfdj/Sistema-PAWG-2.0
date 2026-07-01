const ANO_MINIMO = 2018;
const ANO_MAXIMO = 2026;

// ============================================================
// ⚙️ CONFIGURAÇÕES DO EDITAL — editar aqui quando trocar de gestor
// ============================================================
const EDITAL_ASSINATURA = {
    nome: 'Marcelo Alvarenga Moço',
    cargo1: 'Secretaria Municipal de Fazenda',
    cargo2: 'Subsecretário Adjunto de Receita',
    matricula: '13.877'
};

const EDITAL_TEXTO = {
    paragrafo1: 'Ficam notificados os contribuintes abaixo identificados a recolherem os tributos municipais referentes à inscrição no Cadastro de Produtores de Bens e Serviços (Alvará) no prazo de 15 dias.',
    paragrafo2: 'Os tributos poderão ser emitidos na Central de Atendimento ao Contribuinte, localizada na Secretaria Municipal de Fazenda, situada à Rua Treze de Maio, nº 129 – Centro – Campos dos Goytacazes/RJ, ou eletronicamente pelo Portal da Secretaria de Fazenda do Município, disponível em: https://fazenda.campos.rj.gov.br/',
    paragrafo3: 'Embasamento legal: Artigos 150, 305 (quando houver prestação de serviços) e 357 da Lei Complementar nº 01/2017 (CTM).',
    paragrafo4: 'Caso o recolhimento dos tributos já tenha sido devidamente efetuado, esta notificação deverá ser desconsiderada.'
};

// MESES, AUDITORES, VALOR_UFICA e TABELA_VISA
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const AUDITORES = ['Adel A.', 'Alessandro N.', 'Aline P.', 'Amanda V.', 'Carolina S.', 'Erick J.', 'Fagne A.', 'Gabriel S.', 'Igor B.', 'Jennipher A.', 'Matheus C.', 'Nahttura P.', 'Natalia C.', 'Natalia G.', 'Pedro A.', 'Raphael O.', 'Rodrigo R.', 'Thiago S.', 'Tiago M.'];
const VALOR_UFICA_2026 = 179.50;

const TABELA_VISA = [
    { min: 0, max: 50, valorIntegral: 143.60, valorME_EPP: 71.80 },
    { min: 51, max: 100, valorIntegral: 179.50, valorME_EPP: 89.75 },
    { min: 101, max: 150, valorIntegral: 269.25, valorME_EPP: 134.63 },
    { min: 151, max: 200, valorIntegral: 359.00, valorME_EPP: 179.50 },
    { min: 201, max: 300, valorIntegral: 448.75, valorME_EPP: 224.38 },
    { min: 301, max: 350, valorIntegral: 538.50, valorME_EPP: 269.25 },
    { min: 351, max: 400, valorIntegral: 628.25, valorME_EPP: 314.13 },
    { min: 401, max: 500, valorIntegral: 718.00, valorME_EPP: 359.00 },
    { min: 501, max: 600, valorIntegral: 807.75, valorME_EPP: 403.88 },
    { min: 601, max: 1000, valorIntegral: 897.50, valorME_EPP: 448.75 },
    { min: 1001, max: 1500, valorIntegral: 1077.00, valorME_EPP: 538.50 },
    { min: 1501, max: Infinity, valorIntegral: 1256.50, valorME_EPP: 628.25 }
];


// ============================================
// ERROR BOUNDARY - Captura erros React
// ============================================
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
