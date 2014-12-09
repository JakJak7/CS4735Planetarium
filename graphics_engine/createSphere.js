function createSphere(gl, latitudeBands, longitudeBands) {
	if (!gl) throw "gl and texture must not be null"
	if (!latitudeBands) latitudeBands = 30
	if (!longitudeBands) longitudeBands = 30
	var normalData = []
	var textureCoordData = []
	for (var iLat = 0; iLat <= latitudeBands; iLat++) {
		var theta = iLat * Math.PI / latitudeBands
		var sinTheta = Math.sin(theta)
		var cosTheta = Math.cos(theta)
		
		for (var iLong = 0; iLong <= longitudeBands; iLong++) {
			var phi = iLong * Math.PI2 / longitudeBands
			var sinPhi = Math.sin(phi)
			var cosPhi = Math.cos(phi)
			
			var x = cosPhi * sinTheta
			var y = cosTheta
			var z = sinPhi * sinTheta
			var u = 1 - (iLong / longitudeBands)
			var v = 1 - (iLat / latitudeBands)
			
			normalData.push(x)
			normalData.push(y)
			normalData.push(z)
			textureCoordData.push(u)
			textureCoordData.push(v)
		}
	}
	var indexData = []
	for (var iLat = 0; iLat < latitudeBands; iLat++) {
		for (var iLong = 0; iLong < longitudeBands; iLong++) {
			var first = (iLat * (longitudeBands + 1)) + iLong
			var second = first + longitudeBands + 1
			indexData.push(first)
			indexData.push(first + 1)
			indexData.push(second)
			
			indexData.push(second)
			indexData.push(first + 1)
			indexData.push(second + 1)
		}
	}
	
	normalBuffer = ycl.WebGL.createVertexBuffer(gl, normalData)
	
	textureCoordBuffer = ycl.WebGL.createFloatBuffer(
		gl, textureCoordData, 2
	)
	indexBuffer = ycl.WebGL.createIndexBuffer(
		gl, indexData, normalData, gl.TRIANGLES
	)
	
	return {
		get gl() { return gl },
		draw : function(
			program,
			positionName,
			normalName,
			textureName
		) {
			if (textureName) {
				textureCoordBuffer.bindAttribute(program, textureName)
			}
			if (normalName) {
				normalBuffer.bindAttribute(program, normalName)
			}
			if (positionName) {
				indexBuffer.draw(program, positionName)
			}
		}
	}
}
