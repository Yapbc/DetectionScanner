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
    
    // ADD NEW CODE: Create shader selector
    const shaderSelectorContainer = document.createElement('div');
    shaderSelectorContainer.className = 'shader-selector-container';
    
    const shaderSelectorLabel = document.createElement('label');
    shaderSelectorLabel.setAttribute('for', 'shaderSelector');
    shaderSelectorLabel.textContent = 'FILTER MODE:';
    
    const shaderSelector = document.createElement('select');
    shaderSelector.id = 'shaderSelector';
    
    // Add shader options
    const shaderOptions = [
        { value: 'basic', text: 'Basic Difference' },
        { value: 'highlight', text: 'Highlight Artifacts' },
        { value: 'advanced', text: 'Advanced Detection' }
    ];
    
    shaderOptions.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        shaderSelector.appendChild(optionElement);
    });
    
    shaderSelectorContainer.appendChild(shaderSelectorLabel);
    shaderSelectorContainer.appendChild(shaderSelector);
    
    // Add threshold slider for advanced modes
    const thresholdContainer = document.createElement('div');
    thresholdContainer.className = 'threshold-container';
    thresholdContainer.style.display = 'none'; // Initially hidden
    
    const thresholdLabel = document.createElement('label');
    thresholdLabel.setAttribute('for', 'thresholdSlider');
    thresholdLabel.textContent = 'THRESHOLD:';
    
    const thresholdSlider = document.createElement('input');
    thresholdSlider.type = 'range';
    thresholdSlider.id = 'thresholdSlider';
    thresholdSlider.min = '0.01';
    thresholdSlider.max = '0.3';
    thresholdSlider.step = '0.01';
    thresholdSlider.value = '0.15';
    
    const thresholdValue = document.createElement('span');
    thresholdValue.id = 'thresholdValue';
    thresholdValue.textContent = '0.15';
    
    thresholdContainer.appendChild(thresholdLabel);
    thresholdContainer.appendChild(thresholdSlider);
    thresholdContainer.appendChild(thresholdValue);
    
    // Add the new controls to the container
    controlsContainer.appendChild(shaderSelectorContainer);
    controlsContainer.appendChild(thresholdContainer);
    
    // Show/hide threshold based on shader selection
    shaderSelector.addEventListener('change', function() {
        if (this.value === 'basic') {
            thresholdContainer.style.display = 'none';
        } else {
            thresholdContainer.style.display = 'block';
        }
        
        // Update shader if already scanning
        if (gl && program) {
            updateShader();
        }
    });
    
    // Update threshold value display
    thresholdSlider.addEventListener('input', function() {
        thresholdValue.textContent = this.value;
        
        // Update threshold in shader if active
        if (gl && program) {
            gl.useProgram(program);
            const thresholdLocation = gl.getUniformLocation(program, 'u_threshold');
            if (thresholdLocation) {
                gl.uniform1f(thresholdLocation, parseFloat(this.value));
            }
        }
    });
    
    // ADD NEW CODE: Store shader sources
    const shaderSources = {
        basic: `
            precision highp float;
            varying vec2 v_texCoord;
            uniform sampler2D u_texture;
            uniform vec3 u_baseColor;
            void main() {
                vec4 feed = texture2D(u_texture, v_texCoord);
                vec3 diff = abs(feed.rgb - u_baseColor);
                gl_FragColor = vec4(diff, 1.0);
            }
        `,
        highlight: `
            precision highp float;
            varying vec2 v_texCoord;
            uniform sampler2D u_texture;
            uniform vec3 u_baseColor;
            uniform float u_threshold;
            
            void main() {
                vec4 feed = texture2D(u_texture, v_texCoord);
                vec3 diff = abs(feed.rgb - u_baseColor);
                
                // Calculate difference intensity
                float intensity = (diff.r + diff.g + diff.b) / 3.0;
                
                // Apply threshold to isolate significant differences
                float threshold = u_threshold; // Using uniform from slider
                
                if (intensity > threshold) {
                    // Highlight artifacts - use a distinctive color
                    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Red for artifacts
                } else {
                    // Keep original pixels with slight transparency
                    gl_FragColor = vec4(feed.rgb, 0.2);
                }
            }
        `,
        advanced: `
            precision highp float;
            varying vec2 v_texCoord;
            uniform sampler2D u_texture;
            uniform vec3 u_baseColor;
            uniform float u_threshold;
            
            void main() {
                vec2 texSize = vec2(${canvasElement.width}.0, ${canvasElement.height}.0);
                vec2 onePixel = vec2(1.0, 1.0) / texSize;
                
                // Sample neighboring pixels
                vec4 center = texture2D(u_texture, v_texCoord);
                vec4 left = texture2D(u_texture, v_texCoord - vec2(onePixel.x, 0.0));
                vec4 right = texture2D(u_texture, v_texCoord + vec2(onePixel.x, 0.0));
                vec4 up = texture2D(u_texture, v_texCoord - vec2(0.0, onePixel.y));
                vec4 down = texture2D(u_texture, v_texCoord + vec2(0.0, onePixel.y));
                
                // Edge detection
                vec3 edgeH = abs(right.rgb - left.rgb);
                vec3 edgeV = abs(up.rgb - down.rgb);
                vec3 edge = edgeH + edgeV;
                float edgeIntensity = (edge.r + edge.g + edge.b) / 3.0;
                
                // Calculate difference with base color
                vec3 diff = abs(center.rgb - u_baseColor);
                float diffIntensity = (diff.r + diff.g + diff.b) / 3.0;
                
                // Combine edge detection with color difference
                float artifactIntensity = edgeIntensity * diffIntensity * 5.0;
                
                // Apply threshold to isolate artifacts
                float threshold = u_threshold; // Using uniform from slider
                
                if (artifactIntensity > threshold) {
                    // Highlight artifacts in a distinctive color
                    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Red
                } else {
                    // Make the rest of the image transparent/faded
                    gl_FragColor = vec4(center.rgb, 0.2);
                }
            }
        `
    };
    
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
            
            // Update threshold if needed
            const shaderType = shaderSelector.value;
            if (shaderType !== 'basic') {
                const thresholdLocation = gl.getUniformLocation(program, 'u_threshold');
                if (thresholdLocation) {
                    gl.uniform1f(thresholdLocation, parseFloat(thresholdSlider.value));
                }
            }
            
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
    
    // ADD NEW CODE: Update shader function
    function updateShader() {
        // Get selected shader type
        const shaderType = shaderSelector.value;
        
        // Get fragment shader source
        const fragmentShaderSource = shaderSources[shaderType];
        
        // Update the canvas size for advanced shader
        if (shaderType === 'advanced') {
            // For video
            if (videoElement.videoWidth) {
                canvasElement.width = videoElement.videoWidth;
                canvasElement.height = videoElement.videoHeight;
            }
            // For image
            else if (uploadedImage.naturalWidth) {
                canvasElement.width = uploadedImage.naturalWidth;
                canvasElement.height = uploadedImage.naturalHeight;
            }
        }
        
        // Create vertex shader
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;
        
        // Recreate shaders and program
        const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        // Delete old program if it exists
        if (program) {
            gl.deleteProgram(program);
        }
        
        program = createProgram(gl, vertexShader, fragmentShader);
        
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,  0, 1,
             1, -1,  1, 1,
            -1,  1,  0, 0,
             1,  1,  1, 0
        ]), gl.STATIC_DRAW);
        
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
        
        // Set threshold for advanced shaders
        if (shaderType !== 'basic') {
            const thresholdLocation = gl.getUniformLocation(program, 'u_threshold');
            if (thresholdLocation) {
                gl.uniform1f(thresholdLocation, parseFloat(thresholdSlider.value));
            }
        }
        
        // If we're processing an image, re-render it
        if (uploadedImage.complete && uploadedImage.naturalWidth && canvasElement.style.display === 'block') {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, uploadedImage);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
        
        statusDisplay.textContent = `FILTER MODE: ${shaderOptions.find(opt => opt.value === shaderType).text}`;
    }
    
    // Initialize WebGL for camera feed
    function initWebGL() {
        // Get WebGL context
        gl = canvasElement.getContext('webgl') || canvasElement.getContext('experimental-webgl');
        
        if (!gl) {
            errorDisplay.textContent = 'WebGL not supported.';
            return;
        }
        
        // Get shader type from selector
        const shaderType = shaderSelector.value;
        
        // Get fragment shader source
        const fragmentShaderSource = shaderSources[shaderType];
        
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
        
        // Set threshold for advanced modes
        if (shaderType !== 'basic') {
            const thresholdLocation = gl.getUniformLocation(program, 'u_threshold');
            if (thresholdLocation) {
                gl.uniform1f(thresholdLocation, parseFloat(thresholdSlider.value));
            }
        }
        
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
        
        // Get shader type from selector
        const shaderType = shaderSelector.value;
        
        // Get fragment shader source
        const fragmentShaderSource = shaderSources[shaderType];
        
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
        
        // Set threshold for advanced modes
        if (shaderType !== 'basic') {
            const thresholdLocation = gl.getUniformLocation(program, 'u_threshold');
            if (thresholdLocation) {
                gl.uniform1f(thresholdLocation, parseFloat(thresholdSlider.value));
            }
        }
        
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
        
        // Add event listener for shader selector changes
        shaderSelector.addEventListener('change', function() {
            updateShader();
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
        
        statusDisplay.textContent = `COLOR UPDATED: ${colorPicker.value}`;
    }
    
    // Helper functions
    
    // Create shader
    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        // Check if shader compiled successfully
        const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (!success) {
            const info = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error('Could not compile shader: ' + info);
        }
        
        return shader;
    }
    
    // Create WebGL program
    function createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        // Check if link was successful
        const success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (!success) {
            const info = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error('Could not link program: ' + info);
        }
        
        return program;
    }
    
    // Convert hex color to RGB array
    function hexToRgb(hex) {
        // Remove # if present
        hex = hex.replace('#', '');
        
        // Parse hex values
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;
        
        return [r, g, b];
    }
    
    // Adjust video container size for video
    function adjustVideoContainerForVideo() {
        // Set container dimensions based on video size
        const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
        
        // Limit maximum width to prevent overflow
        const maxWidth = Math.min(window.innerWidth - 40, 800);
        let width = maxWidth;
        let height = width / aspectRatio;
        
        // If height is too large, constrain by height instead
        if (height > window.innerHeight - 200) {
            height = window.innerHeight - 200;
            width = height * aspectRatio;
        }
        
        videoContainer.style.width = width + 'px';
        videoContainer.style.height = height + 'px';
    }
    
    // Adjust video container size for image
    function adjustVideoContainerForImage() {
        // Set container dimensions based on image size
        const aspectRatio = uploadedImage.naturalWidth / uploadedImage.naturalHeight;
        
        // Limit maximum width to prevent overflow
        const maxWidth = Math.min(window.innerWidth - 40, 800);
        let width = maxWidth;
        let height = width / aspectRatio;
        
        // If height is too large, constrain by height instead
        if (height > window.innerHeight - 200) {
            height = window.innerHeight - 200;
            width = height * aspectRatio;
        }
        
        videoContainer.style.width = width + 'px';
        videoContainer.style.height = height + 'px';
    }
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (videoElement.videoWidth) {
            adjustVideoContainerForVideo();
        } else if (uploadedImage.naturalWidth) {
            adjustVideoContainerForImage();
        }
    });
});