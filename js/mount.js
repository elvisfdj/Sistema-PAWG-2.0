// React 18: usar createRoot em vez de ReactDOM.render (API legada React 17)
const rootContainer = document.getElementById('root');
const root = ReactDOM.createRoot(rootContainer);
root.render(
    <ErrorBoundary>
        <App />
    </ErrorBoundary>
);

// Converte todos os emojis para Twemoji após renderização
// Null guard: twemoji pode não carregar se CDN estiver indisponível
if (typeof twemoji !== 'undefined') {
    const observer = new MutationObserver(() => {
        try {
            if (typeof twemoji !== 'undefined') {
                twemoji.parse(document.body, {
                    folder: 'svg',
                    ext: '.svg'
                });
            }
        } catch(e) {
            // Ignora erros do twemoji — não é crítico para a aplicação
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Conversão inicial
    setTimeout(() => {
        try {
            if (typeof twemoji !== 'undefined') {
                twemoji.parse(document.body, {
                    folder: 'svg',
                    ext: '.svg'
                });
            }
        } catch(e) {
            // Ignora erros do twemoji — não é crítico para a aplicação
        }
    }, 100);
}
