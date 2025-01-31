
// ========================================================
// map
// ========================================================

function map_to_str(map) { return JSON.stringify([...map.entries()]); }
function str_to_map(str) { return new Map(JSON.parse(str)); }
async function map_to_b64(map) { return await encode_str_to_b64(map_to_str(map)); }
async function b64_to_map(b64) { return str_to_map(await decode_b64_to_str(b64)); }

// ========================================================
// set
// ========================================================

function set_to_str(set) { return JSON.stringify([...set.keys()]); }
function str_to_set(str) { return new Set(JSON.parse(str)); }
async function set_to_b64(set) { return await encode_str_to_b64(set_to_str(set)); }
async function b64_to_set(b64) { return str_to_set(await decode_b64_to_str(b64)); }



