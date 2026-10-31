//Conexão do servidor com o firebase
//Admin SDK : permite trabalhar com o firebase para rodar no back-end

import { readFileSync } from "node:fs";
import { applicationDefault, cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

function getServiceAccountProjectId(path: string): string | undefined {
    const serviceAccount: unknown = JSON.parse(readFileSync(path, "utf8"));

    if (
        typeof serviceAccount === "object"
        && serviceAccount !== null
        && "project_id" in serviceAccount
        && typeof serviceAccount.project_id === "string"
    ) {
        return serviceAccount.project_id;
    }

    return undefined;
}

const projectId = process.env.GOOGLE_CLOUD_PROJECT
    || process.env.GCLOUD_PROJECT
    || (credentialsPath ? getServiceAccountProjectId(credentialsPath) : undefined);

if (!projectId) {
    throw new Error(
        "Firebase project ID not found. Set GOOGLE_CLOUD_PROJECT or GCLOUD_PROJECT, "
        + "or point GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON with project_id."
    );
}

const credential = credentialsPath ? cert(credentialsPath) : applicationDefault();

initializeApp({ credential, projectId });

//db serve para acessar o banco de dados do Firebase
//auth serve para acessar os serviços de autenticação ( conferir o token do usuário)
export const db = getFirestore();
export const auth = getAuth();