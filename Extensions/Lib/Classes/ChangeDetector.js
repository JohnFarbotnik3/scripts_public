
class ChangeDetector {
	constructor(onChangeFunc, initialValue) {
		this.value = initialValue;
		this.onChange = onChangeFunc;
	}
	set(newValue, args=null) {
		if(this.value !== newValue) {
			this.onChange(args);
			this.value = newValue;
		}
	}
};

