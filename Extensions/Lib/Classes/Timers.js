
class Timer {
	constructor(period, callback) {
		this.callback = callback;
		this.period = period;
		this.timerDate = 0;
		this.timer = null;
	}
	get timeLeft() { return this.timerDate - Date.now(); }
	get afterTimerDate() { return Date.now() >= this.timerDate; }
	clear() {
		clearTimeout(this.timer);
		this.timer = null;
	}
	start() {
		this.timerDate = Date.now() + this.period;
		this.timer = setInterval(() => this.check(this), Timer.checkIntervalMillis(this.period));
	}
	check(_this) { console.debug("Timer.check(this)", _this); }
	fcall(value) {
		const {args, func} = this.callback;
		func(args, value);
	}
	// static helper methods
	static checkIntervalMillis(time) {
		return Math.min(1000, Math.max(20, time/20));
	}
}

class Timeout extends Timer {
	constructor(period, callback) {
		super(period, callback);
		this.start();
	}
	check(_this) {
		if(_this.afterTimerDate) { _this.fcall(null); _this.clear(); }
	}
};

class Interval extends Timer {
	constructor(period, callback) {
		super(period, callback);
		this.start();
	}
	check(_this) {
		if(_this.afterTimerDate) { _this.fcall(null); _this.timerDate += _this.period; }
	}
};

function wait(time) {
	return new Promise((resolve, reject) => { const timeout = new Timeout(time, {args: null, func:() => resolve(true)}); });
}

class Throttle extends Timer {
	constructor(period, callback) {
		super(period, callback);
	}
	check(_this) {
		if(_this.afterTimerDate) _this.clear();
	}
	trigger(value) {
		if(!this.timer) {
			this.fcall(value);
			this.start();
		}
	}
};

class Debounce extends Timer {
	constructor(period, callback) {
		super(period, callback);
		this.value = null;
	}
	check(_this) {
		if(_this.afterTimerDate) {
			_this.fcall(_this.value);
			_this.clear();
		}
	}
	trigger(value) {
		this.value = value;
		if(!this.timer) this.start();
		else this.timerDate = Date.now() + this.period;
	}
};

class ThrottleAndDebounce {
	constructor(periodTH, periodDB, callback) {
		this.throttle = new Throttle(periodTH, callback);
		this.debounce = new Debounce(periodDB, callback);
	}
	clear() {
		this.throttle.clear();
		this.debounce.clear();
	}
	trigger(value) {
		const throttleWillCall = !this.throttle.timer;
		if(throttleWillCall)	this.throttle.trigger(value);
		else					this.debounce.trigger(value);
	}
}

class ThrottleMap {
	constructor(period, callback) {
		this.callback = callback;
		this.period = period;
		this.map = new Map();
	}
	trigger(key, value) {
		let obj = this.map.get(key);
		if(!obj) this.map.set(key, obj=new Throttle(this.period, this.callback));
		obj.trigger(value);
	}
};

class DebounceMap {
	constructor(period, callback) {
		this.callback = callback;
		this.period = period;
		this.map = new Map();
	}
	trigger(key, value) {
		let obj = this.map.get(key);
		if(!obj) this.map.set(key, obj=new Debounce(this.period, this.callback));
		obj.trigger(value);
	}
};

