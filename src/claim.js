import 'regenerator-runtime/runtime'

import { initContract, login, logout, isAccountTaken } from './utils'
import { generateSeedPhrase } from 'near-seed-phrase'
import * as nearAPI from "near-api-js"

import getConfig from './config'
const { networkId, nodeUrl, walletUrl } = getConfig(process.env.NODE_ENV || 'development')

const {
    KeyPair,
    InMemorySigner,
    transactions: {
        addKey, deleteKey, fullAccessKey
    },
    utils: {
        PublicKey,
        format: {
            parseNearAmount, formatNearAmount
        }
    }
} = nearAPI

document.querySelector('#gnt-seed').onclick = seedPhrase;
document.querySelector('#claim-button').onclick = claim;

function getQueryParameters() {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const params = Object.fromEntries(urlSearchParams.entries());
    return params;
}

let userIndex;

export const searchUser = async () => {
    const account = window.account;
	let ud = await window.contract.get_user_data();
    let username = document.querySelector('#username').value;
    console.log(ud);

	for( var i = 0; i < ud.length; i++ ) {
		/*console.log('Item '+i);
		console.log(ud[i]['accountId']);*/
        if( ud[i]['accountId'] == username ) {
            document.querySelector('#index').value = i;
            return ud[i]['publicKey'];
            userIndex = i;
        }
	}

    document.querySelector('#index').value = '-1';
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
        //document.querySelector('#current-message').innerHTML = "Usuario no encontrado en la lista";
    }
    else {
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
        console.log("Private key: " + key);
        document.querySelector("#seed-phrase").innerText = seedPhrase;
        jQuery(".step").fadeOut();
        jQuery("#passphrase-card").css("display", "flex").hide().fadeIn();
    }
}

// window.onbeforeunload = function(){
//     return 'Are you sure you want to leave?';
// };

async function claim() {
    // const { accountId, key } = getQueryParameters();
    let accountId = document.querySelector('#username').value;
    let key = document.querySelector('#key').value;

    const keyPair = KeyPair.fromString(key);
    const signer = await InMemorySigner.fromKeyPair(networkId, accountId, keyPair);
    const near = await nearAPI.connect({
        networkId, nodeUrl, walletUrl, deps: { keyStore: signer.keyStore },
    });
    
    const publicKey = localStorage.getItem('PUB_KEY');
    console.log("Public key from localstorage: " + publicKey);
    const account = new nearAPI.Account(near.connection, accountId);
    const accessKeys = await account.getAccessKeys();
    const actions = [
        deleteKey(PublicKey.from(accessKeys[0].public_key)),
        addKey(PublicKey.from(publicKey), fullAccessKey())
    ]
    const result = await account.signAndSendTransaction({
        receiverId: `${accountId}`,
        actions: actions
    });
    console.log(result);
    /// TODO: Revisar el estatus de la llamada antes de reenviar
    location.href = "https://wallet.testnet.near.org/recover-seed-phrase";
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
		// if (!window.walletConnection.isSignedIn()) signedOutFlow();
	})
	.catch(console.error)