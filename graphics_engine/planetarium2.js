var WebGL = ycl.WebGL

function createProgram(gl, idVec, idFrag, vertexAttribName) {
	return WebGL.createProgramFromHTML(
		gl,
		"shader-vs-" + idVec,
		"shader-fs-" + (idFrag || idVec),
		vertexAttribName
	)
}

function createPlanetarium(gl, planetProgram, occlusionProgram, blurProgram) {
	const origin = vec3.fromValues(0.0, 0.0, 0.0)
	const white = vec3.fromValues(1.0, 1.0, 1.0)
	const sphere = createSphere(gl, 50, 50)
	
	var _getTexture = (function() {
		var textures = {}
		return function(filename) {
			var tex = textures[filename]
			if (!tex) {
				tex = WebGL.createTexture(gl, filename)
				textures[filename] = tex
			}
			return tex
		}
	})()
	
	var planets = []
	function Planet(name, props) {
		planets.push(this)
		
		this._ = props
		this.transform = mat4.create()
		this.name = name
		
		if (props.callback) this.callback = props.callback
		if (props.texture) this.texture = _getTexture(props.texture)
		if (props.nightTexture) this.nightTexture = _getTexture(props.nightTexture)
	}
	Planet.prototype.addChild = function(planet) {
		if (!(planet instanceof Planet)) {
			throw "can only add Planet objects as children"
		}
		if (!this.children) {
			this.children = [planet]
		} else {
			this.children.push(planet)
		}
		return planet
	}
	Planet.prototype.update = function(time, mv) {
		var pt = this.transform
		mat4.copy(pt, mv)
		if (this.orbit) {
			mat4.rotateX(pt, pt, this.orbitTilt)
			var orbitRotation = time * this.orbitSpeed
			mat4.rotateY(pt, pt, orbitRotation)
			mat4.translate(pt, pt, this.orbitDistance)
			mat4.rotateY(pt, pt, -orbitRotation)
		}
		if (this.children) {
			for (var i = 0; i < this.children.length; ++i) {
				this.children[i].update(time, pt)
			}
		}
		if (this.rotation) {
			mat4.rotateX(pt, pt, this.rotationTilt)
			mat4.rotateY(pt, pt, time * this.rotationSpeed)
		}
		if (this.diameter) {
			mat4.scale(pt, pt, this.diameter)
		}
	}
	
	var sun = new Planet("Sun", {
		lighting: true,
		diameter: 1,
		texture: "sunmap.jpg",
		material: {
			lighting: null,
			colorMap: "sunmap.jpg"
		},
		callback: (function() {
			const point = vec3.create()
			return function() {
				vec3.transformMat4(point, origin, this.transform)
				planetProgram.use()
				planetProgram.setPointLight(point, white)
				blurProgram.use()
				blurProgram.setUniform(
					"uCenter", [
					point[0] + gl.viewportWidth / 2,
					point[1] + gl.viewportHeight / 2
				])
			}
		}()),
	})
	var earth = sun.addChild(new Planet("Earth", {
		orbit: {
			distance: 1,
			period: 365.256,
			tilt: 7.155
		},
		rotation: {
			period: 23.9345,
			tilt: 23.27
		},
		diameter: 1,
		texture: "earthmap1k.jpg",
		nightTexture: "earthlights1k.jpg"
	}))
	var moon = earth.addChild(new Planet("Moon", {
		orbit: {
			distance: 0.257,//0.00257,
			period: 27.321582,
			tilt: 5.145
		},
		rotation: {
			period: 27.321582,
			tilt: 6.687
		},
		diameter: 0.273,
		texture: "moonmap1k.jpg"
	}))
	
	var handlers = [
		callbacks, drawSphere,
		occlude, blur
	]
	var time = 0
	function update(elapsed) {
		time += elapsed
	}
	function draw(mv) {
		var timestamp = time / 1000
		sun.update(timestamp, mv.current || mv)
		for (var i = 0; i < handlers.length; ++i) {
			handlers[i](planets)
		}
	}
	function callbacks() {
		for (var i = 0; i < planets.length; ++i) {
			var planet = planets[i]
			if (planet.callback) planet.callback.call(planet)
		}
	}
	function drawSphere() {
		planetProgram.use()
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight)
		gl.blendEquation(gl.FUNC_ADD)
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
		for (var i = 0; i < planets.length; ++i) {
			var planet = planets[i]
			planetProgram.setModelView(planet.transform)
			planetProgram.setTexture(planet.texture, 0)
			if (planet.lighting) {
				planetProgram.useStaticLight(planet.lightColor)
			} else {
				planetProgram.usePointLight()
			}
			if (planet.nightTexture) {
				planetProgram.setNightTexture(planet.nightTexture, 1)
			} else {
				planetProgram.disableNightTexture()
			}
			sphere.draw(
				planetProgram,
				"aVertexPosition",
				"aVertexNormal",
				"aTextureCoord"
			)
		}
	}
	var occlude = (function() {
		const sun = vec4.fromValues(1.0, 0.8, 0.2, 1.0)
		const other = vec4.fromValues(0.0, 0.0, 0.0, 1.0)
		function occlude() {
			occlusionProgram.use()
			occlusionProgram.frameBuffer.bind()
			occlusionProgram.frameBuffer.viewportFull()
			gl.clearColor(0.0, 0.0, 0.0, 1.0)
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
			for (var i = 0; i < planets.length; ++i) {
				var planet = planets[i]
				occlusionProgram.setModelView(planet.transform)
				occlusionProgram.setUniform(
					"uColor", planet == sun ? sun : other
				)
				sphere.draw(occlusionProgram, "aVertexPosition")
			}
		}
		return occlude
	}
	function blur() {
		gl.blendEquation(gl.FUNC_ADD)
		gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ZERO)
		blurProgram.use()
		blurProgram.setUniform("uStrength", 1.0)
		gl.bindFramebuffer(gl.FRAMEBUFFER, null)
		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight)
		blurProgram.draw(occlusionProgram.frameBuffer.texture, 0)
	}
	
	var setView = (function() {
		var defaultSettings
		defaultSettings = {
			diameter: 1,
			orbit: { tilt: 1, speed: 1/365, distance: 1 },
			rotation: { tilt: 1, speed: 1/24 }
		}
		
		function setView(settings) {
			var planet, base, orbit, rotation, diameter, i
			
			settings = ycl.extend(true, {}, defaultSettings, settings)
			orbit = settings.orbit
			rotation = settings.rotation
			
			for (i = 0; i < planets.length; ++i) {
				planet = planets[i]
				base = planet._.orbit
				if (base) {
					planet.orbit = true
					planet.orbitTilt = Math.degToRad(base.tilt * orbit.tilt)
					planet.orbitSpeed = base.period * orbit.speed
					planet.orbitDistance = base.distance
						? [base.distance * orbit.distance, 0, 0]
						: [1, 0, 0]
				} else {
					planet.orbit = false
				}
				base = planet._.rotation
				if (base) {
					planet.rotation = true
					planet.rotationTilt = Math.degToRad(base.tilt * rotation.tilt)
					planet.rotationSpeed = base.period * rotation.speed
				} else {
					planet.rotation = false
				}
				base = planet._
				if (base.diameter) {
					diameter = base.diameter * (settings.diameter || 1)
					planet.diameter = [diameter, diameter, diameter]
				} else {
					planet.diameter = false
				}
			}
		}
		return setView
	}())
	setView({
		orbit: { distance: 5, speed: 1/365 },
		rotation: { speed: 1/12 }
	})
	
	return {
		draw   : draw,
		update : update,
		setView: setView
	}
}

function WebGLStart(canvasId, vertexId, fragmentId) {
	// initialize WebGL
	var gl = WebGL.createContext(canvasId)
	gl.depthEnabled = true
	gl.blendEnabled = true
	gl.cullBack()
	
	var planetProgram = gl.createProgramFromHTML(
		"shader-vs-tex-norm", "shader-fs-planet"
	)
	//{ Uniforms
	// static variables
	const origin = vec4.fromValues(0.0, 0.0, 0.0, 1.0)
	const magenta = vec4.fromValues(1.0, 0.0, 1.0, 1.0)
	const white = vec3.fromValues(1.0, 1.0, 1.0)
	// Transforms
	planetProgram.setPerspective = function(perspective) {
		planetProgram.setUniform("uPMatrix", perspective)
	}
	planetProgram.setModelView = (function() {
		var normal = mat3.create()
		return function(modelView) {
			if ("current" in modelView) modelView = modelView.current
			planetProgram.setUniform("uMVMatrix", modelView)
			
			mat3.fromMat4(normal, modelView)
			mat3.invert(normal, normal)
			mat3.transpose(normal, normal)
			planetProgram.setUniform("uNMatrix", normal)
		}
	}())
	// Lighting
	planetProgram.setAmbient = function(color) {
		planetProgram.setUniform("uAmbientColor", color)
	}
	planetProgram.setPointLight = function(position, color) {
		if (position) planetProgram.setUniform("uLightPosition", position)
		if (color) planetProgram.setUniform("uLightColor", color)
	}
	planetProgram.usePointLight = function() {
		planetProgram.setUniform("uUsePointLight", true)
	}
	planetProgram.useStaticLight = function(color) {
		planetProgram.setUniform("uUsePointLight", false)
		planetProgram.setUniform("uLightFallback", color || white)
	}
	// Color map
	planetProgram.setTexture = function(texture, unit, fallback) {
		var unitEnum = gl.__proto__["TEXTURE" + unit]
		if (unitEnum && texture && texture.isLoaded) {
			gl.activeTexture(unitEnum)
			gl.bindTexture(gl.TEXTURE_2D, texture)
			planetProgram.setUniform("uUseColorMap", true)
			planetProgram.setUniform("uColorSampler", unit)
		} else {
			planetProgram.setUniform("uUseColorMap", false)
			planetProgram.setUniform("uFallbackColor", fallback || magenta)
		}
	}
	planetProgram.setNightTexture = function(texture, unit) {
		var unitEnum = gl.__proto__["TEXTURE" + unit]
		if (unitEnum && texture && texture.isLoaded) {
			gl.activeTexture(unitEnum)
			gl.bindTexture(gl.TEXTURE_2D, texture)
			planetProgram.setUniform("uUseNightColorMap", true)
			planetProgram.setUniform("uNightColorSampler", unit)
		} else {
			planetProgram.setUniform("uUseNightColorMap", false)
		}
	}
	planetProgram.disableNightTexture = function() {
		planetProgram.setUniform("uUseNightColorMap", false)
	}
	// Bump map
	//! need to add bump map handling
	//}
	
	var occlusionProgram = createProgram(gl, "passthrough", "occlusion")
	occlusionProgram.frameBuffer = gl.createFrameBuffer(
		gl, gl.viewportWidth, gl.viewportHeight
	)
	//{ Uniforms
	occlusionProgram.setPerspective = function(perspective) {
		occlusionProgram.setUniform("uPMatrix", perspective)
	}
	occlusionProgram.setModelView = function(modelView) {
		if ("current" in modelView) modelView = modelView.current
		occlusionProgram.setUniform("uMVMatrix", modelView)
	}
	//}
	
	var blurProgram = WebGL.createPostProcessorFromHTML(
		gl, "shader-pp-radialBlur"
	)
	
	var instancingProgram = createProgram(
		gl, "passthrough", "instancing"
	)
	//{ Uniforms
	// Transforms
	instancingProgram.setPerspective = function(perspective) {
		instancingProgram.setUniform("uPMatrix", perspective)
	}
	instancingProgram.setModelView = function(modelView) {
		if ("current" in modelView) modelView = modelView.current
		instancingProgram.setUniform("uMVMatrix", modelView)
	}
	// Instancing
	instancingProgram.setInstance = (function() {
		var idVec = vec4.create()
		return function(type, id) {
			idVec[0] = 1 / Math.floor(type / 256)
			idVec[1] = 1 / (type % 256)
			idVec[2] = 1 / Math.floor(id / 256)
			idVec[3] = 1 / (id % 256)
			instancingProgram.setUniform("uInstance", idVec)
		}
	}())
	instancingProgram.getInstance = function(x, y) {
		
	}
	//}
	
	var scene = createPlanetarium(
		gl,
		planetProgram,
		occlusionProgram,
		blurProgram
	)
	var modelView = WebGL.createMatrixStack()
	modelView.perspective(Math.degToRad(60), gl.aspect, 0.1, 100.0)
	planetProgram.use()
	planetProgram.setPerspective(modelView.current)
	planetProgram.setAmbient([0.0,0.0,0.0])//[0.05, 0.05, 0.05])
	occlusionProgram.use()
	occlusionProgram.setPerspective(modelView.current)
	blurProgram.use()
	blurProgram.setUniform("uStrength", 1.0)
	blurProgram.setUniform("uTextureSize", [gl.viewportWidth, gl.viewportHeight])
	
	return {
		update: scene.update,
		draw: function() {
			// clear everything
			gl.clearColor(0.0, 0.0, 0.0, 1.0)
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
			gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight)
			modelView.reset()
			
			// handle camera
			modelView.lookAt([0, 0, 10], [0, 0, 0], [0, 1, 0])
			
			// draw planets
			scene.draw(modelView)
		}
	}
}

