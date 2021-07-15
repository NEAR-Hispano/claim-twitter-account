import 'regenerator-runtime/runtime'

import { initContract, login, logout, isAccountTaken } from './utils'
import { generateSeedPhrase } from 'near-seed-phrase'
import * as nearAPI from "near-api-js"

import getConfig from './config'
const { networkId, nodeUrl, walletUrl } = getConfig(process.env.NODE_ENV || 'development')

const { KeyPair, InMemorySigner, utils: {
    PublicKey,
    format: {
        parseNearAmount, formatNearAmount
    }
}, } = nearAPI;

document.querySelector('#gnt-seed').onclick = seedPhrase;
document.querySelector('#claim-button').onclick = claim;

function getQueryParameters() {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    return params;
}

export const searchUser = async () => {
    const account = window.account;
	let ud = await window.contract.get_user_data();
	console.log(ud);
    let username = document.querySelector('#username').value;

	for( var i = 0; i < ud.length; i++ ) {
		/*console.log('Item '+i);
		console.log(ud[i]['accountId']);*/
        if( ud[i]['accountId'] == username ) {
            return ud[i]['publicKey'];
        }
	}

    return "-1";
}

async function seedPhrase() {

    let accountId = null;
    let key = null;
    // here comes the public key
    // and the user or accountId is already loaded in the form
    let response = await searchUser(); 
    if(response == "-1") {
        console.log('user not found on the list');
    }
    else {
        console.log('public key = '+response);
        accountId = document.querySelector('#username').value;
        // set the key in the form, just for reference
        document.querySelector('#key').value = response;
        key = response;
    }

    //const { accountId, key } = getQueryParameters();

    if (accountId && key) {
        const { seedPhrase, publicKey } = generateSeedPhrase()
        localStorage.setItem('SEED_PHRASE', seedPhrase);
        localStorage.setItem('PUB_KEY', publicKey);
        console.log("Seed phrase: " + seedPhrase);
        console.log("publicKey seedPhrase: " + publicKey);
        console.log("key: " + key);
        document.querySelector("#seed-phrase").value = seedPhrase;
    }
}

async function claim() {
    // const { accountId, key } = getQueryParameters();
    let accountId = document.querySelector('#username').value;
    let key = document.querySelector('#key').value;

    const keyPair = KeyPair.fromString(key);
    const signer = await InMemorySigner.fromKeyPair(networkId, accountId, keyPair);
    const near = await nearAPI.connect({
        networkId, nodeUrl, walletUrl, deps: { keyStore: signer.keyStore },
    });
    const keyExists = await hasKey(key, accountId, near);
    if (keyExists) {
        console.log("claimed");
        return;
    }
    const publicKey = localStorage.getItem('PUB_KEY');
    console.log("Public key from localstorage: " + publicKey);
    const account = new nearAPI.Account(near.connection, accountId);
    const accessKeys = await account.getAccessKeys();
    console.log(accessKeys);
    const actions = [
        deleteKey(PublicKey.from(accessKeys[0].public_key)),
        addKey(PublicKey.from(publicKey), fullAccessKey())
    ]
    
    const result = await account.signAndSendTransaction(accountId, actions);
    console.log(result);
}

export const hasKey = async (key, accountId, near) => {
    const keyPair = KeyPair.fromString(key)
    const pubKeyStr = keyPair.publicKey.toString()

    if (!near) {
        const signer = await InMemorySigner.fromKeyPair(networkId, accountId, keyPair)
        near = await nearAPI.connect({
            networkId, nodeUrl, walletUrl, deps: { keyStore: signer.keyStore },
        });
    }
    const account = new nearAPI.Account(near.connection, accountId);
    try {
        const accessKeys = await account.getAccessKeys()
        if (accessKeys.length > 0 && accessKeys.find(({ public_key }) => public_key === pubKeyStr)) {
            return true
        }
    } catch (e) {
        console.warn(e)
    }
    return false
}

// `nearInitPromise` gets called on page load
window.nearInitPromise = initContract()
	.then(() => {
		/*if (window.walletConnection.isSignedIn()) signedInFlow()
		else signedOutFlow()*/
	})
	.catch(console.error)