// RotatingTriangle.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'varying vec4 v_Position;\n' +
  'varying vec4 v_Magic;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'void main() {\n' +
  '  gl_Position = u_ModelMatrix * a_Position;\n' +
  '  v_Magic = u_ModelMatrix * a_Position;\n' +
  '  v_Position = a_Position;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif GL_ES\n' +
  'varying vec4 v_Position;\n' +
  'varying vec4 v_Magic;\n' +
  'uniform bool u_Clicked;\n' +
  'void main() {\n' +
  '  if(u_Clicked) gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);\n' +
  '  else gl_FragColor = v_Position;\n' +
  '}\n';

// Rotation angle (degrees/second)
var ANGLE_STEP = 180.0;

function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  var gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  
  //enable hidden surface removal
  gl.enable(gl.DEPTH_TEST);

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }
  
  //totally works
  var u_Clicked = gl.getUniformLocation(gl.program, 'u_Clicked');
  
  gl.uniform1i(u_Clicked,0);

  // Write the positions of vertices to a vertex shader
  var n = initVertexBuffers(gl);
  if (n < 0) {
    console.log('Failed to set the positions of the vertices');
    return;
  }

  // Specify the color for clearing <canvas>
  //gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Get storage location of u_ModelMatrix
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) { 
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  // Current rotation angle
  var currentAngle = 0.0;
  // Model matrix
  var modelMatrix = new Matrix4();
  // Register event handler
  canvas.onmousedown = function(ev) {
    var x = ev.clientX, y = ev.clientY;
	var rect = ev.target.getBoundingClientRect();
	if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
		 // Check if it is on object
		 var x_in_canvas = x - rect.left, y_in_canvas = rect.bottom - y;
		 var picked = check(gl, n, x_in_canvas, y_in_canvas, currentAngle,u_Clicked, modelMatrix, u_ModelMatrix);
		 if (picked) alert('The cube was selected! ');
	 }
  }

  // Start drawing
  var tick = function() {
    currentAngle = animate(currentAngle);  // Update the rotation angle
    draw(gl, n, currentAngle, modelMatrix, u_ModelMatrix);   // Draw the triangle
    requestAnimationFrame(tick, canvas); // Request that the browser calls tick
  };
  tick();
}

 function check(gl, n, x, y, currentAngle, u_Clicked, viewProjMatrix, u_MvpMatrix) {
	 var picked = false;
	 gl.uniform1i(u_Clicked, 1); // Draw the cube with red
	 draw(gl, n, currentAngle, viewProjMatrix, u_MvpMatrix);
	 // Read pixel at the clicked position
	 var pixels = new Uint8Array(4); // Array for storing the pixels
	 gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
	 if (pixels[0] == 255)
	 // The mouse in on cube if pixels[0] is 255
	 picked = true;
	 gl.uniform1i(u_Clicked, 0); // Pass false to u_Clicked: redraw cube
	 draw(gl, n, currentAngle, viewProjMatrix, u_MvpMatrix); 
	 return picked;
 }

function initVertexBuffers(gl) {
  var vertices = new Float32Array ([
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
  ]);
  var n = 36;   // The number of vertices

  // Create a buffer object
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return -1;
  }
  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // Write date into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  // Assign the buffer object to a_Position variable
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if(a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return -1;
  }
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  
  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);

  return n;
}

function draw(gl, n, currentAngle, modelMatrix, u_ModelMatrix) {
  // Set the rotation matrix
  modelMatrix.setRotate(currentAngle, Math.cos(currentAngle/50), 1, Math.sin(currentAngle/100)); // Rotation angle, rotation axis (0, 0, 1)
  //modelMatrix.setRotate(-90,1,0,0)
  
  //translate matrix
  modelMatrix.translate(-0.5,-0.5,-0.5);
  
  // Pass the rotation matrix to the vertex shader
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
	
  // Draw the rectangle
  gl.drawArrays(gl.TRIANGLES, 0, n);
}

// Last time that this function was called
var g_last = Date.now();
function animate(angle) {
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  g_last = now;
  // Update the current rotation angle (adjusted by the elapsed time)
  var newAngle = angle + (ANGLE_STEP * elapsed) / 1000.0;
  return newAngle %= 360;
}
