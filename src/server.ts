// API da OREA: servidor Express com o crud de produtos

import express from "express";

const app = express();
const PORTA = 3000;

app.use(express.json()); //Permite receber JSON no corpo das requisições
app.use(express.static("public")); // Entrega as páginas HTMLAllCollection, CSS e JS

app.listen(PORTA, (erro)=>{
    if(erro){
        console.log(`Não foi possível iniciar: a porta ${PORTA} já está em uso.`);
        process.exit(1);

    }

    console.log(`Loja OREA rodando em http://localhost:${PORTA}`);
})