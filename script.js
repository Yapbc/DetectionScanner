const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const startButton = document.getElementById('startButton');
const statusDisplay = document.getElementById('status');
const errorDisplay = document.getElementById('error');

const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
if (!gl) {
    errorDisplay.textContent = 'WebGL not supported. Showing raw feed only.';
    statusDisplay.textContent = '';
    console.error('WebGL not supported');
} else {
    console.log('WebGL supported');
}

let program;
let texture;

// Vertex shader
const vertexShaderSource = `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    varying vec2 v_texCoord;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
    }
`;

// Fragment shader
const fragmentShaderSource = `
    precision highp float;
    varying vec2 v_texCoord;
    uniform sampler2D u_texture;
    void main() {
        vec4 feed = texture2D(u_texture, v_texCoord);
        vec3 yellow = vec3(1.0, 1.0, 0.0);
        vec3 diff = abs(feed.rgb - yellow);
        gl_FragColor = vec4(diff, 1.0);
    }
`;

// Mobile-optimized constraints
const constraints = {
    video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 320 },
        height: { ideal: 240 }
    }
};

// Start camera on button click
startButton.addEventListener('click', () => {
    console.log('Start button clicked');
    startButton.disabled = true;
    statusDisplay.textContent = 'Requesting camera access...';
    
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            console.log('Camera access granted');
            statusDisplay.textContent = 'Webcam accessed, initializing...';
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                console.log(`Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`);
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                statusDisplay.textContent = 'Webcam ready, starting render...';
                video.play().then(() => {
                    console.log('Video playing');
                    if (gl) {
                        initWebGL();
                        render();
                        video.style.display = 'none';
                        canvas.style.display = 'block';
                    } else {
                        statusDisplay.textContent = 'Raw feed active (no WebGL)';
                    }
                }).catch(err => {
                    errorDisplay.textContent = `Video play failed: ${err.message}`;
                    statusDisplay.textContent = '';
                    console.error('Video play error:', err);
                });
            };
        })
        .catch(err => {
            errorDisplay.textContent = `Webcam access failed: ${err.message}`;
            statusDisplay.textContent = '';
            console.error('Webcam error:', err);
            startButton.disabled = false;
        });
});

// Initialize WebGL
function initWebGL() {
    console.log('Initializing WebGL');
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    program = createProgram(gl, vertexShader, fragmentShader);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,  0, 1,
         1, -1,  1, 1,
        -1,  1,  0, 0,
         1,  1,  1, 0
    ]), gl.STATIC_DRAW);

    texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    const texCoordLoc = gl.getAttribLocation(program, 'a_texCoord');

    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLoc);
    gl.enableVertexAttribArray(texCoordLoc);

    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 16, 8);

    gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);
    statusDisplay.textContent = 'WebGL initialized, rendering...';
    console.log('WebGL initialized');
}

// Render loop
function render() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(render);
}

// Shader helpers
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}