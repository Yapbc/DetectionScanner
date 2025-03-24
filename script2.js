///////THIS IS WITHOUT ARTIFACT THRESHOLD & ADVANCED DETECTION MODE//////////////////////////////////



document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const imageUpload = document.getElementById('imageUpload');
    const uploadedImage = document.getElementById('uploadedImage');
    const videoElement = document.getElementById('webcam');
    const canvasElement = document.getElementById('canvas');
    const startButton = document.getElementById('startButton');
    const statusDisplay = document.getElementById('status');
    const errorDisplay = document.getElementById('error');
    const videoContainer = document.querySelector('.video-container');
    
    // Create color picker element if it doesn't exist
    const colorPickerContainer = document.createElement('div');
    colorPickerContainer.className = 'color-picker-container';
    
    const colorPickerLabel = document.createElement('label');
    colorPickerLabel.setAttribute('for', 'colorPicker');
    colorPickerLabel.textContent = 'BASE COLOR:';
    
    const colorPicker = document.createElement('input');
    colorPicker.type = 'color';
    colorPicker.id = 'colorPicker';
    colorPicker.value = '#32de84'; // Default green color
    
    colorPickerContainer.appendChild(colorPickerLabel);
    colorPickerContainer.appendChild(colorPicker);
    
    // Insert color picker after controls container
    const controlsContainer = document.querySelector('.controls-container');
    controlsContainer.appendChild(colorPickerContainer);
    
    // Add camera switch button for mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    let currentFacingMode = 'environment'; // Start with back camera
    
    if (isMobile) {
        const cameraSwitchContainer = document.createElement('div');
        cameraSwitchContainer.className = 'camera-switch-container';
        
        const switchCameraButton = document.createElement('button');
        switchCameraButton.id = 'switchCameraButton';
        switchCameraButton.textContent = 'SWITCH CAMERA';
        switchCameraButton.className = 'control-button';
        switchCameraButton.style.display = 'none'; // Initially hidden
        
        cameraSwitchContainer.appendChild(switchCameraButton);
        controlsContainer.appendChild(cameraSwitchContainer);
        
        // Add event listener for camera switch button
        switchCameraButton.addEventListener('click', switchCamera);
    }
    
    // Function to switch between front and back cameras on mobile devices
    function switchCamera() {
        if (!isMobile) return; // Only works on mobile
        
        // Toggle facing mode
        currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
        
        // Update status display
        statusDisplay.textContent = `SWITCHING TO ${currentFacingMode === 'environment' ? 'BACK' : 'FRONT'} CAMERA...`;
        
        // Stop current stream
        if (videoElement.srcObject) {
            const tracks = videoElement.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }
        
        // Start new stream with different camera
        navigator.mediaDevices.getUserMedia({
            video: { facingMode: currentFacingMode }
        })
        .then(function(stream) {
            videoElement.srcObject = stream;
            videoElement.onloadedmetadata = function() {
                // Set the canvas size to match the video
                canvasElement.width = videoElement.videoWidth;
                canvasElement.height = videoElement.videoHeight;
                
                // Adjust container size
                adjustVideoContainerForVideo();
                
                // Show video feed
                videoElement.style.display = 'block';
                canvasElement.style.display = 'none';
                
                statusDisplay.textContent = `CAMERA ACTIVE (${currentFacingMode === 'environment' ? 'BACK' : 'FRONT'}). SCANNING...`;
                
                // Restart the render loop
                requestAnimationFrame(render);
            };
        })
        .catch(function(error) {
            errorDisplay.textContent = 'Error switching camera: ' + error.message;
            statusDisplay.textContent = '';
        });
    }
    
    // WebGL variables
    let gl, program, colorUniformLocation, texture;
    
    // Check for camera support
    function hasGetUserMedia() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }
    
    // Modify existing startButton event listener to include facing mode and show switch button
    startButton.addEventListener('click', function() {
        if (videoElement.srcObject) {
            // If we have a stream, stop it
            const tracks = videoElement.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoElement.srcObject = null;
            
            // Update UI
            startButton.textContent = 'START SCAN';
            statusDisplay.textContent = 'SCAN STOPPED';
            
            // Hide switch camera button
            if (isMobile) {
                document.getElementById('switchCameraButton').style.display = 'none';
            }
            
            return;
        }
        
        if (!hasGetUserMedia()) {
            errorDisplay.textContent = 'Camera access not supported by your browser.';
            return;
        }
        
        statusDisplay.textContent = 'ACCESSING CAMERA...';
        errorDisplay.textContent = '';
        
        // Hide uploaded image if any
        uploadedImage.style.display = 'none';
        
        // Show video element
        videoElement.style.display = 'block';
        canvasElement.style.display = 'none';
        
        // Configure camera options for mobile
        const videoConstraints = isMobile ? 
            { facingMode: currentFacingMode } : 
            { facingMode: 'user' };
        
        // Access the webcam
        navigator.mediaDevices.getUserMedia({ video: videoConstraints })
            .then(function(stream) {
                videoElement.srcObject = stream;
                videoElement.onloadedmetadata = function() {
                    // Set the canvas size to match the video
                    canvasElement.width = videoElement.videoWidth;
                    canvasElement.height = videoElement.videoHeight;
                    
                    // Adjust container size
                    adjustVideoContainerForVideo();
                    
                    // Initialize WebGL once we have the video stream
                    initWebGL();
                    
                    // Show camera switch button on mobile
                    if (isMobile) {
                        document.getElementById('switchCameraButton').style.display = 'block';
                    }
                    
                    statusDisplay.textContent = `CAMERA ACTIVE (${currentFacingMode === 'environment' ? 'BACK' : 'FRONT'}). SCANNING...`;
                    startButton.textContent = 'STOP SCAN';
                    
                    // Start the render loop
                    requestAnimationFrame(render);
                };
            })
            .catch(function(error) {
                errorDisplay.textContent = 'Error accessing camera: ' + error.message;
                statusDisplay.textContent = '';
            });
    });

    
    // Process uploaded image
    imageUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        
        if (!file) {
            return;
        }
        
        // Check if file is an image
        if (!file.type.match('image.*')) {
            errorDisplay.textContent = 'Selected file is not an image.';
            return;
        }
        
        // Create FileReader to read the image
        const reader = new FileReader();
        
        reader.onload = function(event) {
            // Update status
            statusDisplay.textContent = 'IMAGE LOADED, PREPARING SCAN...';
            errorDisplay.textContent = '';
            
            // Hide video feed and show uploaded image
            if (videoElement.srcObject) {
                // Stop any active camera stream
                const tracks = videoElement.srcObject.getTracks();
                tracks.forEach(track => track.stop());
                videoElement.srcObject = null;
            }
            
            videoElement.style.display = 'none';
            uploadedImage.style.display = 'block';
            
            // Set image source from file
            uploadedImage.src = event.target.result;
            
            // Set function to process when image is loaded
            uploadedImage.onload = function() {
                processUploadedImage();
            };
        };
        
        reader.onerror = function() {
            errorDisplay.textContent = 'Error reading file.';
            statusDisplay.textContent = '';
        };
        
        // Read the image file
        reader.readAsDataURL(file);
    });
    
    // WebGL rendering loop for camera feed
    function render() {
        if (!videoElement.paused && !videoElement.ended) {
            // Draw the video frame to the WebGL texture
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoElement);
            
            // Set the color from the color picker
            const rgbColor = hexToRgb(colorPicker.value);
            gl.uniform3fv(colorUniformLocation, rgbColor);
            
            // Render
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            
            // Request the next frame
            requestAnimationFrame(render);
        }
    }
    
    // Process the uploaded image with WebGL
    function processUploadedImage() {
        // Get WebGL context
        gl = canvasElement.getContext('webgl') || canvasElement.getContext('experimental-webgl');
        
        if (!gl) {
            statusDisplay.textContent = 'Image uploaded (WebGL not available)';
            return;
        }
        
        // Set canvas dimensions to match image
        canvasElement.width = uploadedImage.naturalWidth;
        canvasElement.height = uploadedImage.naturalHeight;
        
        // Adjust container size
        adjustVideoContainerForImage();
        
        // Initialize WebGL for image
        initUploadWebGL();
        
        // Show canvas instead of image
        uploadedImage.style.display = 'none';
        canvasElement.style.display = 'block';
        
        statusDisplay.textContent = 'IMAGE SCAN COMPLETE';
    }
    
    // Initialize WebGL for camera feed
    function initWebGL() {
        // Get WebGL context
        gl = canvasElement.getContext('webgl') || canvasElement.getContext('experimental-webgl');
        
        if (!gl) {
            errorDisplay.textContent = 'WebGL not supported.';
            return;
        }
        
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

        // Fragment shader with color difference filter
        const fragmentShaderSource = `
            precision highp float;
            varying vec2 v_texCoord;
            uniform sampler2D u_texture;
            uniform vec3 u_baseColor;
            void main() {
                vec4 feed = texture2D(u_texture, v_texCoord);
                vec3 diff = abs(feed.rgb - u_baseColor);
                gl_FragColor = vec4(diff, 1.0);
            }
        `;
        
        // Create shaders and program
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
        
        // Set up the color uniform
        colorUniformLocation = gl.getUniformLocation(program, 'u_baseColor');
        
        // Get color from the color picker
        const rgbColor = hexToRgb(colorPicker.value);
        gl.uniform3fv(colorUniformLocation, rgbColor);
        
        // Show canvas instead of video
        videoElement.style.display = 'none';
        canvasElement.style.display = 'block';
        
        // Add event listener to color picker
        colorPicker.addEventListener('input', function() {
            if (videoElement.style.display === 'none' && uploadedImage.style.display === 'none') {
                // We're viewing the canvas, update the color
                const rgbColor = hexToRgb(colorPicker.value);
                gl.uniform3fv(colorUniformLocation, rgbColor);
                
                statusDisplay.textContent = `FILTER UPDATED: ${colorPicker.value}`;
            }
        });
    }
    
    // Initialize WebGL for uploaded image
    function initUploadWebGL() {
        // Get WebGL context
        gl = canvasElement.getContext('webgl') || canvasElement.getContext('experimental-webgl');
        
        if (!gl) {
            return;
        }
        
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

        // Fragment shader - updated for clean output
        const fragmentShaderSource = `
            precision highp float;
            varying vec2 v_texCoord;
            uniform sampler2D u_texture;
            uniform vec3 u_baseColor;
            void main() {
                vec4 feed = texture2D(u_texture, v_texCoord);
                vec3 diff = abs(feed.rgb - u_baseColor);
                gl_FragColor = vec4(diff, 1.0);
                // No additional effects - just the color difference filter
            }
        `;
        
        // Create shaders and program
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
        
        // Set up the color uniform
        colorUniformLocation = gl.getUniformLocation(program, 'u_baseColor');
        
        // Get color from the color picker
        const rgbColor = hexToRgb(colorPicker.value);
        gl.uniform3fv(colorUniformLocation, rgbColor);
        
        // Render the image with filter
        gl.viewport(0, 0, canvasElement.width, canvasElement.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, uploadedImage);
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        // Add event listener to color picker for image
        colorPicker.addEventListener('input', function() {
            updateImageColor();
        });
    }
    
    // Update color for image
    function updateImageColor() {
        const rgbColor = hexToRgb(colorPicker.value);
        
        gl.useProgram(program);
        gl.uniform3fv(colorUniformLocation, rgbColor);
        
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, uploadedImage);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        statusDisplay.textContent = `FILTER UPDATED: ${colorPicker.value}`;
    }
    
    // Convert hex color to RGB values (0.0 to 1.0)
    function hexToRgb(hex) {
        const r = parseInt(hex.substring(1, 3), 16) / 255;
        const g = parseInt(hex.substring(3, 5), 16) / 255;
        const b = parseInt(hex.substring(5, 7), 16) / 255;
        return [r, g, b];
    }
    
    // Adjust container size for the video
    function adjustVideoContainerForVideo() {
        const videoAspect = videoElement.videoHeight / videoElement.videoWidth;
        
        // Set the container width to 100% of its parent
        videoContainer.style.width = '100%';
        
        // Set the height based on the aspect ratio
        const containerWidth = videoContainer.clientWidth;
        videoContainer.style.height = containerWidth * videoAspect + 'px';
        
        // Adjust canvas to match container
        canvasElement.style.width = '100%';
        canvasElement.style.height = '100%';
    }
    
    // Adjust container size for the image
    function adjustVideoContainerForImage() {
        const imgAspect = uploadedImage.naturalHeight / uploadedImage.naturalWidth;
        
        // Set the container width to 100% of its parent
        videoContainer.style.width = '100%';
        
        // Set the height based on the aspect ratio
        const containerWidth = videoContainer.clientWidth;
        videoContainer.style.height = containerWidth * imgAspect + 'px';
        
        // Adjust canvas to match container
        canvasElement.style.width = '100%';
        canvasElement.style.height = '100%';
    }
    
    // Create shader function
    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (success) {
            return shader;
        }
        
        console.log(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    
    // Create program function
    function createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        const success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (success) {
            return program;
        }
        
        console.log(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
});