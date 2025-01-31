
/*
	Estimators for predicting the change in size caused by setting or deleting values
*/
class SizeEstimators {
	static json(key, valueBefore, valueAfter) {
		//console.log("json", key, valueBefore, valueAfter);
		const t0 = valueBefore !== undefined;
		const t1 = valueAfter  !== undefined;
		const sk = JSON.stringify(key).length;
		const s0 = t0 ? JSON.stringify(valueBefore).length : 0;
		const s1 = t1 ? JSON.stringify(valueAfter ).length : 0;
		if( t0 &&  t1) return s1 - s0;		// value changed
		if(!t0 &&  t1) return +(sk + s1);	// value created
		if( t0 && !t1) return -(sk + s0);	// value deleted
		if(!t0 && !t1) return 0;			// no value
	}
};

