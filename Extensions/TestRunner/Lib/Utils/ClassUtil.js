
function typecast(obj, _class) {
	if(obj && obj.constructor !== _class) {
		const newObj = new _class;
		Object.assign(newObj, obj);
		return newObj;
	}
	return null;
}

