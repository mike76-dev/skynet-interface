var skynet = require('./skynet');
var crypto = require('./crypto');
var aes = require('aes-js');
var base64 = require('js-base64');
var buffer = require('buffer');

// check if the key already exists in the database referenced by skylink
// if not, append the key to the database
export async function appendKey(key, skylink, appId) {
	const database = await skynet.downloadText(skylink);
	if (!database) {
		throw new Error('Could not locate database');
	}
	let text = database.text.slice(database.text.indexOf('{') + 1, database.text.indexOf('}'));
	const aesKey = crypto.HashDataKey(appId);
	let aesCtr = new aes.ModeOfOperation.ctr(aesKey);
	let decrypted;
	let keys;
	if (text.length == 0) {
		keys = [];
	} else {	
		decrypted = aes.utils.utf8.fromBytes(aesCtr.decrypt(base64.Base64.toUint8Array(text)));
		if (decrypted.indexOf(',') < 0) {
			keys = [decrypted];
		} else {
			keys = decrypted.split(',');
		}
	}
	if (keys.includes(key)) {
		return '';
	}
	keys.push(key);
	decrypted = keys.toString();
	aesCtr = new aes.ModeOfOperation.ctr(aesKey);
	let newDatabase = aesCtr.encrypt(aes.utils.utf8.toBytes(decrypted));
	newDatabase = '{' + base64.Base64.fromUint8Array(newDatabase) + '}';
	return await skynet.uploadText(newDatabase, database.name);
}

// update the registry with the new key
export async function appendRegistryKey(key, appId) {
	const seed = buffer.Buffer.from(crypto.HashDataKey(appId)).toString('hex');
	const {publicKey, privateKey} = crypto.keyPairFromSeed(seed);
	const entry = await skynet.getEntry(publicKey, appId);
	if (!entry) {
		const link = await skynet.uploadText('{}', 'db.txt');
		const newLink = await appendKey(key, link, appId);
		if (newLink == '') {
			return false;
		}
		const newEntry = await skynet.setEntry(privateKey, appId,
			{datakey: appId, data: newLink, revision: 0}
		);
		return true;
	} else {
		const link = entry.entry.data;
		const newLink = await appendKey(key, link, appId);
		if (newLink == '') {
			return false;
		}
		const newEntry = await skynet.setEntry(privateKey, appId,
			{datakey: appId, data: newLink, revision: 0}
		);
		return true;
	}
}

// create a unique appId
// this function should be used only once for each app
export function createAppId(appId) {
	if (appId.length >= 32) {
		return appId;
	}
	const asciiChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split('');
	let result = appId + '-';
	for (let i = result.length; i < 32; i++) {
		result = result + asciiChars[Math.floor(Math.random() * asciiChars.length)];
	}
	return result;
}
