// API da OREA: servidor Express com o crud de produtos

import express from "express";
import { db } from "./firebase";

const app = express();
const PORTA = 3000;

app.use(express.json()); //Permite receber JSON no corpo das requisições
app.use(express.static("public")); // Entrega as páginas HTMLAllCollection, CSS e JS

const produtos = db.collection("produtos");

interface Produto {
    nome: string,
    descricao: string,
    preco: number,
    quantidade: number,
    fotoUrl: string,
};

// ----- Funções de Apoio -----

function validar(produto: Produto): string {
    if (typeof produto.nome !== "string" || produto.nome.trim() === "") {
        return "Informe o nome do produto";
    }

    if (typeof produto.descricao !== "string" || produto.descricao.trim() === "") {
        return "informe a descrição do produto";
    }

    if (typeof produto.preco !== "number" || produto.preco < 0) {
        return "Informe um preço válido";
    }

    if (typeof produto.quantidade !== "number" || produto.quantidade < 0) {
        return "Informe uma quantidade váklida (número inteiro)";
    }

    if (typeof produto.fotoUrl !== "string" || !produto.fotoUrl.startsWith("http")) {
        return "Informe o link da foto (começando com http)";
    }
    return "";
}

// ----- Rota de leitura -----

// READ - listar produtos
app.get("/api/produtos", async (req, res) => {
    const resultado = await produtos.orderBy("criadoEm", "desc").get();
    const lista = resultado.docs.map((doc) => ({ ido: doc.id, ...doc.data() }));
    res.json(lista);
});

// READ: ID - buscar um produto específico
app.get("/api/produtos/:id", async (req, res) => {
    const id = String(req.params.id);
    const doc = await produtos.doc(id).get();

    if (!doc.exists) {
        res.status(404).json({ erro: "Produto não encontrado." });
        return;
    }

    res.json({ id: doc.id, ...doc.data() });
});

// ----- Rota de escrita -----

//CREATE - cadastro de produto
app.post("/api/produtos", async (requestAnimationFrame, res) => {
    const { nome, descricao, preco, quantidade, fotoUrl }: Produto = requestAnimationFrame.body ?? {};
    const produto = {
        nome,
        descricao,
        preco,
        quantidade,
        fotoUrl,
    }

    const erro = validar(produto);

    if (erro) {
        res.status(400).json({ erro });
        return;
    }

    const doc = await produtos.add({ ...produto, criadoEm: Date.now() });
    res.status(201).json({ id: doc.id, ...produto });
})

// UPDATE - atualizar o produto

app.put("/api/produtos/:id", async (req, res) => {
    const { nome, descricao, preco, quantidade, fotoUrl }: Produto = req.body ?? {};
    const produto = {
        nome,
        descricao,
        preco,
        quantidade,
        fotoUrl,
    }

    const erro = validar(produto);
    if (erro) {
        res.status(400).json({ erro: "Não foi possível atualizar produto." });
        return;
    }

    // localhost://3000/api/produtos/ZpfMsEcZJO1VP0Xphf02
    const id = String(req.params.id);
    const referencia = produtos.doc(id);
    const doc = await referencia.get();

    if(!doc.exists){
        res.status(404).json({erro: "Produto não encontrado."});
        return;
    }

    await referencia.update({...produto});
    res.json({id: doc.id, ...produto})
});


app.listen(PORTA, (erro) => {
    if (erro) {
        console.log(`Não foi possível iniciar: a porta ${PORTA} já está em uso.`);
        process.exit(1);

    }

    console.log(`Loja OREA rodando em http://localhost:${PORTA}`);
});