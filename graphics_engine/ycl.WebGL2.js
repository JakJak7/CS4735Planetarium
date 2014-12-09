if (!Math.degToRad) Math.degToRad = function(angle) {
	return (angle * Math.PI) / 180
}
if (!Math.radToDeg) Math.radToDeg = function(angle) {
	return (angle * 180) / Math.PI
}
Math.PI2 = Math.PI * 2
Math.PI_2 = Math.PI / 2

window.requestAnimFrame = (function() {
	return window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		window.oRequestAnimationFrame ||
		window.msRequestAnimationFrame ||
		function(callback, element) {
			window.setTimeout(callback, 1000 / 60)
		}
})()

ycl.extend(ycl.WebGL2 || (ycl.WebGL2 = {}), (function() {
	const API = WebGLRenderingContext.prototype
	const API_inv = (function() {
		var ret = {}
		for (var name in API) {
			ret[API[name]] = name
		}
	}())
	const uniformHandlers = (function() {
		function uniform1f(handle, value) {
			if(value.length) {
				this.uniform1fv(handle, value)
			} else {
				this.uniform1f(handle, value)
			}
		}
		function uniform1i(handle, value) {
			if (value.length) {
				this.uniform1iv(handle, value)
			} else {
				this.uniform1i(handle, value)
			}
		}
		function uniformMatrix2fv(handle, value) {
			this.uniformMatrix2fv(handle, false, value)
		}
		function uniformMatrix3fv(handle, value) {
			this.uniformMatrix3fv(handle, false, value)
		}
		function uniformMatrix4fv(handle, value) {
			this.uniformMatrix4fv(handle, false, value.current || value)
		}
		return {
			API.INT       : uniform1f,
			API.FLOAT     : uniform1f,
			API.FLOAT_VEC2: API.uniform2f,
			API.FLOAT_VEC3: API.uniform3f,
			API.FLOAT_VEC4: API.uniform4f,
			API.INT_VEC2  : API.uniform2i,
			API.INT_VEC3  : API.uniform3i,
			API.INT_VEC4  : API.uniform4i,
			API.BOOL      : uniform1i,
			API.BOOL_VEC2 : API.uniform2i,
			API.BOOL_VEC3 : API.uniform3i,
			API.BOOL_VEC4 : API.uniform4i,
			API.FLOAT_MAT2: uniformMatrix2fv,
			API.FLOAT_MAT3: uniformMatrix3fv,
			API.FLOAT_MAT4: uniformMatrix4fv,
			API.SAMPLER_2D  : uniform1i,
			API.SAMPLER_CUBE: uniform1i
		}
	}())
	const optionHandlers = (function() {
		function cullFace(gl, value) {
			if (!value || typeof value === "boolean") {
				setOption(gl, API.CULL_FACE, value)
			} else {
				gl.cullFace(value)
			}
		}
		function enableSetter(flag) {
			return function(gl, value) { setOption(gl, flag, value) }
		}
		return {
			blend: enableSetter(API.BLEND),
			blendEquation: function(gl, value) {
				gl.blendEquation(value)
			},
			blendFunc: function(gl, value) {
				if (value.length === 2) {
					gl.blendFunc(value[0], value[1])
				} else if (value.length === 4) {
					gl.blendFuncSeparate(
						value[0], value[1], value[2], value[3]
					)
				} else {
					throw new Error("Invalid value provided to blendFunc")
				}
			}
			clearColor: function(gl, value) {
				gl.clearColor(value[0], value[1], value[2], value[3])
			},
			depthTest: enableSetter(API.DEPTH_TEST),
			cullFace: cullFace,
			polygonOffsetFill: enableSetter(API.POLYGON_OFFSET_FILL),
			scissorTest: enableSetter(API.SCISSOR_TEST),
			viewport: function(gl, value) {
				gl.viewport(value[0], value[1], value[2], value[3])
			}
		}
	}())
	
	const nullValue = { value: null }
	const trueValue = { value: true }
	const objProtoValue = { value: ycl_WebGLObject.__proto__ }
	
	// Base of all prototypes defined in this library
	function ycl_WebGLObject() {
	}
	Object.defineProperties(ycl_WebGLObject.prototype, {
		__proto__: nullValue
	})
	//{ WebGLObject Functions
	//}
	
	// WebGLRenderingContext wrapper
	function ycl_WebGLContext(canvas) {
		const handle = canvas.getContext("experimental-webgl")
		Object.defineProperties(this, {
			gl: { value: this },
			handle: { value: handle }
		})
	}
	Object.defineProperties(ycl_WebGLContext.prototype, {
		__proto__: objProtoValue,
		// properties
		aspect: {
			get: WebGLContext_aspect_get
		},
		canvas: {
			get: WebGLContext_canvas_get
		},
		requestedWidth: {
			get: WebGLContext_requestedWidth_get,
			set: WebGLContext_requestedWidth_set
		}
		requestedHeight: {
			get: WebGLContext_requestedHeight_get,
			set: WebGLContext_requestedHeight_set
		},
		width: {
			get: WebGLContext_width_get
		},
		height: {
			get: WebGLContext_height_get
		},
		program: {
			get: WebGLProgram_program_get,
			set: WebGLProgram_program_set
		},
		blendEnabled: create_glParameter(API.BLEND),
		depthTestEnabled: create_glParamater(API.DEPTH_TEST),
		cullFaceEnabled: create_glParameter(API.CULL_FACE),
		polygonOffsetFillEnabled: create_glParameter(API.polygonOffsetFill),
		scissorTestEnabled: create_glParameter(API.SCISSOR_TEST),
		blendMode: {
			get: WebGLContext_blendMode_get,
			set: WebGLContext_blendMode_set
		},
		viewport: {
			get: WebGLContext_viewport_get,
			set: WebGLContext_viewport_set
		},
		clearValues: {
			get: WebGLContext_clearValues_get,
			set: WebGLContext_clearValues_set
		},
		depthMode: {
			get: WebGLContext_depthMode_get,
			set: WebGLContext_depthMode_set
		},
		lineWidth: {
			get: WebGLContext_lineWidth_get,
			set: WebGLContext_lineWidth_set
		},
		polygonOffsetFill: {
			get: WebGLContext_polygonOffset_get,
			set: WebGLContext_polygonOffset_set
		},
		stencilMode: {
			get: WebGLContext_stencilMode_get,
			set: WebGLContext_stencilMode_set
		}
		
		// methods
		createProgram: {
			value: WebGLContext_createProgram
		},
		createProgramFromHTML: {
			value: WebGLContext_createProgramFromHTML
		}
		createShader: {
			value: WebGLContext_createShader
		},
		createShaderFromHTML: {
			value: WebGLContext_createShaderFromHTML
		}
		
		createVertexBuffer: {
			value: WebGLContext_createVertexBuffer
		},
		createIndexedBuffer: {
			value: WebGLContext_createIndexedBuffer
		}
	})
	//{ WebGLContext Functions
	// properties
	function WebGLContext_aspect_get() {
		const canvas = this.canvas
		return canvas.width / canvas.height
	}
	function WebGLContext_canvas_get() {
		return this.handle.canvas
	}
	function WebGLContext_width_get() {
		return this.handle.drawingBufferWidth
	}
	function WebGLContext_height_get() {
		return this.handle.drawingBufferHeight
	}
	function WebGLContext_requestedWidth_get() {
		return this.canvas.width
	}
	function WebGLContext_requestedWidth_set(value) {
		this.canvas.width = value
	}
	function WebGLContext_requestedHeight_get() {
		return this.canvas.height
	}
	function WebGLContext_requestedHeight_set(value) {
		this.canvas.width = height
	}
	function WebGLContext_program_get() {
		return this.handle.getParameter(API.CURRENT_PROGRAM)
	}
	function WebGLContext_program_set(program) {
		this.handle.useProgram(program)
	}
	function WebGLContext_blendMode_get() {
		const gl = this.handle
		return {
			enabled: gl.getParameter(API.BLEND),
			color: gl.getParameter(API.BLEND_COLOR),
			dstAlpha: gl.getParameter(API.BLEND_DST_ALPHA),
			dstRGB: gl.getParameter(API.BLEND_DST_RGB),
			equationAlpha: gl.getParameter(API.BLEND_EQUATION_ALPHA),
			equationRGB: gl.getParameter(API.BLEND_EQUATION_RGB),
			srcAlpha: gl.getParameter(API.BLEND_SRC_ALPHA),
			srcRGB: gl.getParameter(API.BLEND_SRC_RGB),
		}
	}
	function WebGLContext_blendMode_set(value) {
		const gl = this.handle
		var param
		if ((param = value.enabled) !== undefined) {
			this.blendEnabled = param;
		}
		if ((param = value.color) !== undefined) {
			gl.blendColor(param[0], param[1], param[2], param[3])
		}
		if ((param = value.blendEquation) != undefined) {
			if (!param.length) {
				gl.blendEquation(param)
			} else if (param.length == 1) {
				gl.blendEquation(param[0])
			} else if (param.length == 2) {
				gl.blendEquation(param[0], [1])
			} else {
				throw new Exception("Invalid parameter: blendEquation.")
			}
		}
		if ((param = value.Func) !== undefined) {
			if (param.length == 2) {
				gl.blendFunc(param[0], param[1])
			} else if (param.length == 4) {
				gl.blendFuncSeparate(
					param[0], param[1], param[2], param[3]
				)
			}
		}
	}
	function WebGLContext_viewport_get() {
		return this.handle.getParameter(API.VIEWPORT)
	}
	function WebGLContext_viewport_set(value) {
		this.handle.viewport(value[0], value[1], value[2], value[3])
	}
	
	function WebGLContext_clearValues_get() {
		const gl = this.handle
		return {
			color: gl.getParameter(API.COLOR_CLEAR_VALUE),
			depth: gl.getParameter(API.DEPTH_CLEAR_VALUE),
			stencil: gl.getParameter(API.STENCIL_CLEAR_VALUE)
		}
	}
	function WebGLContext_clearValues_set(value) {
		const gl = this.handle
		var param
		if ((param = value.color) !== undefined) {
			gl.clearColor(param[0], param[1], param[2], param[3])
		}
		if ((param = value.depth) != undefined) {
			gl.clearDepth(param)
		}
		if ((param = value.stencil) != undefined) {
			gl.clearStencil(param)
		}
	}
	function WebGLContext_depthMode_get() {
		const gl = this.handle
		return {
			bits: gl.getParameter(API.DEPTH_BITS),
			clear: gl.getParameter(API.DEPTH_CLEAR_VALUE),
			func: gl.getParameter(API.DEPTH_FUNCTION),
			range: gl.getParameter(API.DEPTH_RANGE),
			test: gl.getParameter(API.DEPTH_TEST),
			mask: gl.getParameter(API.DEPTH_WRITEMASK)
		}
	}
	function WebGLContext_depthMode_set(value) {
		const gl = this.handle
		var param
		if ((param = value.clear) != undefined) {
			gl.clearDepth(param)
		}
		if ((param = value.func) !== undefined) {
			gl.depthFunc(param)
		}
		if ((param = value.mask) != undefined) {
			gl.depthMask(param)
		}
		if ((param = value.range) != undefined) {
			gl.depthRange(value[0], value[1])
		}
	}
	function WebGLContext_lineWidth_get() {
		return this.handle.getParameter(API.LINE_WIDTH)
	}
	function WebGLContext_lineWidth_set(value) {
		this.handle.lineWidth(value)
	}
	function WebGLContext_polygonOffset_get() {
		const gl = this.handle
		return {
			enabled: gl.getParameter(POLYGON_OFFSET_FILL),
			factor: gl.getParameter(POLYGON_OFFSET_FACTOR),
			units: gl.getParameter(POLYGON_OFFSET_UNITS)
		}
	}
	function WebGLContext_polygonOffset_set(value) {
		const gl = this.handle
		var param
		if ((param = value.enable) != undefined) {
			setOption(gl, API.POLYGON_OFFSET_FILL, param)
		}
		if (value.factor !== undefined || value.units !== undefined) {
			gl.depthRange(
				value.factor !== undefined
					? value.factor
					: gl.getParameter(API.POLYGON_OFFSET_FACTOR),
				value.units !== undefined
					? value.units
					: gl.getParameter(API.POLYGON_OFFSET_UNITS)
			)
		}
	}
	function WebGLContext_stencilMode_get() {
		const gl = this.handle
		return {
			backFail: gl.getParameter(STENCIL_BACK_FAIL),
			backFunc: gl.getParameter(STENCIL_BACK_FUNC),
			backPassDepthFail: gl.getParameter(STENCIL_BACK_PASS_DEPTH_FAIL),
			backPassDepthPass: gl.getParameter(STENCIL_BACK_PASS_DEPTH_PASS),
			backRef: gl.getParameter(STENCIL_BACK_REF),
			backValueMask: gl.getParameter(STENCIL_BACK_VALUE_MASK),
			backMask: gl.getParameter(STENCIL_BACK_WRITEMASK),
			bits: gl.getParameter(STENCIL_BITS),
			clearValue: gl.getParameter(STENCIL_CLEAR_VALUE),
			fail: gl.getParameter(STENCIL_FAIL),
			func: gl.getParameter(STENCIL_FUNC),
			passDepthFail: gl.getParameter(STENCIL_PASS_DEPTH_FAIL),
			passDepthPass: gl.getParameter(STENCIL_PASS_DEPTH_PASS),
			ref: gl.getParameter(STENCIL_REF),
			test: gl.getParameter(STENCIL_TEST),
			valueMask: gl.getParameter(STENCIL_VALUE_MASK),
			mask: gl.getParameter(STENCIL_WRITEMASK)
		}
	}
	function WebGLContext_stencilMode_set(value) {
		throw new Engine("Not implemented.")
	}
	
	function WebGLContext_setOptions(options) {
		for (var name in options) {
			setOption(this.handle, API[name], options[name])
		}
	}
	
	// private static
	function setOption(gl, flag, value) {
		(value
			? API.enable
			: API.disable
		).call(gl, flag)
	}
	function create_glParameter(flag) {
		return {
			get: function() { this.handle.getParameter(flag) },
			set: function(value) { setOption(this.handle, flag, value) }
		}
	}
	
	// methods
	function WebGLContext_clear(flags) {
		this.handle.clear(flags)
	}
	function WebGLContext_clearAll(color, depth, stencil) {
		const gl = this.handle
		if (color != undefined) {
			gl.clearColor(color[0], color[1], color[2], color[3])
		}
		if (depth != undefined) {
			gl.clearDepth(depth)
		}
		if (stencil != undefined) {
			gl.clearStencil(stencil)
		}
		gl.clear(
			API.DEPTH_BUFFER_BIT |
			API.STENCIL_BUFFER_BIT |
			API.COLOR_BUFFER_BIT
		)
	}
	function WebGLContext_cullFront() {
		const gl = this.handle
		gl.enable(API.CULL_FACE)
		gl.cullFace(API.FRONT)
	}
	function WebGLContext_cullBack() {
		const gl = this.handle
		gl.enable(API.CULL_FACE)
		gl.cullFace(API.BACK)
	}
	
	function WebGLContext_createProgram(vSource, fSource, vertexAttribName) {
		return new ycl_WebGLProgram(
			this,
			WebGLContext_createShader.call(
				this, API.VERTEX_SHADER, vSource, vertexAttribName
			),
			WebGLContext_createShader.call(
				this, API.FRAGMENT_SHADER, fSource
			)
		)
	}
	function WebGLContext_createProgramFromHTML(vId, fId) {
		return new ycl_WebGLProgram(
			this,
			WebGLContext_createShaderFromHTML.call(this, vId),
			WebGLContext_createShaderFromHTML.call(this, fId)
		)
	}
	function WebGLContext_createShader(type, source, vertexAttribName) {
		const gl = this.handle
		const shader = gl.createShader(type)
		
		gl.shaderSource.call(shader, source)
		gl.compileShader.call(shader)
		if (!gl.getShaderParameter(shader, API.COMPILE_STATUS) {
			throw new Error(gl.getShaderInfoLog(shader))
		}
		if (vertexAttribName) {
			shader.vertexAttribName = vertexAttribName
		}

		return shader
	}
	function WebGLContext_createShaderFromHTML(id, vertexAttributeName) {
		var type, source, node, vertexAttribName
		const shader = document.getElementById(id)
		if (!shader) {
			throw new Error("Script element \"" + id + "\" not found!")
		}
		if (shader.nodeName != "SCRIPT") {
			throw new Error("Shader must be contained in a SCRIPT tag!")
		}
		
		// determine the type of shader to load
		if (shader.type == "x-shader/x-fragment") {
			type = API.FRAGMENT_SHADER
		} else if (shader.type == "x-shader/x-vertex") {
			vertexAttribName = shader.dataset.vertexAttribName
				|| vertexAttribName
			type = API.VERTEX_SHADER
		} else {
			throw new Error("Invalid type attribute on script!")
		}
		
		// extract text from the original HTML node
		source = ""
		if (node = shader.firstChild) {
			do {
				if (node.nodeType == 3) {
					source += node.textContent
				}
				node = node.nextSibling
			} while (node)
		}
		
		return WebGLContext_createShader.call(this,
			type, source, vertexAttribName
		)
	}
	function WebGLContext_createVertexBuffer(geometryType, data) {
		return new ycl_WebGLVertexBuffer(this, geometryType, data)
	}
	function WebGLContext_createIndexedBuffer(geometryType, indices, data) {
		return new ycl_WebGLIndexedBuffer(
			this, indices, vertices, geometryType
		)
	}
	function WebGLContext_createFrameBuffer(width, height) {
		if (!width) width = this.width
		if (!height height = this.height
		const gl = this.handle
		// create color texture
		const colorTexture = gl.createTexture()
		gl.bindTexture(API.TEXTURE_2D, colorTexture)
		gl.texParameteri(API.TEXTURE_2D, API.TEXTURE_MAG_FILTER, API.NEAREST)
		gl.texParameteri(API.TEXTURE_2D, API.TEXTURE_MIN_FILTER, API.NEAREST)
		gl.texParameteri(API.TEXTURE_2D, API.TEXTURE_WRAP_S, API.CLAMP_TO_EDGE)
		gl.texParameteri(API.TEXTURE_2D, API.TEXTURE_WRAP_T, API.CLAMP_TO_EDGE)
		gl.texImage2D(
			API.TEXTURE_2D, 0,
			API.RGBA, width, height, 0,
			API.RGBA, API.UNSIGNED_BYTE, null
		)
		
		// create framebuffer
		const frameBuffer = gl.createFramebuffer()
		gl.bindFramebuffer(API.FRAMEBUFFER, frameBuffer)
		gl.framebufferTexture2D(
			API.FRAMEBUFFER,
			API.COLOR_ATTACHMENT0,
			API.TEXTURE_2D,
			colorTexture,
			0
		)
		
		// create renderbuffer
		const depthBuffer = gl.createRenderbuffer()
		gl.bindRenderbuffer(API.RENDERBUFFER, depthBuffer)
		
		// allocate renderbuffer
		gl.renderbufferStorage(
			API.RENDERBUFFER, API.DEPTH_COMPONENT16, width, height
		)
		if (gl.checkFramebufferStatus(API.FRAMEBUFFER) != API.FRAMEBUFFER_COMPLETE) {
			throw new Error(
				"This combination of attachments does not work."
			)
		}
	}
	//}
	
	function ycl_WebGLProgram(ycl_gl, vertexShader, fragmentShader, vertexAttribName) {
		var i
		const gl = ycl_gl.handle
		const program = API.createProgram.call(gl)
		
		// link the program
		API.attachShader.call(gl, program, vertexShader)
		API.attachShader.call(gl, program, fragmentShader)
		API.linkProgram.call(gl, program)
		if (!API.getProgramParameter.call(gl, program, API.LINK_STATUS)) {
			throw new Error(API.getProgramInfoLog.call(gl, program))
		}
		
		// populate locations and freeze it
		const locations = {}
		i = API.getProgramParameter.call(gl,
			program, API.ACTIVE_ATTRIBUTES
		)
		while (--i >= 0) {
			const location = API.getActiveAttrib.call(gl, program, i)
			API.enableVertexAttribArray.call(gl, i)
			locations[location.name] = new ycl_Attribute(
				ycl_gl, program, location, i
			)
		}
		const vertexAttrib = locations[
			vertexShader.vertexAttribName ||
			fragmentShader.vertexAttribName ||
			vertexAttribName
		]
		if (!vertexAttrib) {
			throw new Error(
				"Vertex attribute \"" +
				vertexAttribName +
				"\" does not exist."
			)
		}
		i = API.getProgramParameter.call(gl,
			program, API.ACTIVE_UNIFORMS
		)
		while (--i >= 0) {
			const location = API.getActiveUniform.call(gl, program, i)
			locations[location.name] = new ycl_Uniform(
				ycl_gl, program, location, i
			)
		}
		Object.freeze(locations)
		
		// define properties
		Object.defineProperties(this, {
			gl: { value: ycl_gl },
			locations: { value: locations },
			vertexAttrib: { value: vertexAttrib }
		})
	}
	Object.defineProperties(ycl_WebGLProgram.prototype, {
		__proto__: objProtoValue,
		// methods
		getUniform: {
			value: WebGLProgram_getUniform
		},
		setUniform: {
			value: WebGLProgram_setUniform
		},
		getAttribLocation: {
			value: WebGLProgram_getAttribLocation
		},
		getUniformLocation: {
			value: WebGLProgram_getUniformLocation
		},
		registerAttribute: {
			value: WebGLProgram_registerAttribute
		},
		registerUniform: {
			value: WebGLProgram_registerUniform
		},
		use: {
			value: WebGLProgram_use
		}
	})
	//{ WebGLProgram Functions
	// methods
	function WebGLProgram_getAttribLocation(attribName) {
		var location = this.locations[attribName]
		if (!location) {
			throw new Error("Attribute \"" + attribName + "\" not found.")
		}
		if (!location.isAttribute) {
			throw new Error("\"" + attribName + "\" is not a attribute.")
		}
		return location.index
	}
	function WebGLProgram_getUniformLocation(uniformName) {
		var location = this.locations[uniformName]
		if (!location) {
			throw new Error("Uniform \"" + uniformName + "\" not found.")
		}
		if (!location.isUniform) {
			throw new Error("\"" + uniformName + "\" is not a uniform.")
		}
		return location.handle
	}
	function WebGLProgram_getUniform(uniformName) {
		var location = this.locations[uniformName]
		if (!location) {
			throw new Error("Uniform \"" + uniformName + "\" not found.")
		}
		if (!location.isUniform) {
			throw new Error("\"" + uniformName + "\" is not a uniform.")
		}
		return this.gl.handle.getUniform(this.handle, location.handle)
	}
	function WebGLProgram_setUniform(uniformName, value) {
		var location = this.locations[uniformName]
		if (!location) {
			throw new Error("Uniform \"" + uniformName + "\" not found.")
		}
		if (!location.isUniform) {
			throw new Error("\"" + uniformName + "\" is not a uniform.")
		}
		location.value = value
	}
	function WebGLProgram_registerAttribute(attribName, alias) {
		if (!attribName) {
			throw new Error("Must specify an attribute name.")
		}
		const name = alias || attribName
		if (name in this) {
			throw new Error("Name \"" + name + "\" already in use.")
		}
		
		const location = locations[attribName]
		if (!location) {
			throw new Error("Attribute \"" + attribName + "\" not found.")
		}
		if (!location.isAttribute) {
			throw new Error("\"" + attribName + "\" is not a attribute.")
		}
		Object.defineProperty(this, name, { value: location })
	}
	function WebGLProgram_registerUniform(uniformName, alias) {
		if (!uniformName) {
			throw new Error("Must specify a uniform name.")
		}
		const name = alias || uniformName
		if (name in this) {
			throw new Error("Name \"" + name + "\" already in use.")
		}
		
		const location = locations[uniformName]
		if (!location) {
			throw new Error("Uniform \"" + uniformName + "\" not found.")
		}
		if (!location.isUniform) {
			throw new Error("\"" + uniformName + "\" is not a uniform.")
		}
		Object.defineProperty(this, name, { value: location })
	}
	function WebGLProgram_use() {
		this.gl.handle.useProgram(this.handle)
	}
	function WebGLProgram_setUniforms(uniforms) {
		for (name in uniforms) {
			this.locations[name].value = uniforms[name]
		}
	}
	function WebLProgram_setAttributes(attributes) {
		for (name in attributes) {
			this.locations[name].pointer = attributes[name]
		}
	}
	function WebGLProgram_draw(geometry, attributes, uniforms) {
		if (attributes) {
			WebGLProgram_setAttributes.call(this, attributes)
		}
		if (uniforms) {
			WebGLProgram_setAttributes.call(this, attributes)
		}
		if (geometry.isIndexed) {
			this.vertexAttrib.pointer = geometry.vertices
			geometry.indices.bind()
			this.gl.handle.drawElements(
				geometry.geometryType,
				geometry.indexCount,
				geometry.indexType,
				0
			)
		} else {
			this.vertexAttrib.pointer = geometry
			this.gl.handle.drawArray(
				geometry.itemType, 0, geometry.itemCount
			)
		}
	}
	//}
	
	function ycl_WebGLBuffer(ycl_gl, bufferType, dataType, data, size) {
		const gl = ycl_gl.handle
		const buffer = gl.createBuffer()
		const length = data.length
		const count = data.length / size
		if (length < size) {
			throw new Error("Must contain at least one item.")
		}
		if (length % size != 0) {
			throw new Error("Must only contain whole items.")
		}
		gl.bindBuffer(bufferType, buffer)
		gl.bufferData(bufferType, data, API.STATIC_DRAW)
		
		return Object.defineProperties(this, {
			gl: { value: ycl_gl },
			handle: { value: buffer },
			type: { value: bufferType },
			itemSize: { value: size },
			itemCount: { value: count },
			dataType: { value: dataType }
		})
	}
	Object.defineProperties(ycl_WebGLBuffer.prototype, {
		__proto__: objProtoValue,
		// methods
		bind: {
			value: WebGLBuffer_bind
		}
	})
	//{ WebGLBuffer Functions
	// methods
	function WebGLBuffer_bind() {
		this.gl.handle.bindBuffer(this.type, this.handle)
	}
	//}
	
	function ycl_WebGLVertexBuffer(ycl_gl, itemType, data) {
		ycl_WebGLBuffer.call(this, ycl_gl,
			API.ARRAY_BUFFER, API.FLOAT,
			data instanceof Float32Array
				? data : new Float32Array(data),
			3
		)
		Object.defineProperties(this, {
			itemType: { value: itemType }
		})
	}
	Object.defineProperties(ycl_WebGLVertexBuffer.prototype, {
		__proto__: { value: ycl_WebGLBuffer.__proto__ }
	})
	//{ WebGLBuffer Functions
	//}
	
	function ycl_WebGLIndexedBuffer(ycl_gl, indices, vertices, geometryType) {
		const dataType = API.UNSIGNED_SHORT
		const indexBuffer = new ycl_WebGLBuffer(ycl_gl,
			API.ELEMENT_ARRAY_BUFFER, dataType,
			indices instanceof UInt16Array
				? indices : new UInt16Array(indices),
			1
		)
		const vertexBuffer = new ycl_WebGLVertexBuffer(ycl_gl,
			geometryType,
			vertices instanceof Float32Array
				? vertices : new Float32Array(vertices),
			3
		)
		
		return Object.defineProperties(this, {
			indices: { value: indexBuffer },
			vertices: { value: vertexBuffer }
		})
	}
	Object.defineProperties(ycl_WebGLIndexedBuffer.prototype, {
		__proto__: objProtoValue,
		isIndexed: trueValue,
		geometryType: {
			get: WebGLIndexedBuffer_geometryType_get
		},
		indexCount: {
			get: WebGLIndexedBuffer_indexCount_get
		}
		indexType: {
			get: WebGLIndexedBuffer_indexType_get
		},
	})
	//{ WebGLIndexedBuffer Functions
	// properties
	function WebGLIndexedBuffer_geometryType_get() {
		return this.vertices.itemType
	}
	function WebGLIndexedBuffer_indexCount_get() {
		return this.indices.itemCount
	}
	function WebGLIndexedBuffer_indexType_get() {
		return this.indices.dataType
	}
	//}
	
	function ycl_WebGLAttribute(ycl_gl, ycl_program, activeInfo, index) {
		ycl_Location.call(this, ycl_gl, ycl_program, activeInfo, index)
		Object.freeze(this)
	}
	Object.defineProperties(ycl_WebGLAttribute.prototype, {
		__proto__: { value: ycl_WebGLLocation.__proto__ },
		// properties
		isAttribute: trueValue,
		pointer: {
			get: WebGLAttribute_pointer_get,
			set: WebGLAttribute_pointer_set
		},
		// methods
		setPointer: {
			value: WebGLAttribute_setPointer
		}
		draw: {
			value: WebGLAttribute_draw
		}
	})
	//{ WebGLAttribute Functions
	// properties
	function WebGLAttribute_pointer_get() {
		const gl = this.gl.handle
		gl.useProgram(this.program.handle)
		return gl.getVertexAttrib(
			this.index,
			API.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING
		)
	}
	function WebGLAttribute_pointer_set(buffer) {
		const gl = this.gl.handle
		gl.useProgram(this.program.handle)
		gl.bind(buffer.type, buffer.handle)
		gl.vertexAttribPointer(
			this.index, buffer.itemSize, buffer.dataType,
			false, 0, 0
		)
	}
	// methods
	function WebGLAttribute_setPointer(buffer) {
		Attribute_pointer_set.call(this, buffer)
	}
	function WebGLAttribute_draw(buffer) {
		if (!(buffer instanceof ycl_WebGLVertexBuffer)) {
			throw new Error("Must provide a WebGLVertexBuffer object.")
		}
		const gl = this.gl.handle
		gl.useProgram(this.program.handle)
		gl.vertexAttribPointer(
			this.index, buffer.itemSize, buffer.dataType,
			false, 0, 0
		)
		gl.drawArrays(buffer.itemType, 0, buffer.itemCount)
	}
	//}
	
	function ycl_WebGLUniform(ycl_gl, ycl_program, activeInfo, index) {
		const gl = ycl_gl
		ycl_Location.call(this, ycl_gl, ycl_program, activeInfo, index)
		Object.defineProperties(this, {
			handle: {
				value: API.getUniformLocation.call(gl,
					ycl_program.handle, this.name
				)
			},
			handler: { value: uniformHandlers[this.type] }
		})
		Object.freeze(this)
	}
	Object.defineProperties(ycl_WebGLUniform.prototype, {
		__proto__: { value: ycl_WebGLLocation.__proto__ },
		// properties
		isUniform: trueValue,
		value: {
			get: WebGLUniform_value_get,
			set: WebGLUniform_value_set
		}
	})
	//{ WebGLUniform Functions
	// properties
	function WebGLUniform_value_get() {
		return API.getUniform.call(this.gl.handle,
			this.program.handle, this.handle
		)
	}
	function WebGLUniform_value_set(value) {
		this.handler.call(this.gl.handle, this.handle, value)
	}
	//}
	
	function ycl_WebGLLocation(ycl_gl, ycl_program, activeInfo, index) {
		Object.defineProperties(this, {
			gl: { value: ycl_gl },
			program: { value: ycl_program},
			size: { value: activeInfo.size },
			type: { value: activeInfo.type },
			name: { value: activeInfo.name },
			index: { value: index }
		})
	}
	Object.defineProperties(ycl_WebGLLocation.prototype, {
		__proto__: objProtoValue,
		// methods
		toString: WebGLLocation_toString
	})
	//{ WebGLLocation Functions
	// methods
	function WebGLLocation_toString() {
		var str = "Location " + this.name
		if (this.isUniform) {
			str += ": Uniform("
		} else if (this.isAttribute) {
			str += ": Attribute("
		} else {
			str += ": <undefined>("
		}
		str += API_inv[this.type] + ")"
	}
	//}
	
	function ycl_WebGL_createContext(canvas) {
		if (typeof canvas === "string") {
			canvas = document.getElementById(canvas)
		}
		return new ycl_WebGLContext(canvas)
	}
	
	return Object.defineProperties({}, {
		__proto__: nullValue,
		// methods
		APIreverseLookup: {
			value: function(value) { return API_inv[value] }
		},
		createContext: {
			value: ycl_WebGL_createContext
		},
	})
}())))
