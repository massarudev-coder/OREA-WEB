//Conexão do servidor com o firebase
//Admin SDK : permite trabalhar com o firebase para rodar no back-end

import { applicationDefault, cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const credential = process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? cert(process.env.GOOGLE_APPLICATION_CREDENTIALS)
    : applicationDefault();

initializeApp({ credential });

//db serve para acessar o banco de dados do Firebase
//auth serve para acessar os serviços de autenticação ( conferir o token do usuário)
export const db = getFirestore();
export const auth = getAuth();