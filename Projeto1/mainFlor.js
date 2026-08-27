(function () {
const canvas = document.getElementById("canvasFlor");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL 2 não é suportado.");
}

// --------------------------------------------------
// 1. VÉRTICES (Cada quadrado = 6 pontos para gl.TRIANGLES)
// --------------------------------------------------

// --------------------------------------------------
// 1. VÉRTICES VERMELHOS 
// --------------------------------------------------

// Vermelho Claro / Base
const vVermelhoBase = new Float32Array([
    0.5,  1.0,    0.75, 1.0,    0.5,  0.75,
    0.75, 1.0,    0.75, 0.75,   0.5,  0.75,

    -0.5,  0.75,  -0.25, 0.75,  -0.5,  0.5,
    -0.25, 0.75,  -0.25, 0.5,   -0.5,  0.5,

    0.25, 0.75,   0.5,  0.75,   0.25, 0.5,
    0.5,  0.75,   0.5,  0.5,    0.25, 0.5,

    0.25, 0.5,    0.5,  0.5,    0.25, 0.25,
    0.25, 0.25,   0.5,  0.5,    0.5,  0.25,

    -0.5,  0.25,  -0.25, 0.25,  -0.5,  0.0,
    -0.25, 0.25,  -0.25, 0.0,   -0.5,  0.0,

    -0.25, 0.25,   0.0,  0.25,  -0.25, 0.0,
     0.0,  0.25,   0.0,  0.0,   -0.25, 0.0,

     0.0,  0.25,   0.25, 0.25,   0.0,  0.0,
     0.25, 0.25,   0.25, 0.0,    0.0,  0.0,

    -0.75, 0.5,   -0.5,  0.5,   -0.75, 0.25,
    -0.5,  0.5,   -0.5,  0.25,  -0.75, 0.25,

     0.0,  0.5,    0.25, 0.5,    0.0,  0.25,
     0.25, 0.5,    0.25, 0.25,   0.0,  0.25,

    -0.75, 0.25,  -0.5,  0.25,  -0.75, 0.0,
    -0.5,  0.25,  -0.5,  0.0,   -0.75, 0.0
]);

// Vermelho Médio
const vVermelhoMedio = new Float32Array([
    0.0,  1.0,    0.25, 1.0,    0.0,  0.75,
    0.25, 1.0,    0.25, 0.75,   0.0,  0.75,

    -0.25, 0.75,   0.0,  0.75,  -0.25, 0.5,
     0.0,  0.75,   0.0,  0.5,   -0.25, 0.5,

    0.5,  0.75,   0.75, 0.75,   0.5,  0.5,
    0.75, 0.75,   0.75, 0.5,    0.5,  0.5,

    -0.5,  0.5,   -0.25, 0.5,   -0.5,  0.25,
    -0.25, 0.5,   -0.25, 0.25,  -0.5,  0.25
]);

// Vermelho Escuro
const vVermelhoEscuro = new Float32Array([
    0.25, 1.0,    0.5,  1.0,    0.25, 0.75,
    0.5,  1.0,    0.5,  0.75,   0.25, 0.75,

    0.0,  0.75,   0.25, 0.75,   0.0,  0.5,
    0.25, 0.75,   0.25, 0.5,    0.0,  0.5,

    -0.25, 0.5,    0.0,  0.5,   -0.25, 0.25,
     0.0,  0.5,    0.0,  0.25,  -0.25, 0.25,

    0.5,  0.5,    0.75, 0.5,    0.5,  0.25,
    0.75, 0.5,    0.75, 0.25,   0.5,  0.25,

    0.25, 0.25,   0.5,  0.25,   0.25, 0.0,
    0.5,  0.25,   0.5,  0.0,    0.25, 0.0
]);



const vVerdeClaro = new Float32Array([
    // Quadrado vertical (caule)
    0.25, -0.25,  0.5, -0.25,  0.25, -1.0,
    0.5,  -0.25,  0.5, -1.0,   0.25, -1.0
]);

// Verde Escuro 
const vVerdeEscuro = new Float32Array([
    -0.25, 0.0,   0.25, 0.0,   -0.25, -0.25,
     0.25, 0.0,   0.25, -0.25, -0.25, -0.25,

    -0.5, -0.5,  -0.25, -0.5,  -0.5, -0.75,
    -0.25, -0.5, -0.25, -0.75, -0.5, -0.75,

    0.25, 0.0,   0.5, 0.0,   0.25, -0.25,
    0.25, -0.25,  0.5, 0.0,  0.5, -0.25,

   
    -0.25, -0.75, 0.0, -0.75,  -0.25, -1.0,
     0.0,  -0.75, 0.0, -1.0,   -0.25, -1.0,

     0.5, -0.75,  0.75, -0.75,  0.5, -1.0,
     0.75, -0.75, 0.75, -1.0,   0.5, -1.0
]);

// --------------------------------------------------
// 2. BUFFER
// --------------------------------------------------
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

// --------------------------------------------------
// 3. VERTEX SHADER
// --------------------------------------------------
const vertexShaderSource = `#version 300 es
in vec2 aPosition;
void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

// --------------------------------------------------
// 4. FRAGMENT SHADER
// --------------------------------------------------
const fragmentShaderSource = `#version 300 es
precision mediump float;
uniform vec4 uColor;
out vec4 outColor;
void main() {
    outColor = uColor;
}
`;

// --------------------------------------------------
// 5. COMPILAR SHADERS
// --------------------------------------------------
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(error);
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

// --------------------------------------------------
// 6. CRIAR PROGRAMA
// --------------------------------------------------
const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
}

// --------------------------------------------------
// 7. LOCAIS
// --------------------------------------------------
const positionLocation = gl.getAttribLocation(program, "aPosition");
const colorLocation = gl.getUniformLocation(program, "uColor");

// --------------------------------------------------
// 8. CONFIGURAR ATRIBUTO
// --------------------------------------------------
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

// --------------------------------------------------
// 9. LIMPAR TELA
// --------------------------------------------------
gl.clearColor(0.0, 0.0, 0.2, 0.95);
gl.clear(gl.COLOR_BUFFER_BIT);

// --------------------------------------------------
// 10. DESENHAR
// --------------------------------------------------
gl.useProgram(program);

function desenharGrupo(verticesArray, r, g, b) {
    if (!verticesArray || verticesArray.length === 0) return;

    
    gl.bufferData(gl.ARRAY_BUFFER, verticesArray, gl.STATIC_DRAW);

    // Ajusta a cor atual no shader
    gl.uniform4f(colorLocation, r, g, b, 1.0);

    // Desenha todos os triângulos deste tom
    gl.drawArrays(gl.TRIANGLES, 0, verticesArray.length / 2);
}

// Renderiza os 5 tons
desenharGrupo(vVermelhoBase,   1.0, 0.35, 0.35); // Vermelho Claro
desenharGrupo(vVermelhoMedio,  0.85, 0.05, 0.05); // Vermelho Médio
desenharGrupo(vVermelhoEscuro, 0.45, 0.0, 0.0);  // Vermelho Escuro
desenharGrupo(vVerdeClaro,     0.2, 0.85, 0.3);  // Verde Claro
desenharGrupo(vVerdeEscuro,    0.05, 0.45, 0.15); // Verde Escuro

})();
