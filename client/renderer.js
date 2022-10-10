define(function(require, exports, module) {
    var canvas = document.getElementById('canvas');
    canvas.oncontextmenu = function (e) {
        e.preventDefault();
    };
    var gl = canvas.getContext('webgl');
    var canvasDimensions = canvas.getBoundingClientRect();
    var resourceaddress = 'http://localhost:8080/';
    //var resourceaddress = 'https://plainsightindustries.com/rollback/';

    var vsSource = `
        attribute vec3 aVertexPosition;
        attribute vec2 aTexcoord;
        attribute vec3 aRecolor;
        attribute vec3 aLux;

        uniform vec3 uResolution;

        varying vec2 vTexcoord;
        varying vec3 vRecolor;
        varying vec3 vLux;
        
        void main() {
            vec3 zeroToOne = aVertexPosition / uResolution;
            vec3 zeroToTwo = zeroToOne * 2.0;
            vec3 clipSpace = zeroToTwo - 1.0;

            gl_Position = vec4(clipSpace, 1);

            vTexcoord = aTexcoord;
            vRecolor = aRecolor;
            vLux = aLux;
        }`;

    var fsSource = `
        precision mediump float;

        varying vec2 vTexcoord;
        varying vec3 vRecolor;
        varying vec3 vLux;

        uniform sampler2D uTexture;

        void main() {
            vec4 color = texture2D(uTexture, vTexcoord);
            if (color.r == 0.0 && color.g == 0.0 && color.b == 0.0) {
                color.r = vRecolor.r;
                color.g = vRecolor.g;
                color.b = vRecolor.b;
            }

            if (color.a < 0.01) {
                discard;
            }

            if (vLux.r > 0.0 || vLux.g > 0.0 || vLux.b > 0.0) {
                color = mix(color, vec4(vLux, color.a), 0.5);
            }

            gl_FragColor = color;
        }
    `;

    function initShaderProgram(gl, vs, fs) {
        var vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vs);
        gl.compileShader(vertexShader);
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(vertexShader));
        }
        var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fs);
        gl.compileShader(fragmentShader);
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(fragmentShader));
        }
        var shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        }
        return shaderProgram;
    }

    var shaderProgram = initShaderProgram(gl, vsSource, fsSource);

    var programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            texturePosition: gl.getAttribLocation(shaderProgram, 'aTexcoord'),
            recolorData: gl.getAttribLocation(shaderProgram, 'aRecolor'),
            luxData: gl.getAttribLocation(shaderProgram, 'aLux')
        },
        uniformLocations: {
            resolution: gl.getUniformLocation(shaderProgram, 'uResolution')
        }
    }

    function loadTexture(src, d, options)  {
        var texture = gl.createTexture();
        
        // Asynchronously load an image
        var image = new Image();
        image.src = resourceaddress+src;
        image.crossOrigin = 'anonymous';
        image.addEventListener('load', function() {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,  gl.UNSIGNED_BYTE, image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, options.noblur ? gl.NEAREST : gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, options.noblur ? gl.NEAREST : gl.LINEAR);
        });

        return { 
            texture: texture,
            image: image,
            dim: d
        };
    }

    var positionBuffer = gl.createBuffer();
    var texturePositionBuffer = gl.createBuffer();
    var colourBuffer = gl.createBuffer();
    var luxBuffer = gl.createBuffer();

    var sceneDrawer = function() {

    };

    function drawScene(gl, programInfo, calls) {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        gl.clearColor(0.36, 0.64, 1.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(programInfo.program);
        gl.uniform3f(programInfo.uniformLocations.resolution, gl.canvas.width, gl.canvas.height, 1);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        for (var k in calls) {
            var drawCalls = calls[k];

            gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            var positions = [];
            function calculatePosition(x, y, w, h, z, angle) {
                y = canvas.height - y;
                z = z || 0.5;

                var sine = Math.sin(angle);
                var cosine = Math.cos(angle);
                // offset vectors
                var w2 = -w/2; var h2 = h/2;
                var v0 = {
                    x: cosine*w2 + sine*h2, y: cosine*h2 - sine*w2
                };
                w2 = w/2; h2 = h/2;
                var v1 = {
                    x: cosine*w2 + sine*h2, y: cosine*h2 - sine*w2
                }
                w2 = w/2; h2 = -h/2;
                var v2 = {
                    x: cosine*w2 + sine*h2, y: cosine*h2 - sine*w2
                }
                w2 = -w/2; h2 = -h/2;
                var v3 = {
                    x: cosine*w2 + sine*h2, y: cosine*h2 - sine*w2
                }

                positions.push(
                    x+v0.x, y+v0.y, z,
                    x+v1.x, y+v1.y, z,
                    x+v2.x, y+v2.y, z,

                    x+v0.x, y+v0.y, z,
                    x+v3.x, y+v3.y, z,
                    x+v2.x, y+v2.y, z
                );
            }
            drawCalls.forEach(dc => {
                calculatePosition(dc[4], dc[5], dc[6], dc[7], dc[8], dc[9]);
            });
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
            gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        
            // bind the texture
            gl.bindTexture(gl.TEXTURE_2D, graphics[k].texture);
        
            gl.enableVertexAttribArray(programInfo.attribLocations.texturePosition);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, texturePositionBuffer);
            var textureData = new Array(drawCalls.length * 12);
            for(var index = 0; index < drawCalls.length; index++) {
                var dc = drawCalls[index];
                var x = dc[0];
                var y = dc[1];
                var w = dc[2];
                var h = dc[3];
                var image = graphics[k].image;
                var i = index * 12;
                var width = image.width;
                var height = image.height;
                var sx = x / width;
                var sy = y / height;
                var ex = (x+w) / width;
                var ey = (y+h) / height;
                textureData[i] = sx;
                textureData[i+1] = sy;

                textureData[i+2] = ex;
                textureData[i+3] = sy;

                textureData[i+4] = ex;
                textureData[i+5] = ey;

                textureData[i+6] = sx;
                textureData[i+7] = sy;

                textureData[i+8] = sx;
                textureData[i+9] = ey;

                textureData[i+10] = ex;
                textureData[i+11] = ey;
            }
            gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array(textureData),
                gl.STATIC_DRAW);
            gl.vertexAttribPointer(programInfo.attribLocations.texturePosition, 2, gl.FLOAT, false, 0, 0);
        
            gl.enableVertexAttribArray(programInfo.attribLocations.recolorData);
            gl.bindBuffer(gl.ARRAY_BUFFER, colourBuffer);
            var colors = [];
            drawCalls.forEach(dc => {
                var r = 0;
                var g = 0;
                var b = 0;
                switch (dc[10]) {
                    case 'red':
                        r = 1;
                        break;
                    case 'green':
                        g = 1;
                        break;
                    case 'playerturn':
                        r = 0;
                        g = 1;
                        b = 0;
                        break;
                    case 'grey':
                        r = 0.5;
                        g = 0.5;
                        b = 0.5;
                        break;
                }
                colors.push(r, g, b);
                colors.push(r, g, b);
                colors.push(r, g, b);
                colors.push(r, g, b);
                colors.push(r, g, b);
                colors.push(r, g, b);
            });
            gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array(colors),
                gl.STATIC_DRAW);
            gl.vertexAttribPointer(programInfo.attribLocations.recolorData, 3, gl.FLOAT, false, 0, 0);

            gl.enableVertexAttribArray(programInfo.attribLocations.luxData);
            gl.bindBuffer(gl.ARRAY_BUFFER, luxBuffer);
            var lux = [];
            drawCalls.forEach(dc => {
                var r = 0;
                var g = 0;
                var b = 0;
                switch (dc[11]) {
                    case 'red':
                        r = 1;
                        break;
                    case 'green':
                        g = 1;
                        break;
                    case 'blue':
                        b = 1;
                        break;
                    case 'grey':
                        r = 0.5;
                        g = 0.5;
                        b = 0.5;
                        break;
                    case 'white':
                        r = 1.0;
                        g = 1.0;
                        b = 1.0;
                        break;
                }
                lux.push(r, g, b);
                lux.push(r, g, b);
                lux.push(r, g, b);
                lux.push(r, g, b);
                lux.push(r, g, b);
                lux.push(r, g, b);
            });
            gl.bufferData(
                gl.ARRAY_BUFFER,
                new Float32Array(lux),
                gl.STATIC_DRAW);
            gl.vertexAttribPointer(programInfo.attribLocations.luxData, 3, gl.FLOAT, false, 0, 0);

            var count = textureData.length / 2;
            gl.drawArrays(gl.TRIANGLES, 0, count);
        }
    }

    var lastTimestamp = 0;

    function render(timestamp) {
        var now = Date.now();
        var delta = timestamp - lastTimestamp;
        lastTimestamp = timestamp;
        var fractionOfSecond = (timestamp % 1000) / 1000;

        var calls = {};

        function draw(sheet, sx, sy, sw, sh, dx, dy, dw, dh, angle, z, color, lux) {
            calls[sheet] = calls[sheet] || [];
            calls[sheet].push([sx, sy, sw, sh, dx, dy, dw, dh, z, angle, color, lux]);
        }

        function drawSprite(sheet, fx, fy, dx, dy, w, h, angle, z, color, lux) {
            if (graphics[sheet]) {
                var dim = graphics[sheet].dim
                var sx = fx*dim;
                var sy = fy*dim;
                draw(sheet, sx, sy, dim, dim, dx, dy, w, h, angle, z, color, lux);
            }
        }

        function drawText(x, y, w, maxWidth, text, z, drawCursor, highlight) {
            var position = 0;
            var line = 0;
            for(var i = 0; i < text.length; i++) {
                if (text[i] == '\n') {
                    position = 0;
                    line++;
                    continue;
                }
                if (w*position > maxWidth) {
                    position = 0;
                    line++;
                }
                var charCode = text.charCodeAt(i);
                var spriteX;
                var spriteY;
                var valid = false;
                //a-z = 97-122
                if (charCode >= 97 && charCode <= 122) {
                    var azIndex = charCode-97;
                    spriteX = azIndex % 16;
                    spriteY = 2+Math.floor(azIndex / 16);
                    valid = true;
                }
                //A-Z = 65-90
                if (charCode >= 65 && charCode <= 90) {
                    var azIndex = charCode-65;
                    spriteX = azIndex % 16;
                    spriteY = Math.floor(azIndex / 16);
                    valid = true;
                }
                //0-9 = 48-57
                if (charCode >= 48 && charCode <= 57) {
                    var azIndex = charCode-48;
                    spriteX = azIndex;
                    spriteY = 4;
                    valid = true;
                }
                if (charCode == 45) {
                    spriteX = 3;
                    spriteY = 5;
                    valid = true;
                }
                if (charCode == 47) {
                    spriteX = 1;
                    spriteY = 5;
                    valid = true;
                }
                if (charCode == 58) {
                    spriteX = 2;
                    spriteY = 5;
                    valid = true;
                }
                if (valid) {
                    drawSprite('font2', spriteX, spriteY, x+(position*w), y+(line*w), w, w, 0, z || 0.35, highlight || 'black');
                }
                position++;
            }
            if (drawCursor) {
                drawSprite('font2', 4, 5, x+((position)*w), y+(line*w), w, w, 0, z || 0.35);
            }
        }

        sceneDrawer(drawSprite, drawText, draw, delta, now);

        drawScene(gl, programInfo, calls);

        window.requestAnimationFrame(render);
    }

    canvas.width = Math.floor(canvasDimensions.width);
    canvas.height = Math.floor(canvasDimensions.height);

    window.addEventListener('resize', (e) => {
        var canvasDimensions = canvas.getBoundingClientRect();
        canvas.width = Math.floor(canvasDimensions.width);
        canvas.height = Math.floor(canvasDimensions.height);
    });

    function loadTextures(textures) {
        textures.forEach(t => {
            var name = t.n.split('.')[0];

            graphics[name] = loadTexture(t.n, t.d, t.options);
        });
    };

    var graphics = {};
    
    loadTextures([
        { n: 'font2.png', d: 10, options: { noblur: true } },
        { n: 'ui.png', d: 32, options: { noblur: true } }
    ]);

    window.requestAnimationFrame(render);

    exports.loadTextures = loadTextures;

    exports.setSceneDrawer = function(callback) {
        sceneDrawer = callback;
    };
});