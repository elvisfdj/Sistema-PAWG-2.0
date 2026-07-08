// =====================================================================
// CLASSIFICAÇÃO DE RISCO VISA - Res. SES-RJ 2191/20
// IMPORTANTE: classificação é por SUBCLASSE COMPLETA (7 dígitos),
// NÃO pelo prefixo de 4 dígitos do CNAE. Várias subclasses de um
// mesmo grupo de 4 dígitos têm riscos DIFERENTES entre si
// (ex: 4632-0/01 e 4632-0/02 = MÉDIO, mas 4632-0/03 = ALTO;
//      5611-2/01 = MÉDIO, mas 5611-2/03 = ALTO).
// O lookup é feito pelo código completo via normalizeCnae/precisaVisaPorCnae.
// =====================================================================
const CNAES_VISA = {
    ALTO_RISCO: [
        '0892-4/03','1031-7/00','1032-5/01','1032-5/99','1041-4/00','1042-2/00',
        '1043-1/00','1053-8/00','1061-9/01','1061-9/02','1062-7/00','1063-5/00',
        '1064-3/00','1065-1/01','1065-1/02','1065-1/03','1069-4/00','1072-4/01',
        '1072-4/02','1081-3/02','1082-1/00','1091-1/01','1092-9/00','1093-7/01',
        '1093-7/02','1094-5/00','1095-3/00','1096-1/00','1099-6/02','1099-6/03',
        '1099-6/04','1099-6/05','1099-6/06','1099-6/07','1099-6/99','1121-6/00',
        '1122-4/03','1122-4/04','1122-4/99','2019-3/99','2029-1/00','2071-1/00',
        '2091-6/00','2093-2/00','3600-6/02','4632-0/03','4635-4/03','4639-7/02',
        '4644-3/01','4645-1/01','4645-1/02','4645-1/03','4646-0/01','4646-0/02',
        '4649-4/08','4664-8/00','4771-7/01','4771-7/02','4771-7/03','4930-2/01',
        '4930-2/02','5211-7/01','5211-7/99','5611-2/03','5620-1/01','7120-1/00',
        '8122-2/00','8129-0/00','8292-0/00','8511-2/00','8621-6/01','8621-6/02',
        '8630-5/01','8630-5/02','8630-5/03','8630-5/04','8630-5/06','8630-5/07',
        '8630-5/99','8640-2/01','8640-2/02','8640-2/04','8640-2/05','8640-2/06',
        '8640-2/07','8640-2/08','8640-2/09','8640-2/10','8640-2/13','8640-2/99',
        '8650-0/01','8650-0/02','8650-0/03','8650-0/04','8650-0/05','8650-0/06',
        '8650-0/07','8650-0/99','8690-9/02','8690-9/99','8711-5/01','8711-5/02',
        '8711-5/03','8712-3/00','8720-4/99','8730-1/01','8730-1/99','9601-7/01',
        '9603-3/05','9609-2/06',
    ],
    MEDIO_RISCO: [
        '1071-6/00','1081-3/01','1091-1/02','1731-1/00','1732-0/00','1733-8/00',
        '2222-6/00','2312-5/00','2341-9/00','2349-4/99','2591-8/00','3250-7/06',
        '3702-9/00','3811-4/00','3812-2/00','3821-1/00','3822-0/00','4621-4/00',
        '4622-2/00','4623-1/05','4631-1/00','4632-0/01','4632-0/02','4633-8/01',
        '4633-8/02','4634-6/01','4634-6/02','4634-6/03','4634-6/99','4635-4/01',
        '4635-4/02','4635-4/99','4637-1/01','4637-1/02','4637-1/03','4637-1/04',
        '4637-1/05','4637-1/06','4637-1/07','4637-1/99','4639-7/01','4691-5/00',
        '4711-3/01','4711-3/02','4712-1/00','4721-1/02','4721-1/03','4721-1/04',
        '4722-9/01','4722-9/02','4723-7/00','4724-5/00','4729-6/02','4729-6/99',
        '4772-5/00','4774-1/00','4789-0/05','4789-0/99','5510-8/01','5510-8/02',
        '5510-8/03','5590-6/99','5611-2/01','5611-2/02','5611-2/04','5611-2/05',
        '5612-1/00','5620-1/02','5620-1/03','5620-1/04','7500-1/00','8512-1/00',
        '8513-9/00','8591-1/00','8599-6/99','8622-4/00','8690-9/01','8690-9/03',
        '8690-9/04','8711-5/04','8711-5/05','8720-4/01','8800-6/00','9312-3/00',
        '9313-1/00','9321-2/00','9602-5/01','9602-5/02','9603-3/01','9603-3/02',
        '9603-3/03','9603-3/04','9603-3/99','9609-2/05','9609-2/07','9609-2/99',
    ],
    BAIXO_RISCO: [
        '4773-3/00','5590-6/01','5590-6/03','7729-2/03',
    ],
};

// Normaliza um CNAE recebido (com ou sem máscara, 7 dígitos) para o
// formato "0000-0/00" usado nas listas acima. Retorna null se inválido.
function normalizeCnae(cnae) {
    const digits = String(cnae || '').replace(/\D/g, '');
    if (digits.length !== 7) return null;
    return `${digits.slice(0, 4)}-${digits[4]}/${digits.slice(5, 7)}`;
}

// Retorna true se o CNAE (qualquer formato) exige licenciamento VISA
// pela Res. SES-RJ 2191/20, comparando pela subclasse completa.
function precisaVisaPorCnae(cnae) {
    const codigo = normalizeCnae(cnae);
    if (!codigo) return false;
    return CNAES_VISA.ALTO_RISCO.includes(codigo)
        || CNAES_VISA.MEDIO_RISCO.includes(codigo)
        || CNAES_VISA.BAIXO_RISCO.includes(codigo);
}

// Retorna 'ALTO' | 'MEDIO' | 'BAIXO' | null para o CNAE informado.
function getRiscoVisaPorCnae(cnae) {
    const codigo = normalizeCnae(cnae);
    if (!codigo) return null;
    if (CNAES_VISA.ALTO_RISCO.includes(codigo)) return 'ALTO';
    if (CNAES_VISA.MEDIO_RISCO.includes(codigo)) return 'MEDIO';
    if (CNAES_VISA.BAIXO_RISCO.includes(codigo)) return 'BAIXO';
    return null;
}

// Dado um array de CNAEs (principal + secundários), retorna o MAIOR risco
// entre eles ('ALTO' > 'MEDIO' > 'BAIXO'), ou null se nenhum exigir VISA.
const RISCO_VISA_ORDEM = { ALTO: 3, MEDIO: 2, BAIXO: 1 };
function getMaiorRiscoVisa(cnaes) {
    let maior = null;
    (cnaes || []).forEach(cnae => {
        const risco = getRiscoVisaPorCnae(cnae);
        if (risco && (!maior || RISCO_VISA_ORDEM[risco] > RISCO_VISA_ORDEM[maior])) {
            maior = risco;
        }
    });
    return maior;
}
