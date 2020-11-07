var crypto = require('./crypto');
var skynet = require('./skynet');
var words = require('./words');

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
