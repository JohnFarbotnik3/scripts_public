
class FilterMap {
	constructor(filterFunc) {
		this.map = new Map();
		this._state = 0;				// counter used for change detection
		this.filterFunc = filterFunc;	// func(key, value) -> bool
	}
	// operations
	get state() { return this._state; }
	has(key) { return this.map.has(key); }
	get(key) { return this.map.get(key); }
	set(key, val) {
		if(this.map.get(key) === val) return;// skip is value is the same
		const cond = this.filterFunc(key, val);
		if(cond) {
			this.map.set(key, val);
			this._state++;
		}
		// if new value would fail condition, remove from map
		if(!cond && this.map.has(key)) this.delete(key);
	}
	delete(key) {
		if(this.map.has(key)) {
			this.map.delete(key);
			this._state++;
		}
	}
	// iterators
	get size() { return this.map.size; }
	keys	() { return this.map.keys(); }
	values	() { return this.map.values(); }
	entries	() { return this.map.entries(); }
};

class FilterConditionList {
	constructor(conditions) {
		this.conditions	= conditions;// [attribute, operation, operand1, operand2][]
	}
	concat(list) {
		const newlist = new FilterConditionList([]);
		for(const [at,op,v1,v2] of this.conditions) newlist.conditions.push([at,op,v1,v2]);
		for(const [at,op,v1,v2] of list.conditions) newlist.conditions.push([at,op,v1,v2]);
		return newlist;
	}
	static OPERATIONS = ({
		EQS:	0,
		EQV:	1,
		INC:	2,
		LTH:	3,
		GTH:	4,
		LEQ:	5,
		GEQ:	6,
		BTW:	7,
		AND:	8,
	});
	evaluate(value) {
		for(const [attribute, op, v1, v2] of this.conditions) {
			const x = (attribute !== null) ? value[attribute] : value;
			let result = true;
			const OPS = FilterConditionList.OPERATIONS;
			//console.log("evaluate", attribute, op, v1, v2, value, x);
			if(op === OPS.EQS) result = x === v1;
			if(op === OPS.EQV) result = x ==  v1;
			if(op === OPS.INC) result = x.includes(v1);
			if(op === OPS.LTH) result = x <   v1;
			if(op === OPS.GTH) result = x >   v1;
			if(op === OPS.LEQ) result = x <=  v1;
			if(op === OPS.GEQ) result = x >=  v1;
			if(op === OPS.BTW) result = (v1 <= x) & (x <= v2);
			if(op === OPS.AND) result = (x & v1) === v2;
			if(!result) return false;
		}
		return true;
	}
};

class FilterConditionMap extends FilterMap {
	constructor(keyType="STRING", keyConditions=null, valType="OBJECT", valConditions=null) {
		super(null);
		this.filterFunc		= this.filterByConditions;
		this.keyConditions	= typecast(keyConditions, FilterConditionList);
		this.valConditions	= typecast(valConditions, FilterConditionList);
		this.keyType 		= keyType;// "STRING" | "JSON"
		this.valType		= valType;// "OBJECT" | "JSON"
	}
	get hasKeyConditions() { return this.keyConditions; }
	get hasValConditions() { return this.valConditions; }
	filterByConditions(key, val) {
		let result = true;
		if(this.keyType === "JSON") key = JSON.parse(key);
		if(this.valType === "JSON") val = JSON.parse(val);
		if(this.keyConditions) result &= this.keyConditions.evaluate(key);
		if(this.valConditions) result &= this.valConditions.evaluate(val);
		return result;
	}
};



