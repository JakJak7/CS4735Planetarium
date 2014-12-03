var WebGL = ycl.WebGL

function createProgram(gl, idVec, idFrag, name) {
  return WebGL.createProgramFromHTML(
    gl,
    "shader-vs-" + idVec,
    "shader-fs-" + (idFrag || idVec),
    name
  )
}

function createPlanetarium(
  gl, g2d,
  planetProgram,
  occlusionProgram, smoothBlurProgram, radialBlurProgram
) {
  const origin = vec4.fromValues(0.0, 0.0, 0.0, 1.0)
  const white = vec4.fromValues(1.0, 1.0, 1.0, 1.0)
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
  
  const vp = new ViewPoint()
  vp.setPerspective(Math.degToRad(60), 1250/500, 1, 20)
  vp.setLookAt([0, 0, 10], [0, 0, 0], [0, 1, 0])
  
  const planets = []
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
    diameter: 1,
    shader: "sun",
    texture: "sunmap.jpg",
    lightColor: white,
    callback: (function() {
      const point = vec4.create()
      const matrix = mat4.create()
      return function() {
        vec4.transformMat4(point, origin, this.transform)
        planetProgram.use()
        planetProgram.setPointLight([point[0], point[1], point[2]], white)
//        mat4.mul(matrix, vp._pov, this.transform)
        vec4.transformMat4(point, point, vp._pov)
        radialBlurProgram.use()
        radialBlurProgram.setUniform(
          "u_Center", [
          (point[0] / point[3] + 1) * gl.viewportWidth / 2,
          (point[1] / point[3] + 1) * gl.viewportHeight / 2
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
    shader: "earth",
    texture: "earthmap1k.jpg",
    nightTexture: "earthlights1k.jpg",
    specularTexture: "earthspecular1k.jpg",
    normalTexture: "earthnormal1k.jpg"
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
    shader: "terrestial",
    texture: "moonmap1k.jpg"
  }))
  
  var handlers = [
    callbacks, drawSphere,
    occlude, radialBlur, //smoothBlur,
  ]
  const controllers = {}
  const timelineController = (function() {
    var time = 0
    function default_TLC_update(elapsed) {
      time += elapsed
    }
    function default_TLC_getTime() {
      return time / 1000
    }
    return {
      update: default_TLC_update,
      getTime: default_TLC_getTime
    }
  }())
  var time = 0
  function draw(elapsed, mv) {
    var self
    if (!mv) mv = mat4.create()
    else if (mv.current) mv = mv.current
    timelineController.update(elapsed)
    const timestamp = timelineController.getTime()
    for (self in controllers) {
      const update = controllers[self].update
      if (update) update.call(self, timestamp, elapsed)
    }
    sun.update(timestamp, mv)
    for (var i = 0; i < handlers.length; ++i) {
      handlers[i](planets)
    }
    for (self in controllers) {
      const draw2d = controllers[self].draw2d
      const draw3d = controllers[self].draw3d
      if (draw2d) draw2d.call(self, canvas, timestamp, elapsed)
    }
  }
  
  function addController(o) {
    var valid
    if (typeof o !== "object") {
      throw new Error("invalid controller")
    }
    if (o in controllers) {
      throw new Error("controller already exists")
    }
    const handler = { self: o, id: -1 }
    valid = false
    if (o.update) {
      handler.update = o.update
      valid = true
    }
    if (o.draw2d) {
      handler.draw3d = o.draw3d
      valid = true
    }
    if (o.draw2d) {
      handler.draw2d = o.draw2d
      valid = true
    }
    if (valid) {
      controllers[o] = handler
    } else {
      throw new Error("must contain at least one handler function")
    }
  }
  function removeController(o) {
    const handler = controllers[o]
    if (!handler) {
      return false
    } else {
      delete controllers[o]
      return true
    }
    
  }
  function setTimelineController(o) {
    if (!o.getTime) {
      throw new Error("invalid timeline controller")
    }
    timelineController = o
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
    planetProgram.setPointOfView(vp, true)
    for (var i = 0; i < planets.length; ++i) {
      var planet = planets[i]
      //viewpoint
      planetProgram.setModelView(planet.transform, true)
      planetProgram.setTexture(planet.texture, 0)
      if (planet.lightColor) {
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
        "a_Position",
        "a_Normal",
        "a_TexCoord"
      )
    }
  }
  function occlude() {
    const sunColor = vec4.fromValues(1.0, 0.8, 0.2, 1.0)
    const otherColor = vec4.fromValues(0.0, 0.0, 0.0, 1.0)
    occlusionProgram.use()
    occlusionProgram.frameBuffer.bind()
    occlusionProgram.frameBuffer.viewportFull()
    gl.clearColor(0.0, 0.0, 0.0, 1.0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    occlusionProgram.setPointOfView(vp)
    for (var i = 0; i < planets.length; ++i) {
      var planet = planets[i]
      occlusionProgram.setModelView(planet.transform, false)
      occlusionProgram.setUniform(
        "u_Color", planet == sun ? sunColor : otherColor
      )
      sphere.draw(occlusionProgram, "a_Position")
    }
  }
  function smoothBlur() {
    gl.blendEquation(gl.FUNC_ADD)
    gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ZERO)
    smoothBlurProgram.use()
    smoothBlurProgram.setUniform("u_Strength", 0.75)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight)
    smoothBlurProgram.draw(occlusionProgram.frameBuffer.texture, 0)
  }
  function radialBlur() {
    gl.blendEquation(gl.FUNC_ADD)
    gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ZERO)
    radialBlurProgram.use()
    radialBlurProgram.setUniform("u_Strength", 0.95)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight)
    radialBlurProgram.draw(occlusionProgram.frameBuffer.texture, 0)
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
        planet.lightColor = base.lightColor
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
    setView: setView,
    addController    : addController,
    removeController : removeController,
    setTimelineController : setTimelineController
  }
}

function ViewPoint() {
  this._p = mat4.create()
  this._c = mat4.create()
  this._pov = mat4.create()
}
ViewPoint.prototype.setProjection = function(projection) {
  mat4.copy(this._p, projection)
  mat4.mul(this._pov, this._p, this._c)
}
ViewPoint.prototype.setOrtho = function(left, right, bottom, top, near, far) {
  mat4.ortho(this._p, left, right, bottom, top, near, far)
  mat4.mul(this._pov, this._p, this._c)
}
ViewPoint.prototype.setPerspective = function(fovy, aspect, near, far) {
  mat4.perspective(this._p, fovy, aspect, near, far)
  mat4.mul(this._pov, this._p, this._c)
}
ViewPoint.prototype.setCamera = function(camera) {
  mat4.copy(this._c, camera)
  mat4.mul(this._pov, this._p, this._c)
}
ViewPoint.prototype.setLookAt = function(eye, point, up) {
  mat4.lookAt(this._c, eye, point, up)
  mat4.mul(this._pov, this._p, this._c)
}

function WebGLStart(canvasId) {
  // initialize WebGL
  try {
  var gl = WebGL.createContext(canvasId)
  gl.enable(gl.DEPTH_TEST)
  gl.enable(gl.BLEND)
  gl.cullFace(gl.BACK)
  
  const setupViewFunctions = (function() {
    const buf3 = mat3.create()
    return function(program) {
      program.setPointOfView = function(vp, useEye) {
        program.setUniform("u_PMatrix", vp._pov)
        if (useEye) {
          program.setUniform("u_EyePosition", [vp._c[12], vp._c[13], vp._c[14]])
        }
      }
      program.setModelView = function(mv, useNormal) {
        // set model view transform
        program.setUniform("u_MVMatrix", mv)
        
        if (useNormal) {
          // set normal transform
          mat3.fromMat4(buf3, mv)
          mat3.invert(buf3, buf3)
          mat3.transpose(buf3, buf3)
          program.setUniform("u_NMatrix", buf3)
        }
      }
    }
  })()
  
  var planetProgram = createProgram(gl, "tex-norm", "planet", "planet")
  //{ Uniforms
  setupViewFunctions(planetProgram)
  // static variables
  const origin = vec4.fromValues(0.0, 0.0, 0.0, 1.0)
  const magenta = vec4.fromValues(1.0, 0.0, 1.0, 1.0)
  const white = vec3.fromValues(1.0, 1.0, 1.0)
  // Lighting
  planetProgram.setAmbient = function(color) {
    planetProgram.setUniform("u_AmbientColor", color)
  }
  planetProgram.setPointLight = function(position, color) {
    if (position) planetProgram.setUniform("u_LightPosition", position)
    if (color) planetProgram.setUniform("u_LightColor", color)
  }
  planetProgram.usePointLight = function() {
    planetProgram.setUniform("u_UsePointLight", true)
  }
  planetProgram.useStaticLight = function(color) {
    planetProgram.setUniform("u_UsePointLight", false)
    planetProgram.setUniform("u_LightFallback", color || white)
  }
  // Color map
  planetProgram.setTexture = function(texture, unit, fallback) {
    var unitEnum = gl.__proto__["TEXTURE" + unit]
    if (unitEnum && texture && texture.isLoaded) {
      gl.activeTexture(unitEnum)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      planetProgram.setUniform("u_UseColorMap", true)
      planetProgram.setUniform("u_ColorSampler", unit)
    } else {
      planetProgram.setUniform("u_UseColorMap", false)
      planetProgram.setUniform("u_ColorFallback", fallback || magenta)
    }
  }
  planetProgram.setNightTexture = function(texture, unit) {
    var unitEnum = gl.__proto__["TEXTURE" + unit]
    if (unitEnum && texture && texture.isLoaded) {
      gl.activeTexture(unitEnum)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      planetProgram.setUniform("u_UseNightColorMap", true)
      planetProgram.setUniform("u_NightColorSampler", unit)
    } else {
      planetProgram.setUniform("u_UseNightColorMap", false)
    }
  }
  planetProgram.disableNightTexture = function() {
    planetProgram.setUniform("u_UseNightColorMap", false)
  }
  // Bump map
  //! need to add bump map handling
  //}
  
  var occlusionProgram = createProgram(gl, "passthrough", "occlusion")
  setupViewFunctions(occlusionProgram)
  occlusionProgram.frameBuffer = WebGL.createFrameBuffer(
    gl, gl.viewportWidth, gl.viewportHeight
  )
  //}
  
  var radialBlurProgram = WebGL.createPostProcessorFromHTML(
    gl, "shader-pp-radialBlur"
  )
  /*var smoothBlurProgram = WebGL.createPostProcessorFromHTML(
    gl, "shader-pp-smoothBlur"
  )*/
  
  //{ Instancing
  /*instancingProgram.setInstance = (function() {
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
    
  }*/
  //}
  
  var scene = createPlanetarium(
    gl,
    null,
    planetProgram,
    occlusionProgram,
    null, //smoothBlurProgram,
    radialBlurProgram
  )
  var modelView = WebGL.createMatrixStack()
  planetProgram.use()
  planetProgram.setAmbient([1, 1, 1])//[0.0, 0.0, 0.0])
  occlusionProgram.use()
  radialBlurProgram.use()
  radialBlurProgram.setUniform("u_TextureSize", [gl.viewportWidth, gl.viewportHeight])
  
  return {
    draw: function(elapsed) {
      // clear everything
      gl.clearColor(0.0, 0.0, 0.0, 1.0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight)
      modelView.reset()
      
      // draw planets
      scene.draw(elapsed, modelView)
    }
  }
  } catch (e) {
    if (e instanceof Error) {
      alert(e.stack)
    } else {
      alert(e)
    }
  }
}