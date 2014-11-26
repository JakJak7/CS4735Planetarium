// RotatingTriangle.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  '#line 5\n' +
  'attribute vec4 a_Position;\n' +
  'varying vec4 v_Position;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'void main() {\n' +
  '  gl_Position = u_ModelMatrix * a_Position;\n' +
  '  v_Position = a_Position;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  '#line 16\n' +
  '#ifdef GL_ES\n' +
  'precision mediump float;\n' +
  '#endif GL_ES\n' +
  'varying vec4 v_Position;\n' +
  'uniform bool u_Clicked;\n' +
  'uniform vec4 u_Id;\n' +
  'void main() {\n' +
  '  if(u_Clicked) gl_FragColor = u_Id;\n' +
  '  else gl_FragColor = v_Position;\n' +
  '}\n';

// Rotation angle (degrees/second)
var ANGLE_STEP = 40.0;
var u_Id;

// Used to find camera position relative to gaze vector
var latitude = 0, longitude = 0, radius = 2;
Math.PI_2 = Math.PI/2;

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
  u_Id = gl.getUniformLocation(gl.program, 'u_Id');
  
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
	var mouseDown = false, mouseMove = false, hasBreached = false;
	var element = canvas;
	var oldX, oldY;
	element.addEventListener("mousedown", function(ev){
		mouseDown = true;
		mouseMove = false;
		oldX = ev.pageX, oldY = ev.pageY;
		//console.log(Xbefore+","+Ybefore);
	}, false);
	element.addEventListener("mousemove", function(ev){
		var currentX = ev.clientX, currentY = ev.clientY;
		var deltaX = currentX-oldX, deltaY = currentY-oldY;
		var distMoved = Math.sqrt(Math.pow(deltaX,2)+Math.pow(deltaY,2));
		if(mouseDown && distMoved > 5){
			mouseMove = true;
			hasBreached = true;
		}
		if(hasBreached){
			//console.log("move, "+Math.PI_2);
			latitude+=deltaY/100;
			
			// stop the latitude from wrapping around
			if(latitude>Math.PI_2){
				latitude=Math.PI_2;
			}
			else if(latitude<-Math.PI_2){
				latitude=-Math.PI_2;
			}
			longitude+=deltaX/100;
			oldX = currentX;
			oldY = currentY;
		}
		//var deltaX = ev.clientX-Xbefore, deltaY = ev.clientY-Ybefore;
	}, false);
	element.addEventListener("mouseup", function(ev){
		mouseDown = false;
		hasBreached = false;
		if(!mouseMove){
			//console.log("click");
			
			var x = ev.clientX, y = ev.clientY;
			//console.log("up at: "+x+","+y);
			var rect = ev.target.getBoundingClientRect();
			if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
				 // Check if it is on object
				 var x_in_canvas = x - rect.left, y_in_canvas = rect.bottom - y;
				 var picked = check(gl, n, x_in_canvas, y_in_canvas, currentAngle,u_Clicked, modelMatrix, u_ModelMatrix);
				 //var gazeVectorOld = new Float32Array(gazeVector); // backup the old gaze vector, used to transition the camera smoothly
				 if (picked[0] == 255)
					  targetGaze = new Float32Array(cube1Center);
				 else if (picked[1] == 255) 
					  targetGaze = new Float32Array(cube2Center);//alert('The cube2 was selected! ');
				 else if (picked[2] == 255) 
					  targetGaze = new Float32Array(cube3Center);
				 else if (picked[2] == 128) 
					  targetGaze = new Float32Array(cube4Center);
			 }
		}
		else if(mouseDown === 1){
			console.log("drag");
			//console.log("deltaX: "+deltaX+" Y: "+deltaY);
		}
	}, false);

  // Start drawing
  var tick = function() {
	animateCamera(); // Smoothly transition camera
    currentAngle = animate(currentAngle);  // Update the rotation angle
    drawCubes(gl, n, currentAngle, modelMatrix, u_ModelMatrix);
    requestAnimationFrame(tick, canvas); // Request that the browser calls tick
  };
  tick();
}

var cube1Center = new Float32Array([-1,0,0]); //find way to dynamically find these! (I guess they're given anyways)
var cube2Center = new Float32Array([1,0,0]);
var cube3Center = new Float32Array([0,0,1]);
var cube4Center = new Float32Array([0,0,-1]); // store these in a better way...
var gazeVector = new Float32Array([0,0,0]);
var targetGaze = new Float32Array(gazeVector);
function drawCubes(gl, n, currentAngle, modelMatrix, u_ModelMatrix){
    //modelMatrix.setIdentity();
    modelMatrix.setPerspective(90,1,0.5,500); //-1,1,-1,1,0.5,500);
    //modelMatrix.lookAt(1,0,1, 0,0,0 ,0,1,0);
    var x = radius*Math.cos(latitude)*Math.cos(longitude)+gazeVector[0];
    var z = radius*Math.cos(latitude)*Math.sin(longitude)+gazeVector[2];
    var y = radius*Math.sin(latitude)+gazeVector[1];
    //console.log(x+", "+y+", "+z);
    modelMatrix.lookAt(x,y,z,gazeVector[0],gazeVector[1],gazeVector[2] ,0,1,0);
    
    var modelMatrixChild = new Matrix4(modelMatrix);
    modelMatrixChild.translate(cube1Center[0],cube1Center[1],cube1Center[2]);
    modelMatrixChild.scale(0.5,0.5,0.5);
    // Clear <canvas>
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	 gl.uniform4f(u_Id,1,0,0,1);
    draw(gl, n, currentAngle, modelMatrixChild, u_ModelMatrix);   // Draw the triangle
    
    modelMatrixChild = new Matrix4(modelMatrix);
    modelMatrixChild.translate(cube2Center[0],cube2Center[1],cube2Center[2]);
    modelMatrixChild.scale(0.5,0.5,0.5);
	 gl.uniform4f(u_Id,0,1,0,1);
    draw(gl, n, currentAngle, modelMatrixChild, u_ModelMatrix);   // Draw the triangle
    
    
    modelMatrixChild = new Matrix4(modelMatrix);
    modelMatrixChild.translate(cube3Center[0],cube3Center[1],cube3Center[2]);
    modelMatrixChild.scale(0.5,0.5,0.5);
	 gl.uniform4f(u_Id,0,0,1,1);
    draw(gl, n, currentAngle, modelMatrixChild, u_ModelMatrix);   // Draw the triangle
    
    modelMatrixChild = new Matrix4(modelMatrix);
    modelMatrixChild.translate(cube4Center[0],cube4Center[1],cube4Center[2]);
    modelMatrixChild.scale(0.5,0.5,0.5);
	 gl.uniform4f(u_Id,0,0,0.5,1);
    draw(gl, n, currentAngle, modelMatrixChild, u_ModelMatrix);   // Draw the triangle
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
	var transformMat = new Matrix4(modelMatrix);
  // Set the rotation matrix
  //modelMatrix.rotate(currentAngle, Math.cos(currentAngle/50), 1, Math.sin(currentAngle/100)); // Rotation angle, rotation axis (0, 0, 1)
  transformMat.rotate(currentAngle, Math.cos(currentAngle/50), 1, Math.sin(currentAngle/100)); // Rotation angle, rotation axis (0, 0, 1)
  //modelMatrix.setRotate(-90,1,0,0)
  
  //translate matrix
  //modelMatrix.translate(-0.5,-0.5,-0.5);
  transformMat.translate(-0.5,-0.5,-0.5);
  
  // Pass the rotation matrix to the vertex shader
  //gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
  gl.uniformMatrix4fv(u_ModelMatrix, false, transformMat.elements);
	
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

function animateCamera(angle) {
  // Calculate the elapsed time
  var now = Date.now();
  var elapsed = now - g_last;
  //g_last = now; // don't update the last timestamp before animate() is called!
  // Update the current rotation angle (adjusted by the elapsed time)
  var speed = elapsed;
  //console.log(elapsed);
  gazeVector[0] += (targetGaze[0]-gazeVector[0])*(speed/1000);
  gazeVector[1] += (targetGaze[1]-gazeVector[1])*(speed/1000);
  gazeVector[2] += (targetGaze[2]-gazeVector[2])*(speed/1000);
}
