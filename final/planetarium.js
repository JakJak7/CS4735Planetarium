var WebGL = ycl.WebGL

const up = vec3.fromValues(0, 1, 0)
const origin = vec3.fromValues(0, 0, 0)
const origin4 = vec4.fromValues(0, 0, 0, 1)
const bufm3 = mat3.create()
const bufm4 = mat4.create()
const bufv3 = vec3.create()
const bufv4 = vec4.create()

function createPlanetarium(
  gl, g2d, programs
) {
  const model = {}
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
  vp.setPerspective(Math.degToRad(40), 1250/500, 0.01, 200)
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
      return function() {
        vec4.transformMat4(bufv4, origin4, this.transform)
        vec3.copy(pointLight, bufv4)
//        mat4.mul(bufv4, vp._pov, this.transform)
        vec4.transformMat4(bufv4, bufv4, vp._pov)
        const shader = programs.radialBlur.use()
        shader.setUniform(
          "u_Center", [
          (bufv4[0] / bufv4[3] + 1) * gl.viewportWidth / 2,
          (bufv4[1] / bufv4[3] + 1) * gl.viewportHeight / 2
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
    specularTexture: "earthspec1k.jpg",
    normalTexture: "earthbump1k.jpg"
  }))
  var moon = earth.addChild(new Planet("Moon", {
    orbit: {
      distance: 0.00257,
      period: 27.321582,
      tilt: 5.145
    },
    rotation: {
      period: 27.321582,
      tilt: 6.687
    },
    diameter: 0.273,
    shader: "terrestial",
    texture: "moonmap1k.jpg",
    normalTexture: "moonbump1k.jpg"
  }))
  
  var mercury = sun.addChild(new Planet('Mercury', {
    orbit: {
      distance: 0.387,
      period: 87.969,
      tilt: 3.38
    },
    rotation: {
      period: 58.646,
      tilt: 0
    },
    diameter: 0.382,
    shader: "terrestial",
    texture: "mercurymap.jpg",
    normalTexture: "mercurybump.jpg"
  }))
  var venus = sun.addChild(new Planet('Venus', {
    orbit: {
      distance: 0.723,
      period: 224.7,
      tilt: 3.86
    },
    rotation: {
      period: -243.0185,
      tilt: 117.4
    },
    diameter: 0.949,
    shader: "terrestial",
    texture: "venusmap.jpg",
    normalTexture: "venusbump.jpg"
  }))
  var mars = sun.addChild(new Planet('Mars', {
    orbit: {
      distance: 1.524,
      period: 686.98,
      tilt: 5.65
    },
    rotation: {
      period: 24.622968,
      tilt: 25.1833
    },
    diameter: 0.532,
    shader: "terrestial",
    texture: "mars_1k_color.jpg",
    normalTexture: "mars_1k_bump.jpg"
  }))
  var jupiter = sun.addChild(new Planet('Jupiter', {
    orbit: {
      distance: 5.203,
      period: 4328.9,
      tilt: 6.09
    },
    rotation: {
      period: 9.8417,
      tilt: 3.0667
    },
    diameter: 11.19,
    shader: "gas",
    texture: "jupitermap.jpg",
  }))
  var saturn = sun.addChild(new Planet('Saturn', {
    orbit: {
      distance: 9.539,
      period: 10734.65,
      tilt: 5.51
    },
    rotation: {
      period: 10.5826,
      tilt: 27
    },
    diameter: 2.4833,
    shader: "gas",
    texture: "saturnmap.jpg",
  }))
  var uranus = sun.addChild(new Planet('Uranus', {
    orbit: {
      distance: 19.18,
      period: 30674.6,
      tilt: 6.48
    },
    rotation: {
      period: 17.2,
      tilt: 97.9
    },
    diameter: 4.01,
    shader: "gas",
    texture: "uranusmap.jpg",
  }))
  var neptune = sun.addChild(new Planet('Neptune', {
    orbit: {
      distance: 36.06,
      period: 60152,
      tilt: 6.43
    },
    rotation: {
      period: 16.11,
      tilt: 29.6
    },
    diameter: 3.88,
    shader: "gas",
    texture: "neptunemap.jpg",
  }))
  
  var handlers = [
    callbacks, instancing,
    skybox,
    drawSphere,
    occlude, radialBlur//, smoothBlur
  ]
  const controllers = {}
  var timelineController = (function() {
    var time = 0
    function default_TLC_getTime(elapsed) {
      return time += elapsed / 4000
    }
    return {
      getTime: default_TLC_getTime
    }
  }())
  const uea = {
    model: model,
    time: 0,
    elapsed: 0,
    realTime: 0,
    realElapsed: 0,
    gl: gl,
    g2d: g2d
  }
  var lastModelTime = 0
  function draw(realTime, realElapsed, mv) {
    var self
    if (!mv) mv = mat4.create()
    else if (mv.current) mv = mv.current
    const modelTime = timelineController.getTime.call(timelineController, realElapsed)
    uea.time = modelTime
    uea.elapsed = modelTime - lastModelTime
    uea.realTime = realTime
    uea.realElapsed = realElapsed
    lastModelTime = modelTime
    for (key in controllers) {
      const update = controllers[key].update
      if (update) update(uea)
    }
    sun.update(modelTime, mv)
    for (var i = 0; i < handlers.length; ++i) {
      handlers[i]()
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
    const handler = { self: o }
    valid = false
    if (o.update) {
      handler.update = function(uea) { o.update.call(o, uea) }
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
  
  var lastId, lastId0, lastId1, lastId2
  const selectorMap = [null]
  const pixels = new Uint8Array(4)
  function getSelected(x, y) {
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    const id = pixels[0] * 65536 + pixels[1] * 256 + pixels[2]
    const selected = selectorMap[id]
    if (selected) {
      return { obj: selected, id: id, subId: pixels[3] * 256 }
    } else {
     return null
   }
  }
  function newFrame() {
    lastId = 0, lastId0 = 0, lastId1 = 0, lastId2 = 0
    while (selectorMap.length > 1) selectorMap.pop()
  }
  function nextId(shader, obj) {
    if (++lastId0 >= 256) {
      if (++lastId1 >= 256) {
        if (++lastId2 >= 256) {
          throw new Error("id overflow")
        }
        lastId1 = 0
      }
      lastId0 = 0
    }
    shader.setUniform("u_Color", [lastId2 / 256, lastId1 / 256, lastId0 / 256, 1])
    selectorMap[++lastId] = obj
  }
  function ignoreId() {
    shader.setUniform("u_Color", [0, 0, 0, 0])
  }
  
  function instancing() {
    var i
    if (cameraController.hasClicked) {
      cameraController.hasClicked = false
      newFrame()
      const shader = programs.occlusion.use()
      shader.frameBuffer.bind()
      shader.frameBuffer.viewportFull()
      gl.disable(gl.BLEND)
      gl.clearColor(0.0, 0.0, 0.0, 0.0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      shader.setPointOfView(vp)
      for (i = 0; i < planets.length; ++i) {
        var planet = planets[i]
        nextId(shader, planet)
        shader.draw(planet, sphere)
      }
      gl.enable(gl.BLEND)
      const target = getSelected(cameraController.xClicked, cameraController.yClicked)
      if (target) {
        if (cameraController.following == target.obj) {
          cameraController.numClicks += 1
        } else {
          cameraController.following = target.obj
          cameraController.locked = false
          cameraController.numClicks = 2
        }
      }
    }
  }
  function callbacks() {
    for (var i = 0; i < planets.length; ++i) {
      var planet = planets[i]
      if (planet.callback) planet.callback.call(planet)
    }
  }
  var skyboxGeometry = WebGL.createTriangleBuffer(gl, new Float32Array ([
    0,1,1,   1, 1,1,   1, 0,1,
	1, 0,1,   0, 0,1,   0,1,1, //one square
    0,1,0,   1, 1,0,   1, 0,0,
	1, 0,0,   0, 0,0,   0,1,0, //two squares
	1, 0,0,   0, 0,0,   0, 0,1,
	0, 0,1,   1, 0,1,   1, 0,0, //three squares
	1, 0,0,   1, 0,1,   1, 1,1,
	1, 1,1,   1, 1,0,   1, 0,0,  //four squares
	0,1,1,   1,1,1,   1,1,0,
	1,1,0,   0,1,0,   0,1,1, //five squares
	0,1,1,   0,0,1,   0,0,0,
	0,0,0,   0,1,0,   0,1,1,
  ]));
  var skyboxTexCoords = WebGL.createFloatBuffer(gl, new Float32Array ([
    0,1,   1, 1,   1, 0,
	1, 0,   0, 0,   0,1, //one square
    0,1,   1, 1,   1, 0,
	1, 0,   0, 0,   0,1, //two squares
	1, 0,   0, 0,   0, 1,
	0, 1,   1, 1,   1, 0, //three squares
	0,0,    0,1,    1,1,
	1,1,    1,0,    0,0,  //four squares
	0,1,   1,1,   1,0,
	1,0,   0,0,   0,1, //five squares
	1,1,   0,1,   0,0,
	0,0,   1,0,   1,1,
  ]), 2);
  var skyboxTexture = _getTexture("stars.jpg")
  function skybox() {
    gl.disable(gl.CULL_FACE)
    const shader = programs.skybox.use()
      if (skyboxTexture.isLoaded) {
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, skyboxTexture)
        shader.setUniform("u_Loaded", true)
        shader.setUniform("u_Sampler", 0)
      } else {
        shader.setUniform("u_Loaded", false)
      }
    shader.setPointOfView(vp)
    mat4.identity(bufm4)
    vec3.set(bufv3, 50, 50, 50)
    mat4.scale(bufm4, bufm4, bufv3)
    vec3.set(bufv3, -0.5, -0.5, -0.5)
    vec3.add(bufv3, bufv3, cameraController.gazeVector)
    mat4.translate(bufm4, bufm4, [-0.5, -0.5, -0.5])
    shader.setUniform("u_MVMatrix", bufm4)
    skyboxTexCoords.bindAttribute(shader, "a_TexCoord")
    skyboxGeometry.draw(shader, "a_Position")
    gl.enable(gl.CULL_FACE)
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
    const shader = programs.occlusion.use()
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
    gl.disable(gl.CULL_FACE)
    gl.disable(gl.DEPTH_TEST)
    gl.blendEquation(gl.FUNC_ADD)
    gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ZERO)
    //shader.setUniform("u_Strength", 0.95)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight)
    shader.draw(programs.occlusion.frameBuffer.texture, 0)
    gl.enable(gl.CULL_FACE)
    gl.enable(gl.DEPTH_TEST)
  }
  
  var setView = (function() {
    var defaultSettings
    defaultSettings = {
      diameter: 1,
      orbit: { tilt: 1, speed: 1, distance: 1 },
      rotation: { tilt: 1, speed: 1 }
    }
    function getValue(value, setting) {
      switch (typeof setting) {
      case "function": return setting(value)
      case "number": return value * setting
      default: return value
      }
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
          planet.orbitTilt = Math.degToRad(getValue(base.tilt, orbit.tilt))
          planet.orbitSpeed = getValue(base.period, orbit.speed)
          planet.orbitDistance = base.distance
            ? [getValue(base.distance, orbit.distance), 0, 0]
            : [1, 0, 0]
        } else {
          planet.orbit = false
        }
        base = planet._.rotation
        if (base) {
          planet.rotation = true
          planet.rotationTilt = Math.degToRad(getValue(base.tilt, rotation.tilt))
          planet.rotationSpeed = getValue(base.period, rotation.speed)
        } else {
          planet.rotation = false
        }
        base = planet._
        if (base.diameter) {
          diameter = getValue(base.diameter, settings.diameter)
          planet.diameter = [diameter, diameter, diameter]
        } else {
          planet.diameter = false
        }
        planet.lightColor = base.lightColor
      }
    }
    return setView
  }())
  function divide(dividend) { return function(value) { return dividend / value } }
  function logScale(scale, offset) { return function(value) { return scale * Math.log(value + offset) } }
  setView({
    orbit: { distance: logScale(2, 1), speed: divide(10) },
    rotation: { speed: divide(20) },
    diameter: logScale(1/5, 1)
  })
  
  return ycl.extend(model, {
    draw   : draw,
    setView: setView,
    addController    : addController,
    removeController : removeController,
    setTimelineController : setTimelineController,
    setLookAt: function(eye, gaze, up) { vp.setLookAt(eye, gaze, up) }
  })
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

var timelineController = {
  timeFlow: 1,
  timeFlow_last: 0,
  time: Math.random() * 1000,
  
  keyHandler: function(key) {
    switch(key){
      case ' ':
        if (this.timeFlow == 0) {
          this.timeFlow = this.timeFlow_last
          this.timeFlow_last = 0
        } else {
          this.timeFlow_last = this.timeFlow
          this.timeFlow = 0
        }
        break
      case '1':
        this.timeFlow = 1
        break
      case '2':
        this.timeFlow *= 0.5
        break;
      case '3':
        this.timeFlow *= -1
        break
      case '4':
        this.timeFlow *= 2
        break
    }
  },
  
  getTime: function(realElapsed) {
    return this.time += realElapsed * this.timeFlow / 1000
  }
}
var cameraController = {
  longitude: 0,
  latitude: 0,
  radius: 2,
  targetRadius: 2,
  gazeVector: vec3.create(),
  targetGaze: vec3.create(),
  up: vec3.fromValues(0, 1, 0),
  numClicks: 0,
  following: null,
  locked: false,
  
  update: function(uea) {
    if (this.following) {
      vec4.transformMat4(bufv4, origin4, this.following.transform)
      vec3.copy(this.targetGaze, bufv4)
      if (this.locked) {
        vec3.copy(this.gazeVector, bufv4)
      }
    }
    // bufv3 = vector representing the path to be taken
    vec3.sub(bufv3, this.targetGaze, this.gazeVector)
    // if distance is less than threshold
    if (!this.locked) {
      const len = vec3.len(bufv3)
      if (len < 0.01){
        if (this.following) {
          this.locked = true
          console.log("locked")
        }
        vec3.copy(this.gazeVector, this.targetGaze)
      }
      // otherwise interpolate towards target gradually
      else {
        // mul = the fraction of the path to move
        const mul = Math.max(this.numClicks * uea.realElapsed / 1000)
        if (mul * len) {
          // gazeVector += mul * bufv3
          vec3.scaleAndAdd(this.gazeVector, this.gazeVector, bufv3, mul)
        } else {
          vec3.copy(this.gazeVector, this.targetGaze)
        }
      }
    }
    // interpolate the radius gradually
    this.radius += (this.targetRadius - this.radius) * (uea.realElapsed / 100)
    
    // update camera matrix to reflect changes
    // intermediate values for camera direction
    const coslat = Math.cos(this.latitude)
    const coslon = Math.cos(this.longitude)
    const sinlat = Math.sin(this.latitude)
    const sinlon = Math.sin(this.longitude)
    // bufv3 = camera direction
    vec3.set(bufv3, coslat * coslon, sinlat, coslat * sinlon)
    // bufv3 = gaze + camera direction * radius
    vec3.scaleAndAdd(bufv3, this.gazeVector, bufv3, this.radius)
    uea.model.setLookAt(bufv3, this.gazeVector, this.up)
  },
  
  clickHandler: function(x, y) {
    this.hasClicked = true
    this.xClicked = x
    this.yClicked = y
  },
  mouseMoveHandler: function(x, y) {
    this.longitude += x / 100
    this.latitude += y / 100
    // stop the latitude from wrapping around
    if (this.latitude >= Math.PI_2) {
      this.latitude = Math.PI_2 - 0.001
    } else if (this.latitude <= -Math.PI_2) {
      this.latitude = -Math.PI_2 + 0.001
    }
  },
  keyHandler: function(key) {
    var x, z
    const coslon = Math.cos(this.longitude)
    const sinlon = Math.sin(this.longitude)
    switch (key) {
    case 'w':
      x = -coslon, z = -sinlon
      break
    case 's':
      x = coslon, z = sinlon
      break
    case 'a':
      x = -sinlon, z = coslon
      break
    case 'd':
      x = sinlon, z = -coslon
      break
    default:
      return
    }
    this.following = null
    this.locked = false
    this.numClicks = 2
    vec3.set(bufv3, x, 0, z)
    vec3.scaleAndAdd(this.targetGaze, this.targetGaze, bufv3, 0.1)
  },
  scrollHandler: function(amount) {
    const MAXRADIUS = 100, MINRADIUS = 0.25
    const newRadius = this.targetRadius + amount / 4
    this.targetRadius = Math.max(MINRADIUS, Math.min(MAXRADIUS, newRadius))
  }
}

function initEventHandlers(canvas,hud) {
  var mouseDown = false, mouseMove = false, hasBreached = false;
  var oldX, oldY;
  canvas.addEventListener("mousedown", function(ev) {
    mouseDown = true
    mouseMove = false
    oldX = ev.pageX
    oldY = ev.pageY
  }, false);
  canvas.addEventListener("mousemove", function(ev) {
    var currentX = ev.clientX, currentY = ev.clientY
    const deltaX = currentX - oldX, deltaY = currentY - oldY
    if (mouseDown && Math.sqrt(deltaX * deltaX + deltaY * deltaY) > 5) {
      mouseMove = true
      hasBreached = true
      cameraController.mouseMoveHandler.call(cameraController, deltaX, deltaY)
      oldX = currentX
      oldY = currentY
    }
    if (hasBreached){
    }
  }, false);
  canvas.addEventListener("mouseup", function(ev) {
    mouseDown = false;
    hasBreached = false;
    if (!mouseMove) {
      const x = ev.clientX, y = ev.clientY;
      const rect = ev.target.getBoundingClientRect();
      if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
        cameraController.clickHandler.call(cameraController, x - rect.left, rect.bottom - y)
        /*const x_in_canvas = x - rect.left, y_in_canvas = rect.bottom - y;
        const picked = check(gl, n, x_in_canvas, y_in_canvas, currentAngle,u_Clicked, modelMatrix, u_ModelMatrix);
        if (picked[0] == 255){
          targetGaze = new Float32Array(cube1Center);
          if(target == 1) numClicks++;
          else {
            target = 1;
            numClicks = 1;
          }
        }
        else if (picked[1] == 255){
          targetGaze = new Float32Array(cube2Center);
          if(target == 2) numClicks++;
          else {
            target = 2;
            numClicks = 1;
          }
        }
        else if (picked[2] == 255){
          targetGaze = new Float32Array(cube3Center);
          if(target == 3) numClicks++;
          else {
            target = 3;
            numClicks = 1;
          }
        }
        else if (picked[2] == 128){
          targetGaze = new Float32Array(cube4Center);
          if(target == 4) numClicks++;
          else {
            target = 4;
            numClicks = 1;
          }
        }*/
      }
    }
  }, false);
  
  /*hud.onclick= function(ev){
    var x = ev.clientX;
    var y = ev.clientY;
    //alert(x+","+y);
    if(x<106){
      // play/pause
      if(timeFlow==0.0) {
        timeFlow = timeFlow_last;
        timeFlow_last = 0.0;
      }
      else {
        timeFlow_last = timeFlow;
        timeFlow = 0;
      }
    }
    else if(x<166){
      // faster
      if (Math.abs(timeFlow)<8) timeFlow = timeFlow *2;
    }
    else if(x<232){
      // slower
      if (Math.abs(timeFlow)>0.125) timeFlow = timeFlow * 0.5;
    }
    else if(x<304){
      // reverse
        timeFlow = timeFlow *-1;
    }
    else{
      // reset
      timeFlow = 1.0;
    }
  };*/
  
  // WASD free-cam (but only in the XZ plane
  window.onkeypress = function(ev){
    var key = String.fromCharCode(ev.charCode);
    timelineController.keyHandler.call(timelineController, key)
    cameraController.keyHandler.call(cameraController, key)
  };
    
  // Internet Explorer, Opera, Google Chrome and Safari
  canvas.addEventListener ("mousewheel", mouseScroll, false);
  // Firefox
  canvas.addEventListener("DOMMouseScroll", mouseScroll, false);
  
  function mouseScroll(ev) {
    const e = window.event || e
    var delta
    if ((-e.wheelDelta || e.detail) > 0) delta = 1
    else delta = -1
    cameraController.scrollHandler.call(cameraController, delta)
  }
}

function check(gl, n, x, y, currentAngle, u_Clicked, viewProjMatrix, u_MvpMatrix) {
  var picked = false;
  gl.uniform1i(u_Clicked, 1); // Draw the cube with red
  drawCubes(gl, n, currentAngle, viewProjMatrix, u_MvpMatrix);
  // Read pixel at the clicked position
  var pixels = new Uint8Array(4); // Array for storing the pixels
  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  gl.uniform1i(u_Clicked, 0); // Pass false to u_Clicked: redraw cube
  draw(gl, n, currentAngle, viewProjMatrix, u_MvpMatrix); 
  return pixels;
}

function WebGLStart(canvasId) {
  // initialize WebGL
  const canvas = document.getElementById(canvasId)
  const gl = WebGL.createContext(canvas)
  gl.enable(gl.DEPTH_TEST)
  gl.enable(gl.BLEND)
  gl.enable(gl.CULL_FACE)
  gl.cullFace(gl.BACK)
  
  function setupViewFunctions(program) {
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
  
  const sunProgram = createProgram(gl, "tex-norm", "sun")
  const earthProgram = createProgram(gl, "tex-norm", "earth")
  const terrestialProgram = createProgram(gl, "tex-norm", "terrestial")
  const gasProgram = createProgram(gl, "tex-norm", "gas")
  const occlusionProgram = createProgram(gl, "passthrough", "occlusion")
  const radialBlurProgram = createPostProcessor(gl, "radialBlur")
  const skyboxProgram = createProgram(gl, "skybox", "skybox")
  
  setupViewFunctions(skyboxProgram)
  
  //{ Sun Program
  // properties
  //empty
  // uniform functions
  setupViewFunctions(sunProgram)
  setupTextureFunction(sunProgram, "Color")
  // per-object setup
  sunProgram.draw = function(planet, geometry) {
    gl.disableVertexAttribArray(1)
    sunProgram.setModelView(planet.transform)
    sunProgram.setColorTexture(planet.texture, 0)
    geometry.draw(
      sunProgram,
      "a_Position",
      null,
      "a_TexCoord"
    )
    gl.enableVertexAttribArray(1)
  }
  //}
  //{ Earth Program
  // properties
  earthProgram.usePointLight = true
  earthProgram.useBump = true
  earthProgram.useSpecular = true
  // uniform functions
  setupViewFunctions(earthProgram)
  setupTextureFunction(earthProgram, "DayColor")
  setupTextureFunction(earthProgram, "NightColor")
  setupTextureFunction(earthProgram, "Specular")
  setupTextureFunction(earthProgram, "Normal")
  // per-object setup
  earthProgram.draw = function(planet, geometry) {
    earthProgram.setModelViewWithNormals(planet.transform, planet.normalTransform)
    vec4.transformMat4(bufv4, origin4, planet.transform)
    vec3.copy(bufv3, bufv4)
    earthProgram.setUniform("u_PlanetPosition", bufv3)
    vec3.transformMat3(bufv3, up, planet.normalTransform)
    earthProgram.setUniform("u_PlanetUp", bufv3)
    earthProgram.setDayColorTexture(planet.texture, 0)
    earthProgram.setNightColorTexture(planet.nightTexture, 1)
    earthProgram.setNormalTexture(planet.normalTexture, 3)
    earthProgram.setSpecularTexture(planet.specularTexture, 2)
    geometry.draw(
      earthProgram,
      "a_Position",
      "a_Normal",
      "a_TexCoord"
    )
  }
  //}
  //{ Terrestial Program
  // properties
  terrestialProgram.usePointLight = true
  terrestialProgram.useBump = true
  // uniform functions
  setupViewFunctions(terrestialProgram)
  setupTextureFunction(terrestialProgram, "Color")
  setupTextureFunction(terrestialProgram, "Normal")
  // per-object setup
  terrestialProgram.draw = function(planet, geometry) {
    terrestialProgram.setModelViewWithNormals(planet.transform, planet.normalTransform)
    vec4.transformMat4(bufv4, origin4, planet.transform)
    vec3.copy(bufv3, bufv4)
    terrestialProgram.setUniform("u_PlanetPosition", bufv3)
    vec3.transformMat3(bufv3, up, planet.normalTransform)
    terrestialProgram.setUniform("u_PlanetUp", bufv3)
    terrestialProgram.setColorTexture(planet.texture, 0)
    terrestialProgram.setNormalTexture(planet.normalTexture, 3)
    geometry.draw(
      terrestialProgram,
      "a_Position",
      "a_Normal",
      "a_TexCoord"
    )
  }
  //}
  //{ Gas Program
  // properties
  gasProgram.usePointLight = true
  // uniform functions
  setupViewFunctions(gasProgram)
  setupTextureFunction(gasProgram, "Color")
  // per-object setup
  gasProgram.draw = function(planet, geometry) {
    gasProgram.setModelViewWithNormals(planet.transform)
    vec4.transformMat4(bufv4, origin4, planet.transform)
    vec3.copy(bufv3, bufv4)
    gasProgram.setUniform("u_PlanetPosition", bufv3)
    gasProgram.setColorTexture(planet.texture, 0)
    geometry.draw(
      gasProgram,
      "a_Position",
      "a_Normal",
      "a_TexCoord"
    )
  }
  //}
  //{ Occlusion Program
  setupViewFunctions(occlusionProgram)
  occlusionProgram.draw = function(planet, geometry) {
    occlusionProgram.setModelView(planet.transform)
    geometry.draw(
      sunProgram,
      "a_Position"
    )
  }
  //}
  
  setupViewFunctions(occlusionProgram)
  occlusionProgram.frameBuffer = WebGL.createFrameBuffer(
    gl, gl.viewportWidth, gl.viewportHeight
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
  
  var scene = createPlanetarium(gl, null, programs)
  initEventHandlers(canvas, null)
  scene.setTimelineController(timelineController)
  scene.addController(cameraController)
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
