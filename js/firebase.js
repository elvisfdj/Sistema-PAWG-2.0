const { useState, useEffect } = React;

const firebaseConfig = {
    apiKey: "AIzaSyAajyRVH8eR7gWDAF-cE7Y32sKCyH3my8I",
    authDomain: "controle-numeros.firebaseapp.com",
    databaseURL: "https://controle-numeros-default-rtdb.firebaseio.com/",
    projectId: "controle-numeros",
    storageBucket: "controle-numeros.firebasestorage.app",
    messagingSenderId: "95868423352",
    appId: "1:95868423352:web:7968f64d68fc18eb8cb84d"
};

// ── Inicialização Firebase com tratamento de erro ──────────────
let db;
try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    db = firebase.database();
} catch (fbErr) {
    console.error('❌ Erro ao inicializar Firebase:', fbErr);
    if (window.__mostrarErroFatal) {
        window.__mostrarErroFatal(
            'Falha ao inicializar Firebase: ' + fbErr.message,
            'Verifique se o firebaseConfig está correto e se as bibliotecas Firebase foram carregadas. Erro: ' + fbErr.stack
        );
    }
    throw fbErr; // propaga para parar execução se Firebase é crítico
}
