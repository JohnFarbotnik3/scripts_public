
if(false) {

function replace_function(obj, funcName, newFunc) {
	const origFuncName = "orig_" + funcName;
	if(!obj[origFuncName]) obj[origFuncName] = obj[funcName];
	obj[funcName] = newFunc;
}

function revert_function(obj, funcName) {
	const origFuncName = "orig_" + funcName;
	if(obj[origFuncName]) obj[funcName] = obj[origFuncName];
}

function logify_function(obj, funcName) {
	replace_function(obj, funcName, (...args) => {
		console.debug(funcName + " args: ", ...args);
		const origFuncName = "orig_" + funcName;
		const result = obj[origFuncName](...args);
		console.debug(funcName + " result: ", result);
		return result;
	});
}

logify_function(URL, "createObjectURL");
logify_function(URL, "revokeObjectURL");
logify_function(Response.prototype, "arrayBuffer");

}



