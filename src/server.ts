import express, { type ErrorRequestHandler, type NextFunction, type Request, type Response } from "express";
import { FirebaseAuthError } from "firebase-admin/auth";
import { resolve } from "node:path";
import { auth, db } from "./firebase";

const app = express();
const PORTA = Number(process.env.PORT) || 3000;
const SESSION_COOKIE = "orea_session";
const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;
const SESSION_DURATION_SECONDS = SESSION_DURATION_MS / 1000;
const ADMIN_EMAILS = new Set(
    (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((email) => email.trim().toLocaleLowerCase())
        .filter(Boolean),
);

app.use(express.json({ limit: "16kb" }));
app.use(express.static(resolve(__dirname, "../public")));

const produtos = db.collection("produtos");

interface Produto {
    nome: string;
    descricao: string;
    preco: number;
    quantidade: number;
    fotoUrl: string;
    categoria: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validarProduto(value: unknown): { produto?: Produto; erro?: string } {
    if (!isRecord(value)) return { erro: "Envie os dados do produto." };

    const { nome, descricao, preco, quantidade, fotoUrl } = value;
    const categoria = value.categoria ?? "Outros";

    if (typeof nome !== "string" || nome.trim() === "" || nome.trim().length > 120) {
        return { erro: "Informe um nome com até 120 caracteres." };
    }

    if (typeof descricao !== "string" || descricao.trim() === "" || descricao.trim().length > 1000) {
        return { erro: "Informe uma descrição com até 1000 caracteres." };
    }

    if (typeof preco !== "number" || !Number.isFinite(preco) || preco < 0) {
        return { erro: "Informe um preço válido." };
    }

    if (typeof quantidade !== "number" || !Number.isInteger(quantidade) || quantidade < 0) {
        return { erro: "Informe uma quantidade inteira igual ou maior que zero." };
    }

    if (typeof categoria !== "string" || categoria.trim() === "" || categoria.trim().length > 50) {
        return { erro: "Informe uma categoria válida." };
    }

    if (typeof fotoUrl !== "string") {
        return { erro: "Informe a URL da imagem." };
    }

    try {
        const url = new URL(fotoUrl);
        if (url.protocol !== "https:") throw new Error("URL não segura");
    } catch {
        return { erro: "Informe uma URL de imagem válida iniciada com https://." };
    }

    return {
        produto: {
            nome: nome.trim(),
            descricao: descricao.trim(),
            preco,
            quantidade,
            fotoUrl,
            categoria: categoria.trim(),
        },
    };
}

function getSessionCookie(request: Request): string | undefined {
    const cookies = request.headers.cookie?.split(";") ?? [];
    for (const cookie of cookies) {
        const separator = cookie.indexOf("=");
        if (separator < 0) continue;
        if (cookie.slice(0, separator).trim() === SESSION_COOKIE) {
            return cookie.slice(separator + 1).trim();
        }
    }
    return undefined;
}

function isAdministrator(email: unknown, adminClaim: unknown): boolean {
    return adminClaim === true
        || (typeof email === "string" && ADMIN_EMAILS.has(email.toLocaleLowerCase()));
}

function requireRequestIntent(request: Request, response: Response, next: NextFunction): void {
    if (request.get("x-orea-request") !== "1") {
        response.status(403).json({ erro: "Requisição não autorizada." });
        return;
    }
    next();
}

async function requireAdministrator(request: Request, response: Response, next: NextFunction): Promise<void> {
    const sessionCookie = getSessionCookie(request);
    if (!sessionCookie) {
        response.status(401).json({ erro: "Faça login para continuar." });
        return;
    }

    try {
        const decoded = await auth.verifySessionCookie(sessionCookie, true);
        if (!isAdministrator(decoded.email, decoded.admin)) {
            response.status(403).json({ erro: "Esta conta não tem permissão de administrador." });
            return;
        }
        response.locals.adminEmail = decoded.email ?? "";
        next();
    } catch (error) {
        if (error instanceof FirebaseAuthError) {
            response.status(401).json({ erro: "Sua sessão expirou. Entre novamente." });
            return;
        }
        next(error);
    }
}

function setSessionCookie(response: Response, value: string, maxAge: number): void {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.setHeader(
        "Set-Cookie",
        `${SESSION_COOKIE}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`,
    );
}

app.get("/api/config", (_request, response) => {
    response.json({ firebaseWebApiKey: process.env.FIREBASE_WEB_API_KEY ?? null });
});

app.post("/api/sessao", requireRequestIntent, async (request, response, next) => {
    const idToken = isRecord(request.body) ? request.body.idToken : undefined;
    if (typeof idToken !== "string" || idToken.length === 0) {
        response.status(400).json({ erro: "Token de autenticação inválido." });
        return;
    }

    try {
        const decoded = await auth.verifyIdToken(idToken, true);
        if (!isAdministrator(decoded.email, decoded.admin)) {
            response.status(403).json({ erro: "Esta conta não tem permissão de administrador." });
            return;
        }
        const sessionCookie = await auth.createSessionCookie(idToken, {
            expiresIn: SESSION_DURATION_MS,
        });
        setSessionCookie(response, sessionCookie, SESSION_DURATION_SECONDS);
        response.status(201).json({ email: decoded.email ?? "" });
    } catch (error) {
        if (error instanceof FirebaseAuthError) {
            response.status(401).json({ erro: "Não foi possível validar o login. Entre novamente." });
            return;
        }
        next(error);
    }
});

app.get("/api/sessao", requireAdministrator, (_request, response) => {
    response.json({ email: response.locals.adminEmail });
});

app.delete("/api/sessao", requireRequestIntent, (_request, response) => {
    setSessionCookie(response, "", 0);
    response.status(204).send();
});

app.get("/api/produtos", async (_request, response) => {
    const result = await produtos.orderBy("criadoEm", "desc").get();
    const list = result.docs.map((document) => ({
        ...document.data(),
        id: document.id,
        categoria: document.get("categoria") ?? "Outros",
    }));
    response.json(list);
});

app.get("/api/produtos/:id", async (request, response) => {
    const document = await produtos.doc(String(request.params.id)).get();
    if (!document.exists) {
        response.status(404).json({ erro: "Produto não encontrado." });
        return;
    }
    response.json({
        ...document.data(),
        id: document.id,
        categoria: document.get("categoria") ?? "Outros",
    });
});

app.post("/api/produtos", requireRequestIntent, requireAdministrator, async (request, response) => {
    const { produto, erro } = validarProduto(request.body);
    if (!produto) {
        response.status(400).json({ erro });
        return;
    }

    const document = await produtos.add({ ...produto, criadoEm: Date.now() });
    response.status(201).json({ id: document.id, ...produto });
});

app.put("/api/produtos/:id", requireRequestIntent, requireAdministrator, async (request, response) => {
    const { produto, erro } = validarProduto(request.body);
    if (!produto) {
        response.status(400).json({ erro });
        return;
    }

    const reference = produtos.doc(String(request.params.id));
    const document = await reference.get();
    if (!document.exists) {
        response.status(404).json({ erro: "Produto não encontrado." });
        return;
    }

    await reference.update(produto);
    response.json({ id: document.id, ...produto });
});

app.delete("/api/produtos/:id", requireRequestIntent, requireAdministrator, async (request, response) => {
    const reference = produtos.doc(String(request.params.id));
    const document = await reference.get();
    if (!document.exists) {
        response.status(404).json({ erro: "Produto não encontrado." });
        return;
    }

    await reference.delete();
    response.status(204).send();
});

const handleError: ErrorRequestHandler = (error, _request, response, _next) => {
    console.error("Erro ao processar requisição:", error);
    if (!response.headersSent) {
        response.status(500).json({ erro: "Erro interno do servidor." });
    }
};

app.use(handleError);

app.listen(PORTA, (erro) => {
    if (erro) {
        console.error(`Não foi possível iniciar o servidor na porta ${PORTA}.`, erro);
        process.exit(1);
    }

    console.log(`Loja OREA rodando em http://localhost:${PORTA}`);
});
