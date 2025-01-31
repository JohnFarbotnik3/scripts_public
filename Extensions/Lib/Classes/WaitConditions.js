
class TruthyWaitCondition {
	constructor(initialValue = true) {
		this.value = initialValue;
		this.resolve = null;
		this.promise = null;
	}
	wait() {
		// if value is already truthy, return
		if(this.value) return this.value;
		// if there is a resolver, then there is an unresolved promise
		if(this.resolve) return this.promise;
		// create a new promise and resolver
		return this.promise = new Promise((resolve, reject) => { this.resolve = resolve; });
	}
	set(value) {
		this.value = value;
		// if value is truthy and there is an unresolved promise,
		// then resolve promise and clear resolver.
		if(value && this.resolve) {
			this.resolve(value);
			this.resolve = null;
		}
	}
};

class FalseyWaitCondition {
	constructor(initialValue = false) {
		this.value = initialValue;
		this.resolve = null;
		this.promise = null;
	}
	wait() {
		// if value is already falsey, return
		if(!this.value) return this.value;
		// if there is a resolver, then there is an unresolved promise
		if(this.resolve) return this.promise;
		// create a new promise and resolver
		return this.promise = new Promise((resolve, reject) => { this.resolve = resolve; });
	}
	set(value) {
		this.value = value;
		// if value is truthy and there is an unresolved promise,
		// then resolve promise and clear resolver.
		if(!value && this.resolve) {
			this.resolve(value);
			this.resolve = null;
		}
	}
};

