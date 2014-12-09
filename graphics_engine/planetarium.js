var WebGL = ycl.WebGL

const up = vec3.fromValues(0, 1, 0)
const origin = vec4.fromValues(0, 0, 0)

function createPlanetarium(
  gl, programs
) {
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
  
  const vp = new ViewPoint()
  vp.setPerspective(Math.degToRad(60), 1250/500, 1, 20)
  vp.setLookAt([0, 0, 10], origin, up)
  const pointLight = vec3.create()
  
  const planets = []
  function Planet(name, props) {
    this.shader = programs[props.shader]
    if (!this.shader) {
      throw new Error("shader \"" + props.shader + "\" not found!")
    }
    
    this._ = props
    this.transform = mat4.create()
    this.normalTransform = mat3.create()
    this.name = name
    
    if (typeof props.callback === "function") this.callback = props.callback
    if (props.texture) this.texture = _getTexture(props.texture)
    if (props.nightTexture) this.nightTexture = _getTexture(props.nightTexture)
    if (props.specularTexture) this.specularTexture = _getTexture(props.specularTexture)
    if (props.normalTexture) this.normalTexture = _getTexture(props.normalTexture)
    
    planets.push(this)
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
    callback: (function() {
      const origin = vec4.fromValues(0, 0, 0, 1)
      const point = vec4.create()
      const matrix = mat4.create()
      return function() {
        vec4.transformMat4(point, origin, this.transform)
        vec3.copy(pointLight, point)
//        mat4.mul(matrix, vp._pov, this.transform)
        vec4.transformMat4(point, point, vp._pov)
        programs.radialBlur.use().setUniform(
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
      period: 30,//23.9345,
      tilt: 23.27
    },
    diameter: 1,
    shader: "earth",
    texture: "earthmap1k.jpg",
    nightTexture: "earthlights1k.jpg",
    specularTexture: "earthspec1k.jpg",
    normalTexture: "earthbump1k.jpg"
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
    //occlude, radialBlur, //smoothBlur,
  ]
  const controllers = {}
  const timelineController = (function() {
    var time = 0
    function default_TLC_update(elapsed) {
      time += elapsed / 4
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
    const t = vec3.create(), u = vec3.fromValues(0.001, 3, 0.001)
    vec3.transformMat4(t, origin, earth.transform)
    vec3.add(u, u, t)
    vp.setLookAt(u, t, up)
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
    var i
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight)
    var shaders = []
    gl.blendEquation(gl.FUNC_ADD)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    for (i = 0; i < planets.length; ++i) {
      var planet = planets[i]
      var shader = planet.shader.use()
      if (shaders.indexOf(shader) < 0) {
        shaders.push(shader)
        shader.setPointOfView(vp)
        if (shader.usePointLight) {
          shader.setLightPosition(pointLight)
          if (shader.useSpecular) {
            shader.setCameraPosition(vp)
          }
        }
      }
      //viewpoint
      shader.draw(planet, sphere)
    }
  }
  function occlude() {
    const sunColor = vec4.fromValues(1.0, 0.8, 0.2, 1.0)
    const otherColor = vec4.fromValues(0.0, 0.0, 0.0, 1.0)
    var shader = programs.occlusion.use()
    shader.frameBuffer.bind()
    shader.frameBuffer.viewportFull()
    gl.clearColor(0.0, 0.0, 0.0, 1.0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    shader.setPointOfView(vp)
    for (var i = 0; i < planets.length; ++i) {
      var planet = planets[i]
      shader.setModelView(planet.transform, false)
      shader.setUniform(
        "u_Color", planet == sun ? sunColor : otherColor
      )
      sphere.draw(shader, "a_Position")
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
    var shader = programs.radialBlur.use()
    gl.blendEquation(gl.FUNC_ADD)
    gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ZERO)
    shader.setUniform("u_Strength", 0.95)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight)
    shader.draw(programs.occlusion.frameBuffer.texture, 0)
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
  this._e = vec3.create()
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
  vec3.copy(this._e, eye)
  mat4.lookAt(this._c, eye, point, up)
  mat4.mul(this._pov, this._p, this._c)
}

function WebGLStart(canvasId) {
  // initialize WebGL
  var gl = WebGL.createContext(canvasId)
  gl.enable(gl.DEPTH_TEST)
  gl.enable(gl.BLEND)
  gl.enable(gl.CULL_FACE)
  gl.cullFace(gl.BACK)
  
  const setupViewFunctions = (function() {
    const bufm3 = mat3.create()
    const bufv3 = vec3.create()
    return function(program) {
      program.setPointOfView = function(vp) {
        program.setUniform("u_PMatrix", vp._pov)
      }
      program.setCameraPosition = function(vp) {
        const e = vp._e
        vec3.set(bufv3, -e[0], -e[1], -e[2])
        program.setUniform("u_EyePosition", bufv3)
      }
      program.setLightPosition = function(lightPosition) {
        program.setUniform("u_LightPosition", lightPosition)
      }
      program.setModelView = function(mv) {
        // set model view transform
        program.setUniform("u_MVMatrix", mv)
      }
      program.setModelViewWithNormals = function(mv, normal) {
        if (!normal) normal = bufm3
        program.setUniform("u_MVMatrix", mv)
        mat3.fromMat4(normal, mv)
        mat3.invert(normal, normal)
        mat3.transpose(normal, normal)
        program.setUniform("u_NMatrix", normal)
      }
    }
  }())
  function setupTextureFunction(program, name, uniformName) {
    if (!uniformName) uniformName = name
    function setTexture(uniformName, texture, unit) {
      if (typeof unit !== "number" || unit != Math.floor(unit) || unit < 0 || unit >= 32) {
        throw new Error("invalid texture unit")
      }
      if (texture && texture.isLoaded) {
        gl.activeTexture(unit + gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        program.setUniform("u_Use" + uniformName + "Map", true)
        program.setUniform("u_" + uniformName + "Sampler", unit)
      } else {
        program.setUniform("u_Use" + uniformName + "Map", false)
      }
    }
    program["set" + name + "Texture"] = function(texture, unit) {
      setTexture(uniformName, texture, unit)
    }
  }
  
  const programs = {}
  function createProgram(gl, idVec, idFrag, name) {
    return programs[name || idFrag || idVec] = WebGL.createProgramFromHTML(
      gl,
      "shader-vs-" + idVec,
      "shader-fs-" + (idFrag || idVec),
      name
    )
  }
  function createPostProcessor(gl, idFrag, name) {
    return programs[name || idFrag] = WebGL.createPostProcessorFromHTML(
      gl, "shader-pp-" + idFrag, name
    )
  }
  
  var sunProgram = createProgram(gl, "tex-norm", "sun")
  var earthProgram = createProgram(gl, "tex-norm", "earth")
  var occlusionProgram = createProgram(gl, "passthrough", "occlusion")
  var radialBlurProgram = createPostProcessor(gl, "radialBlur")
  programs.terrestial = programs.earth
  programs.gasGiant = programs.earth
  
  //{ Sun Program
  // properties
  sunProgram.usePointLight = false
  // uniform functions
  setupViewFunctions(sunProgram)
  setupTextureFunction(sunProgram, "Color")
  // per-object setup
  sunProgram.draw = function(planet, geometry) {
    sunProgram.setModelView(planet.transform)
    sunProgram.setColorTexture(planet.texture, 0)
    geometry.draw(
      shader,
      "a_Position",
      "a_TexCoord"
    )
  }
  //}
  //{ Earth Program
  // properties
  earthProgram.usePointLight = true
  earthProgram.useSpecular = true
  // uniform functions
  setupViewFunctions(earthProgram)
  setupTextureFunction(earthProgram, "DayColor")
  setupTextureFunction(earthProgram, "NightColor")
  setupTextureFunction(earthProgram, "Specular")
  setupTextureFunction(earthProgram, "Normal")
  // per-object setup
  const bufv3 = vec3.create()
  const bufv4 = vec4.fromValues(0.0, 0.0, 0.0, 1.0)
  earthProgram.draw = function(planet, geometry) {
    vec4.set(bufv4, 0, 0, 0, 1)
    vec4.transformMat4(bufv4, bufv4, planet.transform)
    vec3.copy(bufv3, bufv4)
    earthProgram.setUniform("u_PlanetPosition", bufv3)
    earthProgram.setModelViewWithNormals(planet.transform, planet.normalTransform)
    earthProgram.setDayColorTexture(planet.texture, 0)
    if (planet.nightTexture) {
      earthProgram.setNightColorTexture(planet.nightTexture, 1)
    }
    if (planet.normalTexture) {
      vec3.transformMat3(bufv3, up, planet.normalTransform)
      earthProgram.setUniform("u_PlanetUp", bufv3)
      earthProgram.setNormalTexture(planet.normalTexture, 3)
    }
    if (planet.specularTexture) {
      earthProgram.setSpecularTexture(planet.specularTexture, 2)
    }
    geometry.draw(
      shader,
      "a_Position",
      "a_Normal",
      "a_TexCoord"
    )
  }
  //}
  
  //{ Uniforms
  // static variables
  const magenta = vec4.fromValues(1.0, 0.0, 1.0, 1.0)
  const white = vec3.fromValues(1.0, 1.0, 1.0)
  // Lighting
  earthProgram.setPointLight = function(position) {
    earthProgram.setUniform("u_LightPosition", position)
  }
  // Bump map
  //! need to add bump map handling
  //}
  
  setupViewFunctions(occlusionProgram)
  occlusionProgram.frameBuffer = WebGL.createFrameBuffer(
    gl, gl.viewportWidth, gl.viewportHeight
  )
  //}
  
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
  
  var scene = createPlanetarium(gl, programs)
  //earthProgram.use()
  //occlusionProgram.use()
  radialBlurProgram.use().setUniform("u_TextureSize", [gl.viewportWidth, gl.viewportHeight])
  
  return {
    draw: function(elapsed, mv) {
      // clear everything
      gl.clearColor(0.0, 0.0, 0.0, 1.0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight)
      
      // draw planets
      scene.draw(elapsed, mv)
    }
  }
}