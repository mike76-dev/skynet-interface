var crypto = require('./crypto');
var skynet = require('./skynet');
var words = require('./words');
var keydb = require('./keydb');

window.toRegistry = async function(seed, datakey, data) {
	const {publicKey, privateKey} = crypto.keyPairFromSeed(seed);
	return await skynet.setEntry(privateKey, datakey, {datakey, data, revision: 0});
}

window.fromRegistry = async function(seed, datakey) {
	const {publicKey, privateKey} = crypto.keyPairFromSeed(seed);
	return (await skynet.getEntry(publicKey, datakey)).entry.data;
}

window.downloadText = async function(skylink) {
	return await skynet.downloadText(skylink);
}

window.uploadText = async function(text, filename) {
	return await skynet.uploadText(text, filename);
}

window.getWords = async function(numbers) {
	return await words.getWords(numbers);
}

window.getNumbers = async function(phrase) {
	return await words.getNumbers(phrase);
}

window.generateSeed = async function(login, password, appId) {
	return await crypto.generateSeed(login, password, appId);
}

window.recoverPassword = async function(seed, appId) {
	return await crypto.recoverPassword(seed, appId);
}

window.appendKey = async function(key, skylink, appId) {
	return await keydb.appendKey(key, skylink, appId);
}

window.appendRegistryKey = async function(key, appId) {
	return await keydb.appendRegistryKey(key, appId);
}

window.setDefaultPortal = function(portal) {
	skynet.setDefaultPortal(portal);
}

window.setDefaultTimeout = function(t) {
	skynet.setDefaultTimeout(t);
}

window.createAppId = function(appId) {
	return keydb.createAppId(appId);
}
