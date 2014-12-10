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
	
  var defineField = (function() {
    const descriptor = { value: null, enumerable: false}
    function defineField(obj, name, value, enumerable) {
      descriptor.value = value
      descriptor.enumerable = enumerable ? true : false
      return Object.defineProperty(obj, name, descriptor)
    }
    return defineField
  }())
  var defineAccessor = (function() {
    const descriptor = { get: null, set: null, enumerable: false}
    function defineAccessor(obj, name, get, set, enumerable) {
      if (typeof get !== "function") get = null
      if (typeof set !== "function") set = null
      if (!get && !set) throw new Error("Must define a getter or a setter.")
      descriptor.get = get
      descriptor.set = set
      descriptor.enumerable = enumerable ? true : false
      return Object.defineProperty(obj, name, descriptor)
    }
    return defineField
  }())
	
	extend(ycl, {
		isArray: isArray,
		isPlainObject: isPlainObject,
		
		defineField: defineField,
		defineAccessor: defineAccessor,
		
		extend: extend
	})
})(window.ycl = {})
