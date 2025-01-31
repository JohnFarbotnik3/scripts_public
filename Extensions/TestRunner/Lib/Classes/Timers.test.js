
function test_Timers_1() {
	function testfunc(args, value) { console.log("args, value: ", args, value); }
	const tmt = new Timeout(1300, {args:"tmt", func:testfunc});
	const itv = new Interval(500, {args:"itv", func:testfunc});
	setTimeout(() => { tmt.clear(); itv.clear(); }, 2900);
}
function test_Timers_2() {
	function testfunc(args, value) { console.log("args, value: ", args, value); }
	const thr = new Throttle(1000, {args:"tgr", func:testfunc});
	const deb = new Debounce(1000, {args:"deb", func:testfunc});
	let counter = 0;
	let t0 = Date.now();
	let t2 = Date.now() + 5000;
	let itv = setInterval(() => {
		const t1 = Date.now();
		if(t1 > t2) clearInterval(itv);
		deb.trigger(t1 - t0);
		thr.trigger(t1 - t0);
	}, 50);
}
function test_Timers() {
	setTimeout(test_Timers_1, 0);
	setTimeout(test_Timers_2, 5000);
}

