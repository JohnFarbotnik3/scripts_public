
function try_until_result(func, args, time, attempts=30) {
	return new Promise((resolve,rej) => {
		const itv = setInterval(() => {
			if(attempts <= 0) {
				rej("<> failed to resolve with truthy value");
				clearInterval(itv);
			}
			const value = func(args);
			if(value) {
				resolve(value);
				clearInterval(itv);
			}
			attempts--;
		}, time);
	});
}

async function await_all(promises) {
	let arr = [];
	for(const prom of promises) arr.push(await prom);
	return arr;
}



