
class TaskQueue {
	task_ids = [];
	task_map = new Map();
	isRunning = false;
	num_added  = 0;
	num_done   = 0;
	num_failed = 0;
	timing_task = 0;
	timing_mass = 0;
	onChangeFunc = null;
	constructor(onChangeFunc) {
		this.onChangeFunc = onChangeFunc;
	}
	get timeLeftEstimate() { return this.timing_task * this.numTasksLeft * 0.001; }
	get numTasksLeft() { return this.task_ids.length; }
	get numTasks() { return { added: this.num_added, todo: this.numTasksLeft, done: this.num_done, failed: this.num_failed }; }
	get strTasks() {
		const {added, todo, done, failed} = this.numTasks;
		// TODO: add spans that change text color of each number when it is > 0
		return `${[todo, done, failed, added].map((n,i) => ["➝","✓","x","all:"][i]+" "+n).join(", ")}`
	}
	start()	{ if(!this.isRunning) this.run(); }
	stop()	{ this.isRunning = false; this.onChange(); }
	onChange() { if(this.onChangeFunc) this.onChangeFunc(); }
	async run() {
		this.isRunning = true;
		this.onChange();
		while(this.isRunning && this.task_ids.length > 0) {
			const id = this.task_ids.shift();
			const [func, args] = this.task_map.get(id);
			const t0 = Date.now();
			await func(args)
				 .then((val) => { this.num_done++;   this.onChange(); })
				.catch((err) => { this.num_failed++; this.onChange(); console.log(err); });
			const t1 = Date.now();
			this.timing_task = ((this.timing_task * this.timing_mass) + (t1 - t0)) / (this.timing_mass + 1.0);
			this.timing_mass = this.timing_mass * 0.9 + 1.0;
		}
		this.isRunning = false;
		this.onChange();
	}
	has(id) { return this.task_map.has(id); }
	add(id, async_func, args) {
		if(this.task_map.has(id)) return;// ignore duplicate task
		this.task_ids.push(id);
		this.task_map.set(id, [async_func, args]);
		this.num_added++;
		this.onChange();
	}
	rem(id) {
		this.task_ids = this.task_ids.filter(task_id => task_id !== id);
		this.task_map.delete(id);
		this.onChange();
	}
};

// Example Usage
/*
const queue = new TaskQueue_v2();
const task_status_task_map = new task_map();
const TASK_STATUS = {
	WAITING: "WAITING",
	WORKING: "WORKING",
	SUCCESS: "SUCCESS",
	FAILURE: "FAILURE",
};

async function test_task_func(args) {
	const [key, str, mode] = args;
	task_status_task_map.set(key, TASK_STATUS.WORKING);
	console.log("started", str, task_status_task_map);
	await new Promise((res, rej) => {
		if(mode === 0) setTimeout(() => res(str), 1000);
		if(mode === 1) setTimeout(() => rej(str), 1000);
	}).then(value => {
		task_status_task_map.set(key, TASK_STATUS.SUCCESS);
		console.log("success", value, task_status_task_map);
	}).catch(error => {
		task_status_task_map.set(key, TASK_STATUS.FAILURE);
		console.error("failure", error, task_status_task_map);
	});
}

function test_add_task(id, args) {
	const [key, str, mode] = args;
	task_status_task_map.set(key, TASK_STATUS.WAITING);
	queue.add(id, test_task_func, args);
}
test_add_task(1, [1, "1", 0]);
test_add_task(2, [2, "2", 1]);
test_add_task(3, [3, "3", 0]);
queue.start();
*/



