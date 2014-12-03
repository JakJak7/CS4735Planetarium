if (!Date.now) {
	Date.now = function() { return new Date().getTime(); };
}

(function(ycl) {
	var isArray = Array.isArray
	function isPlainObject(obj) {
		return Object.prototype.toString.call(obj) === "[object Object]"
	}
	
	function extend() {
		var other, name, srcDatum, newDatum, newIsArray,
			target = arguments[0] || {},
			deep = false,
			n = arguments.length,
			i = 1
		
		if (n === 1) {
			return extend(ycl, target)
		} else if (typeof target === "boolean") {
			deep = target
			target = arguments[i++] || {}
		}
		
		for (; i < n; ++i) {
			if ((other = arguments[i]) == null) continue;
			for (name in arguments[i]) {
				srcDatum = target[name]
				newDatum = other[name]
				
				if (
					deep && newDatum &&
					(isPlainObject(newDatum) ||
					(newIsArray = isArray(newDatum)))
				) {
					if (newIsArray) {
						srcDatum = srcDatum && isArray(srcDatum)
							? srcDatum : []
						newIsArray = false
					} else {
						srcDatum = srcDatum && isPlainObject(srcDatum)
							? srcDatum : {}
					}
					target[name] = extend(deep, srcDatum, newDatum)
				} else if (newDatum !== undefined) {
					target[name] = newDatum
				}
			}
		}
		return target
	}
	
	extend(ycl, {
		isArray: isArray,
		isPlainObject: isPlainObject,
		
		extend: extend
	})
})(window.ycl = {})