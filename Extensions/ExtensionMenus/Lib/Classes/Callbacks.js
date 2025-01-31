
class StorageCallbacks {
	constructor(args, fget, fset, fdel) {
		this.args = args;
		this.fget = fget;// async func(args, key)
		this.fset = fset;// async func(args, key, obj)
		this.fdel = fdel;// async func(args, key)
	}
};

