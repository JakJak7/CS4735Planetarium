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

ycl.extend(ycl.WebGL || (ycl.WebGL = {}), (function() {
  function createContext(canvas) {
    if (typeof canvas === "string") {
      canvas = document.getElementById(canvas)
    }
    if (typeof canvas.getContext !== "function") {
      throw new Error("must provide a valid canvas object or id")
    }
    var gl = canvas.getContext("experimental-webgl")
    gl.viewportWidth = canvas.width
    gl.viewportHeight = canvas.height
    gl.aspect = gl.viewportWidth / gl.viewportHeight
    gl.__defineGetter__(
      "program",
      function() { return gl.getParameter(gl.CURRENT_PROGRAM) }
    )
    gl.__defineSetter__(
      "program",
      function(program) { gl.useProgram(program) }
    )
    gl.assertProgramInUse = function(program) {
      if (!program) throw new Error("Must specify a program.")
      if (gl.getParameter(gl.CURRENT_PROGRAM) != program) {
        throw new Error("Program mismatch.")
      }
    }
    return gl
  }
  
  //{ Matrix
  var MatrixStack = function(capacity) {
    const current = mat4.create()
    const list = new Array((capacity || 1) - 1)
    var next = 0
    for (var i = 0; i < list.length; ++i) {
      list[i] = mat4.create()
    }
    
    //{ Define Properties
    var that = this
    function defineField(name, value, enumerable) {
      var descriptor = { value: value }
      if (enumerable) descriptor.enumerable = true
      Object.defineProperty(that, name, descriptor)
    }
    function defineAccessor(name, get, set, enumerable) {
      if (!get && !set) throw new Error("Must define a getter or a setter.")
      var descriptor = { }
      if (get) descriptor.get = get
      if (set) descriptor.set = set
      if (enumerable) descriptor.enumerable = true
      Object.defineProperty(that, name, descriptor)
    }
    defineField("current", current, true)
    defineAccessor("count", function() {
      return next + 1
    }, null, true)
    defineAccessor("capacity", function() {
      return list.length + 1
    }, null, true)
    defineField("reset", function(value) {
      next = 0
      if (value) mat4.copy(current, value)
      else mat4.identity(current)
    })
    defineField("trim", function() {
      list.splice(next)
    })
    defineField("push", function() {
      if (list.length == next) {// push, otherwise copy
        list.push(mat4.clone(current))
      } else {
        mat4.copy(list[next], current)
      }
      ++next
    })
    defineField("pop", function() {
      if (next < 0) throw new Error("MatrixStack underflow")
      mat4.copy(current, list[--next])
    })
    //}
  }
  MatrixStack.prototype = {
    adjoint: function(other) {
      mat4.adjoint(this.current, other||this.current)
    },
    clone: function() {
      return mat4.clone(this.current)
    },
    copyFrom: function(a) {
      mat4.copy(this.current, a)
    },
    copyTo: function(out) {
      mat4.copy(out, this.current)
    },
    determinant: function() {
      return mat4.determinant(this.current)
    },
    fromQuat: function(q) {
      mat4.fromQuat(this.current, q)
    },
    fromRotationTranslation: function(q, v) {
      mat4.fromRotationTranslation(this.current, q, v)
    },
    frustum: function(left, right, bottom, top, near, far) {
      mat4.frustum(this.current, left, right, bottom, top, near, far)
    },
    identity: function() {
      mat4.identity(this.current)
    },
    invert: function(other) {
      mat4.invert(this.current, other||this.current)
    },
    lookAt: function(eye, center, up) {
      if (arguments.length == 1 && eye instanceof LookAtCamera) {
        eye.toMat4(this.current)
      } else {
        mat4.lookAt(this.current, eye, center, up)
      }
    },
    multiply: function(b, other) {
      mat4.mul(this.current, other||this.current, b)
    },
    multiplyFrom: function(a, other) {
      mat4.mul(this.current, a, other||this.current)
    },
    ortho: function(left, right, bottom, top, near, far) {
      mat4.ortho(this.current, left, right, bottom, top, near, far)
    },
    perspective: function(fovy, aspect, near, far) {
      mat4.perspective(this.current, fovy, aspect, near, far)
    },
    rotate: function(rad, axis, other) {
      mat4.rotate(this.current, other||this.current, rad, axis)
    },
    rotateX: function(rad, other) {
      mat4.rotateX(this.current, other||this.current, rad)
    },
    rotateY: function(rad, other) {
      mat4.rotateY(this.current, other||this.current, rad)
    },
    rotateZ: function(rad, other) {
      mat4.rotateZ(this.current, other||this.current, rad)
    },
    scale: function(v, other) {
      mat4.scale(this.current, other||this.current, v)
    },
    str: function() {
      return mat4.str(this.current)
    },
    translate: function(v, other) {
      mat4.translate(this.current, other||this.current, v)
    },
    transpose: function(other) {
      mat4.transpose(this.current, other||this.current)
    }
  }
  MatrixStack.prototype.mul = MatrixStack.prototype.multiply
  
  function LookAtCamera(eye, center, up) {
    Object.defineProperty(this, "eye", { value: vec3.create() })
    Object.defineProperty(this, "center", { value: vec3.create() })
    Object.defineProperty(this, "up", { value: vec3.create() })
    
    if (eye) vec3.copy(this.eye, eye)
    if (center) vec3.copy(this.center, center)
    if (up) vec3.copy(this.up, up)
  }
  LookAtCamera.prototype = {
    toMat4: function(out) {
      mat4.lookAt(out, this.eye, this.center, this.up)
    },
    normalizeUpY: (function() {
      const lookVec3 = vec3.create()
      const axleVec3 = vec3.create()
      const rotQuat = quat.create()
      const up = [0, 1, 0]
      
      return function() {
        vec3.sub(lookVec3, this.center, this.eye)
        vec3.cross(axleVec3, lookVec3, up)
        quat.setAxisAngle(rotQuat, axleVec3, -Math.PI_2)
        vec3.transformQuat(lookVec3, lookVec3, rotQuat)
        vec3.normalize(this.up, lookVec3)
      }
    }()),
    clone: function() {
      return new LookAtCamera(this.eye, this.center, this.up)
    }
  }
  //}
  
  //{ Program
  var uniformTable = {
    0x1406: function(gl, handle, value) {
      gl.uniform1f(handle, value)
    },
    0x8B50: function(gl, handle, value) {
      gl.uniform2fv(handle, value)
    },
    0x8B51: function(gl, handle, value) {
      gl.uniform3fv(handle, value)
    },
    0x8B52: function(gl, handle, value) {
      gl.uniform4fv(handle, value)
    },
    0x8B53: function(gl, handle, value) {
      gl.uniform2iv(handle, value)
    },
    0x8B54: function(gl, handle, value) {
      gl.uniform3iv(handle, value)
    },
    0x8B55: function(gl, handle, value) {
      gl.uniform4iv(handle, value)
    },
    0x8B56: function(gl, handle, value) {
      if (value.length) {
        gl.uniform1iv(handle, value)
      } else {
        gl.uniform1i(handle, value)
      }
    },
    0x8B57: null, // BOOL_VEC2
    0x8B58: null, // BOOL_VEC3
    0x8B59: null, // BOOL_VEC4
    0x8B5A: function(gl, handle, value) {
      gl.uniformMatrix2fv(handle, false, value)
    },
    0x8B5B: function(gl, handle, value) {
      gl.uniformMatrix3fv(handle, false, value)
    },
    0x8B5C: function(gl, handle, value) {
      gl.uniformMatrix4fv(handle, false, value.current || value)
    },
    0x8B5E: function(gl, handle, value) {
      if (value instanceof Int32Array) {
        gl.uniform1iv(handle, value)
      } else {
        gl.uniform1i(handle, value)
      }
    },
    0x8B60: null, // SAMPLER_CUBE
  }
  
  function createShader(gl, type, source, name) {
    var msg
    const shader = gl.createShader(type)
    shader.type = type
    
    // compile the shader
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    
    // alert if error occurs
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      msg = name
        ? "In " + name + " - "
        : ""
      msg += gl.getShaderInfoLog(shader)
      throw new Error(msg)
    }
    
    return shader
  }
  function createShaderFromHTML(gl, id, name) {
    var type, source
    var shader = document.getElementById(id)
    if (!name) name = id
    if (!shader) throw new Error("shader element \"" + id + "\" not found!")
    if (shader.nodeName != "SCRIPT") {
      throw new Error("shader must be contained in a script tag!")
    }
    
    // store firstChild for future use
    var node = shader.firstChild
    
    // determine the type of shader to load
    if (shader.type == "x-shader/x-fragment") {
      type = gl.FRAGMENT_SHADER
    } else if (shader.type == "x-shader/x-vertex") {
      type = gl.VERTEX_SHADER
    } else {
      throw new Error("invalid type attribute on script")
    }
    
    // extract text from the original HTML node
    source = ""
    while (node) {
      if (node.nodeType == 3) {
        source += node.textContent
      }
      node = node.nextSibling
    }
    
    return createShader(gl, type, source, name)
  }
  function createProgram(gl, vertexShader, fragmentShader, vertexName, fragmentName, programName) {
    const program = gl.createProgram()
    const prefix = programName
      ? programName + "-"
      : ""
    gl.attachShader(program, vertexShader, prefix + vertexName)
    gl.attachShader(program, fragmentShader, prefix + fragmentName)
    gl.linkProgram(program)
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error("could not initialise shaders")
    }
    
    function Attribute(activeInfo, index) {
      Location.call(this, activeInfo, index)
      this.isAttribute = true
      Object.freeze(this)
    }
    Attribute.prototype = {
      enable: function() {
        gl.enableVertexAttribArray(this.index)
      },
      disable: function() {
        gl.disableVertexAttribArray(this.index)
      },
      setPointer: function(buffer) {
        gl.vertexAttribPointer(
          this.index, buffer.itemSize, buffer.dataType,
          false, 0, 0
        )
      }
    }
    function Uniform(activeInfo, index) {
      Location.call(this, activeInfo, index)
      this.isUniform = true
      this.handle = gl.getUniformLocation(program, this.name)
      this.handler = uniformTable[this.type]
      Object.freeze(this)
    }
    Uniform.prototype = {
      get: function() { return gl.getUniform(program, this.handle) },
      set: function(value) { this.handler(gl, this.handle, value) }
    }
    function Location(activeInfo, index) {
      this.gl = gl
      this.program = program
      this.size = activeInfo.size
      this.type = activeInfo.type
      this.name = activeInfo.name
      this.index = index
    }
    
    var locations = {}, i
    i = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES)
    gl.useProgram(program)
    while (--i >= 0) {
      var location = gl.getActiveAttrib(program, i)
      gl.enableVertexAttribArray(i)
      locations[location.name] = new Attribute(location, i)
    }
    i = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
    while (--i >= 0) {
      var location = gl.getActiveUniform(program, i)
      locations[location.name] = new Uniform(location, i)
    }
    program.__defineGetter__("gl", function() { return gl })
    program.registerAttribute = function(attribName, alias) {
      if (!attribName) throw new Error("Must specify an attribute name.")
      var name = alias || attribName
      if (name in program) {
        throw new Error("name \"" + alias + "\" already in use")
      }
      
      var attribObj = locations[attribName]
      if (!attribObj) {
        throw new Error("Attribute \"" + attribName + "\" not found.")
      }
      program.__defineGetter__(
        name, function() { return attribObj }
      )
    }
    program.registerUniform = function(uniformName, alias) {
      if (!attribName) throw new Error("Must specify an attribute name.")
      var name = alias || uniformName
      if (name in program) {
        throw new Error("name \"" + alias + "\" already in use")
      }
      
      var uniformObj = locations[uniformName]
      if (!uniformObj) {
        throw new Error("Uniform \"" + uniformName + "\" not found.")
      }
      program.__defineGetter__(
        name, function() { return uniformObj }
      )
    }
    program.getAttribute = function(attributeName) {
      var attribute = locations[attributeName]
      if (!(attribute instanceof Attribute)) {
        throw new Error("attribute \"" + attributeName + "\" does not exist")
      }
      return locations[attributeName]
    }
    program.getAttributeLocation = function(attributeName) {
      return this.getAttribute(attributeName).index
    }
    program.getUniform = function(uniformName) {
      var uniform = locations[uniformName]
      if (!(uniform instanceof Uniform)) {
        throw new Error("uniform \"" + uniformName + "\" does not exist")
      }
      return gl.getUniform(program, uniform.handle)
    }
    program.setUniform = function(uniformName, value, ignoreError) {
      var uniform = locations[uniformName]
      if (!(uniform instanceof Uniform)) {
        if (ignoreError) return
        throw new Error("uniform \"" + uniformName + "\" does not exist")
      }
      uniform.handler(gl, uniform.handle, value)
    }
    program.use = function() {
      gl.useProgram(program)
      return program
    }
    
    return program
  }
  function createProgramFromHTML(gl, vertexId, fragmentId, name) {
    return createProgram(
      gl,
      createShaderFromHTML(gl, vertexId),
      createShaderFromHTML(gl, fragmentId),
      vertexId, fragmentId, name
    )
  }
  
  function _setUniformMatrix4(program, name, value) {
    var uniform = program[name]
    if (!uniform || !(uniform instanceof WebGLUniformLocation)) {
      throw new Error("invalid uniform \"" + name + "\"")
    }
    program.gl.uniformMatrix4fv(uniform, false, value)
  }
  
  var createPostProcessorFromHTML = (function() {
    //{ default vertex shader
    var defVShader= (function() {
      var shader = null
      var src = "attribute vec2 a;varying vec2 v_TexCoord;void main(){gl_Position=vec4(a*2.0-1.0,0.0,1.0);v_TexCoord=a;}"
      return function(gl) {
        return (
          shader ||
          (shader = createShader(gl, gl.VERTEX_SHADER, src))
        )
      }
    }())
    
    var draw = (function() {
      var buffer
      var coords = [0, 0, 0, 1, 1, 0, 1, 1]
      
      return function(gl, program) {
        if (!buffer) buffer = createFloatBuffer(gl, coords, 2)
        buffer.bindAttribute(program, "a")
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }
    }())
    //}
    
    return function(gl, id) {
      const fShader = createShaderFromHTML(gl, id)
      const program = createProgram(gl, defVShader(gl), fShader)
      program.draw = function(texture, unit) {
        gl.activeTexture(unit + gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, texture)
        program.setUniform("u_Sampler", unit)
        draw(gl, program)
      }
      return program
    }
  }())
  //}
  
  //{ Buffers
  function _createBuffer(gl, bufferType, data, size) {
    var buffer = gl.createBuffer()
    var count = data.length / size
    gl.bindBuffer(bufferType, buffer)
    gl.bufferData(bufferType, data, gl.STATIC_DRAW)
    function bind() { gl.bindBuffer(bufferType, buffer) }
    buffer.__defineGetter__("gl", function() { return gl })
    buffer.__defineGetter__("type", function() { return bufferType })
    buffer.__defineGetter__("itemSize", function() { return size })
    buffer.__defineGetter__("itemCount", function() { return count })
    buffer.__defineGetter__("dataType", function() { return gl.FLOAT })
    buffer.bind = bind
    buffer.bindAttribute = function(program, propName) {
      bind()
      program.getAttribute(propName).setPointer(buffer)
    }
    return buffer
  }
  function _createDrawBuffer(gl, itemType, data, size) {
    var buffer = _createBuffer(
      gl, gl.ARRAY_BUFFER,
      data, size
    )
    buffer.__defineGetter__("itemType", function() { return itemType })
    buffer.draw = function(program, propName) {
      gl.bindBuffer(buffer.type, buffer)
      gl.vertexAttribPointer(
        program.getAttributeLocation(propName),
        buffer.itemSize,
        gl.FLOAT,
        false, 0, 0
      )
      gl.drawArrays(
        itemType,
        0,
        buffer.itemCount
      )
    }
    return buffer
  }
  
  function createFloatBuffer(gl, data, itemSize) {
    var length = data.length
    if (length < itemSize) throw new Error("must contain at least one item")
    if (length % itemSize != 0) throw new Error("must contain whole items only")
    return _createBuffer(
      gl,
      gl.ARRAY_BUFFER,
      data instanceof Float32Array
        ? data
        : new Float32Array(data),
      itemSize,
      length / itemSize
    )
  }
  function createIndexBuffer(gl, indices, vertices, geometryType) {
    var indexLength = indices.length
    if (indexLength < 1) throw new Error("must contain at least one index")
    var vertexLength = vertices.length
    if (vertexLength < 3) throw new Error("must contain at least one vertex")
    if (vertexLength % 3 != 0) throw new Error("must only contain whole vertices")
    var max = 0
    for (var i = 0; i < indexLength; ++i) {
      var val = indices[i]
      if (val > max) max = val
    }
    var itemType
    if (max < 256) {
      indices = new Uint8Array(indices)
      itemType = gl.UNSIGNED_BYTE
    } else if (max < 65536) {
      indices = new Uint16Array(indices)
      itemType = gl.UNSIGNED_SHORT
    } else {
      indices = new Uint32Array(indices)
      itemType = gl.UNSIGNED_INT
    }
    var indexBuffer = _createBuffer(
      gl, gl.ELEMENT_ARRAY_BUFFER, indices, 1
    )
    var vertexBuffer = _createBuffer(
      gl, gl.ARRAY_BUFFER, new Float32Array(vertices), 3
    )
    indexBuffer.__defineGetter__(
      "itemType", function() { return itemType }
    )
    indexBuffer.__defineGetter__(
      "vertexBuffer", function() { return vertexBuffer }
    )
    indexBuffer.__defineGetter__(
      "geometryType", function() { return geometryType }
    )
    indexBuffer.draw = function(program, propName) {
      vertexBuffer.bindAttribute(program, propName)
      indexBuffer.bind()
      gl.drawElements(
        geometryType,
        indexLength,
        itemType, 0
      )
    }
    return indexBuffer
  }
  function createTriangleBuffer(gl, vertices) {
    var length = vertices.length
    if (length < 9) throw new Error("must contain at least one triangle")
    if (length % 9 != 0) throw new Error("must contain whole triangles only")
    return _createDrawBuffer(
      gl, gl.TRIANGLES,
      new Float32Array(vertices), 3, length / 3
    )
  }
  function createTriangleStripBuffer(gl, vertices) {
    var length = vertices.length
    if (length < 9) throw new Error("must contain at least one triangle")
    if (length % 3 != 0) throw new Error("must contain whole vertices only")
    return _createDrawBuffer(
      gl, gl.TRIANGLE_STRIP,
      new Float32Array(vertices), 3, length / 3
    )
  }
  function createPointBuffer(gl, vertices) {
    var length = vertices.length
    if (length < 3) throw new Error("must contain at least one point")
    if (length % 3 != 0) throw new Error("must contain whole points only")
    return _createDrawBuffer(
      gl, gl.POINTS,
      new Float32Array(vertices), 1, length
    )
  }
  
  function createTexture(gl, url, callback, crossDomain) {
    var texture = gl.createTexture()
    var image = new Image()
    var loaded = false
    var error = false
    image.onload = function() {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, texture);
      
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image)
      if (!error) loaded = true
      if (callback) callback(texture, image)
    }
    image.onerror = function() {
      loaded = false
      error = true
      console.log("loading error")
    }
    if (crossDomain) {
      image.crossOrigin = crossDomain === true
        ? "anonymous"
        : crossDomain
    }
    image.src = url
    
    texture.__defineGetter__("image", function() { return image })
    texture.__defineGetter__("isLoaded", function() { return loaded })
    texture.__defineGetter__("hasError", function() { return error })
    return texture
  }
  
  function createFrameBuffer(gl, width, height) {
    var colorTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, colorTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texImage2D(
      gl.TEXTURE_2D, 0,
      gl.RGBA, width, height, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, null
    )
    
    var frameBuffer = gl.createFramebuffer()
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer)
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      colorTexture,
      0
    )
    
    // create renderbuffer
    var depthBuffer = gl.createRenderbuffer()
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer)
    
    // allocate renderbuffer
    gl.renderbufferStorage(
      gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height
    )
    
    // attach renderebuffer
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER,
      depthBuffer
    )
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
      throw new Error("this combination of attachments does not work")
    }
    
    frameBuffer.bind = function() {
      gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer)
    }
    frameBuffer.viewportFull = function() {
      gl.viewport(0, 0, width, height)
    }
    frameBuffer.texture = colorTexture
    return frameBuffer
  }
  //}
  
  return {
    $MatrixStack  : MatrixStack,
    $LookAtCamera : LookAtCamera,
    
    createContext         : createContext,
    createProgram         : createProgram,
    createProgramFromHTML : createProgramFromHTML,
    createShaderFromHTML  : createShaderFromHTML,
    
    createPostProcessorFromHTML : createPostProcessorFromHTML,
    
    createIndexBuffer         : createIndexBuffer,
    createPointBuffer         : createPointBuffer,
    createTriangleBuffer      : createTriangleBuffer,
    createTriangleStripBuffer : createTriangleStripBuffer,
    
    createFloatBuffer  : createFloatBuffer,
    createVertexBuffer : function(gl, data) {
      return createFloatBuffer(gl, data, 3)
    },
    createColorBuffer  : function(gl, data) {
      return createFloatBuffer(gl, data, 4)
    },
    
    createTexture : createTexture,
    
    createFrameBuffer : createFrameBuffer,
    
    createMatrixStack  : function(capacity) {
      return new MatrixStack(capacity)
    },
    createLookAtCamera : function(eye, center, up) {
      return new LookAtCamera(eye, center, up)
    },
  }
})())

