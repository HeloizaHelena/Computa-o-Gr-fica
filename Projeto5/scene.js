// ==================================================
// CLASS - SCENE
// ==================================================

// Velocidade de deslocamento do helicóptero (unidades por frame)
const MOVE_SPEED = 0.02;

// Velocidade de rotação de cada hélice (radianos por frame)
const MAIN_ROTOR_SPEED = 0.3;
const TAIL_ROTOR_SPEED = 0.5;

// Escala aplicada ao helicóptero inteiro
// (deixa a figura menor, facilitando visualizar o deslocamento)
const HELICOPTER_SCALE = 0.6;

// Limites do deslocamento, em coordenadas de clip space (-1 a 1).
// MIN_Y é o "chão": considera a borda inferior da tela, descontando
// a parte do corpo que fica abaixo da origem do modelo (por isso não
// é -1 "cheio"). MAX_Y é o teto, descontando a altura da hélice
// principal acima da origem, para ela não passar da borda superior.
const MIN_Y = -0.85;
const MAX_Y = 0.7;

// Metade da largura do corpo (o quadrado azul, onde fica a haste das
// hélices superiores), já com a escala aplicada. É esse retângulo —
// e não a hélice, que é bem mais larga — que deve tocar a borda da
// tela para o helicóptero virar de lado. Assim a hélice pode passar
// um pouco da borda, mas o corpo nunca sai da view.
const BODY_HALF_WIDTH = 0.2 * HELICOPTER_SCALE;
const MAX_X = 1.0 - BODY_HALF_WIDTH;
const MIN_X = -MAX_X;

// Centro local da hélice da cauda (eixo X), usado como pivô da rotação.
// As pás dela ficam deslocadas do corpo (em torno de x = 0.70), então
// não pode girar em torno da origem como a hélice principal.
const TAIL_ROTOR_PIVOT_X = 0.70;

class Scene {

    constructor(gl, program) {

        this.renderer =
            new Renderer(gl, program);

        // Figura que será exibida
        this.helicopterBody = new HelicopterBody();

        this.helicopterTopShaft = new HelicopterTopShaft();

        this.helicopterTail = new HelicopterTail();

        this.helicopterPropellers = new HelicopterPropellers();

        this.helicopterTailPropeller = new HelicopterTailPropeller();

        // Posição atual do helicóptero (começa pousado, centralizado)
        this.posX = 0.0;
        this.posY = MIN_Y;

        // Ângulos de rotação de cada hélice
        this.mainRotorAngle = 0.0;
        this.tailRotorAngle = 0.0;

        // Lado para o qual o helicóptero está virado (1 = normal, -1 = espelhado).
        // Acompanha a última tecla lateral pressionada (setas esquerda/direita).
        this.direction = 1;

        // Estado das setas do teclado
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false
        };

        this.setupKeyboard();
    }

    setupKeyboard() {

        window.addEventListener("keydown", (event) => {

            if (event.key in this.keys) {
                this.keys[event.key] = true;
                event.preventDefault();
            }
        });

        window.addEventListener("keyup", (event) => {

            if (event.key in this.keys) {
                this.keys[event.key] = false;
                event.preventDefault();
            }
        });
    }

    updatePosition() {

        if (this.keys.ArrowUp) this.posY += MOVE_SPEED;
        if (this.keys.ArrowDown) this.posY -= MOVE_SPEED;
        if (this.keys.ArrowLeft) this.posX -= MOVE_SPEED;
        if (this.keys.ArrowRight) this.posX += MOVE_SPEED;

        // O helicóptero vira para acompanhar a direção do movimento
        // lateral: assim o corpo (nariz) sempre vai à frente e a
        // cauda sempre atrás, então é sempre o corpo — nunca a
        // cauda, que é mais comprida — que encosta na borda da tela.
        if (this.keys.ArrowRight) this.direction = -1;
        else if (this.keys.ArrowLeft) this.direction = 1;

        // Não deixa o helicóptero atravessar o chão, o teto
        // ou sair pelas laterais da tela
        this.posY = Math.min(Math.max(this.posY, MIN_Y), MAX_Y);
        this.posX = Math.min(Math.max(this.posX, MIN_X), MAX_X);
    }

    update() {

        this.updatePosition();

        // As hélices só giram enquanto o helicóptero está no ar.
        // Quando ele pousa (posY volta para o chão), elas param.
        const flying = this.posY > MIN_Y;

        if (flying) {
            this.mainRotorAngle += MAIN_ROTOR_SPEED;
            this.tailRotorAngle += TAIL_ROTOR_SPEED;
        }

        // --------------------------------------------
        // Partes que só acompanham posição/escala
        // (corpo, haste superior, cauda)
        // --------------------------------------------
        let staticTransform =
            m4.scaling(
                HELICOPTER_SCALE * this.direction,
                HELICOPTER_SCALE,
                HELICOPTER_SCALE
            );

        staticTransform =
            m4.translate(
                staticTransform,
                this.posX,
                this.posY,
                0
            );

        this.helicopterBody.update(staticTransform);
        this.helicopterTopShaft.update(staticTransform);
        this.helicopterTail.update(staticTransform);

        // --------------------------------------------
        // Hélice principal: gira em torno do eixo Y
        // (fica na horizontal, como a hélice de cima real)
        // --------------------------------------------
        let mainRotorTransform =
            m4.yRotation(this.mainRotorAngle);

        mainRotorTransform =
            m4.scale(
                mainRotorTransform,
                HELICOPTER_SCALE * this.direction,
                HELICOPTER_SCALE,
                HELICOPTER_SCALE
            );

        mainRotorTransform =
            m4.translate(
                mainRotorTransform,
                this.posX,
                this.posY,
                0
            );

        this.helicopterPropellers.update(mainRotorTransform);

        // --------------------------------------------
        // Hélice da cauda: gira no próprio eixo, no plano XY
        // (rotação em Z), em torno do seu centro local —
        // por isso o deslocamento até o pivô antes de girar
        // e a volta ao lugar depois
        // --------------------------------------------
        let tailRotorTransform =
            m4.translation(-TAIL_ROTOR_PIVOT_X, 0, 0);

        tailRotorTransform =
            m4.zRotate(
                tailRotorTransform,
                this.tailRotorAngle
            );

        tailRotorTransform =
            m4.translate(
                tailRotorTransform,
                TAIL_ROTOR_PIVOT_X,
                0,
                0
            );

        tailRotorTransform =
            m4.scale(
                tailRotorTransform,
                HELICOPTER_SCALE * this.direction,
                HELICOPTER_SCALE,
                HELICOPTER_SCALE
            );

        tailRotorTransform =
            m4.translate(
                tailRotorTransform,
                this.posX,
                this.posY,
                0
            );

        this.helicopterTailPropeller.update(tailRotorTransform);
    }

    draw() {

        gl.clear(
            gl.COLOR_BUFFER_BIT |
            gl.DEPTH_BUFFER_BIT
        );

        gl.useProgram(program);

        this.helicopterBody.draw(
            this.renderer
        );

        this.helicopterTopShaft.draw(
            this.renderer
        );

        this.helicopterTail.draw(
            this.renderer
        );

        this.helicopterPropellers.draw(
            this.renderer
        );

        this.helicopterTailPropeller.draw(
            this.renderer
        );
    }

    execute() {

        this.update();
        this.draw();

        requestAnimationFrame(
            () => this.execute()
        );
    }

    init() {

        requestAnimationFrame(
            () => this.execute()
        );
    }
}
