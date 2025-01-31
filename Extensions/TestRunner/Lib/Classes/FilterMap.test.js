
function test_FilterMap() {
	console.clear();
	const func = (key, val) => val?.prime === 1;
	let map = new FilterMap(func);
	const pairs = [
		[0, {name: "ABC_0", prime: 0, flags: 1}],
		[1, {name: "ABC_1", prime: 1, flags: 2}],
		[2, {name: "ABC_2", prime: 1, flags: 0}],
		[3, {name: "ABC_3", prime: 1, flags: 1}],
		[4, {name: "ABC_4", prime: 0, flags: 4}],
		[5, {name: "ABC_5", prime: 1, flags: 3}],
		[6, {name: "ABC_6", prime: 0, flags: 1}],
		[7, {name: "ABC_7", prime: 1, flags: 0}],
		[8, {name: "ABC_8", prime: 0, flags: 2}],
		[9, {name: "ABC_9", prime: 0, flags: 1}],
	];
	for(const [k,v] of pairs) map.set(k,v);
	for(const [k,v] of map.entries()) console.log("pair", [k,v]);
	// test filter condition list
	const OP = FilterConditionList.OPERATIONS;
	const fclkey   = new FilterConditionList([[null		, OP.GEQ	, 4, 0]]);
	const fclname  = new FilterConditionList([["name"	, OP.BTW	, "ABC_2", "ABC_6"]]);
	const fclprime = new FilterConditionList([["prime"	, OP.EQS	, 1, 0]]);
	const fclflag1 = new FilterConditionList([["flags"	, OP.AND	, 1, 0]]);
	const fclflag2 = new FilterConditionList([["flags"	, OP.NAND	, 2, 0]]);
	const fclflag3 = new FilterConditionList([["flags"	, OP.AND	, 3, 0]]);
	map = new FilterConditionMap("STRING", fclkey, "OBJECT", null);
	for(const [k,v] of pairs) map.set(k,v);
	console.log("fclkey", map.map);
	map = new FilterConditionMap("STRING", null, "OBJECT", fclname );
	for(const [k,v] of pairs) map.set(k,v);
	console.log("fclname", map.map);
	map = new FilterConditionMap("STRING", null, "OBJECT", fclflag1);
	for(const [k,v] of pairs) map.set(k,v);
	console.log("fclflag1", map.map);
	map = new FilterConditionMap("STRING", null, "OBJECT", fclflag2);
	for(const [k,v] of pairs) map.set(k,v);
	console.log("fclflag2", map.map);
	map = new FilterConditionMap("STRING", null, "OBJECT", fclflag3);
	for(const [k,v] of pairs) map.set(k,v);
	console.log("fclflag3", map.map);
	map = new FilterConditionMap("STRING", null, "OBJECT", fclprime);
	for(const [k,v] of pairs) map.set(k,v);
	console.log("fclprime", map.map);
	map = new FilterConditionMap("STRING", fclkey, "OBJECT", fclname.concat(fclflag1));
	for(const [k,v] of pairs) map.set(k,v);
	console.log("fclkey, fclname, fclflag1", map.map);
	map = new FilterConditionMap("JSON", fclkey, "JSON", fclname.concat(fclflag1));
	for(const [k,v] of pairs) map.set(JSON.stringify(k),JSON.stringify(v));
	console.log("fclkey, fclname, fclflag1 (JSON)", map.map);
}



