
class TabMessengerClient {
	constructor(messengerName) {
		this.messengerName = messengerName;
		this.responseMap = new Map();// Map<id, [res, rej]>
		this.nextMessageId = 0;
		// add listener
		this.listener = (msg) => TabMessengerClient._handleResponse(this, msg);
		browser.runtime.onMessage.addListener(this.listener);
	}
	sendMessage(data) {
		return new Promise((res, rej) => {
			const id = this.nextMessageId++;
			const msg = { messengerName: this.messengerName, id, data };
			this.responseMap.set(id, [res, rej]);
			//console.debug("sendMessage(id, data)", id, data);
			browser.runtime.sendMessage(msg);
		});
	}
	static _handleResponse(_this, msg) { _this.handleResponse(msg); }
	handleResponse(msg) {
		const { messengerName, id, data } = msg;
		if(messengerName !== this.messengerName) return;
		//console.debug("handleResponse(id, data)", id, data);
		if(!this.responseMap.has(id)) {
			console.error(`TabMessengerClient ${messengerName} does not have message with id ${id}`);
			return;
		}
		const [res, rej] = this.responseMap.get(id);
		if(data instanceof Error) { console.error(data); rej(data); } else res(data);
		this.responseMap.delete(id);
	}
};

class TabMessengerServer {
	constructor(messengerName, requestFunc) {
		this.messengerName = messengerName;
		this.requestFunc = requestFunc;// async func(data) -> reponseData
		// add listener
		this.listener = (m,s,r) => TabMessengerServer._handleMessage(this,m,s,r);
		browser.runtime.onMessage.addListener(this.listener);
	}
	static _handleMessage(_this,m,s,r) { _this.handleMessage(m,s,r); }
	handleMessage(message, sender, sendResponse) {
		const { messengerName, id, data } = message;
		if(messengerName !== this.messengerName) return;
		//console.debug("handleMessage request", sender, id, data);
		this.requestFunc(data).then(responseData => {
			//console.debug("handleMessage response", id, responseData);
			const msg = { messengerName: this.messengerName, id, data: responseData };
			browser.tabs.sendMessage(sender.tab.id, msg);
		}).catch(error => {
			const msg = { messengerName: this.messengerName, id, data: error };
			browser.tabs.sendMessage(sender.tab.id, msg);
		});
	}
};

