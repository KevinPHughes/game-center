/**
 * Virtual Aquarium Ecosystem Simulation using WebGL
 * Features multiple fish species, predator-prey dynamics, schooling behavior, and environmental effects
 */

class AquariumSimulation {
    constructor() {
        this.canvas = document.getElementById('aquariumCanvas');
        this.gl = this.canvas.getContext('webgl');
        
        if (!this.gl) {
            alert('WebGL not supported');
            return;
        }

        // Simulation parameters
        this.params = {
            smallFishCount: 60,
            mediumFishCount: 20,
            largeFishCount: 8,
            sharkCount: 2,
            huntingAggression: 1.0,
            fearRadius: 80,
            schoolingStrength: 1.5,
            swimmingSpeed: 1.2,
            panicResponse: 3.0,
            currentStrength: 0.5,
            bubbleDensity: 8,
            kelpDensity: 5,
            showTrails: true,
            showBubbles: true,
            showKelp: true,
            depthShading: true,
            schoolHighlight: true,
            followMouse: false
        };

        // Fish species definitions
        this.fishTypes = {
            small: { size: 8, speed: 1.5, color: [1.0, 0.9, 0.3], schooling: true, fearFactor: 2.0 },
            medium: { size: 15, speed: 1.2, color: [1.0, 0.6, 0.2], schooling: false, fearFactor: 1.5 },
            large: { size: 25, speed: 0.8, color: [0.3, 0.7, 1.0], schooling: false, fearFactor: 1.0 },
            shark: { size: 40, speed: 2.0, color: [0.8, 0.2, 0.2], schooling: false, fearFactor: 0.0 }
        };

        // Simulation state
        this.fish = [];
        this.sharks = [];
        this.bubbles = [];
        this.kelp = [];
        this.foodParticles = [];
        this.trails = [];
        this.currentTime = 0;
        this.isPaused = false;
        this.interactionMode = 'observe';
        this.mousePos = { x: 0, y: 0 };
        this.mousePressed = false;

        // Statistics
        this.stats = {
            totalFish: 0,
            schoolsFormed: 0,
            fishEaten: 0,
            foodDropped: 0,
            ecosystemHealth: 100
        };

        // Performance tracking
        this.lastTime = 0;
        this.frameCount = 0;
        this.fps = 0;

        this.init();
        this.setupEventListeners();
        this.animate();
    }

    init() {
        this.setupCanvas();
        this.initWebGL();
        this.createEnvironment();
        this.createFish();
        this.updateUI();
    }

    setupCanvas() {
        const resizeCanvas = () => {
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * window.devicePixelRatio;
            this.canvas.height = rect.height * window.devicePixelRatio;
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Mouse interaction
        this.canvas.addEventListener('mousedown', (e) => {
            this.mousePressed = true;
            this.updateMousePos(e);
            this.handleCanvasInteraction(e);
        });

        this.canvas.addEventListener('mouseup', () => {
            this.mousePressed = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            this.updateMousePos(e);
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mousePressed = false;
        });
    }

    updateMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePos.x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        this.mousePos.y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    }

    handleCanvasInteraction(e) {
        if (this.interactionMode === 'feed') {
            this.dropFood(this.mousePos.x, this.mousePos.y);
        } else if (this.interactionMode === 'scare') {
            this.scareNearbyFish(this.mousePos.x, this.mousePos.y);
        }
    }

    initWebGL() {
        // Enable blending for transparency effects
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        // Create shader program
        this.program = this.createShaderProgram();
        this.gl.useProgram(this.program);

        // Get attribute and uniform locations
        this.attribLocations = {
            position: this.gl.getAttribLocation(this.program, 'a_position'),
            color: this.gl.getAttribLocation(this.program, 'a_color')
        };

        this.uniformLocations = {
            resolution: this.gl.getUniformLocation(this.program, 'u_resolution'),
            time: this.gl.getUniformLocation(this.program, 'u_time')
        };

        // Create buffers
        this.positionBuffer = this.gl.createBuffer();
        this.colorBuffer = this.gl.createBuffer();
    }

    createShaderProgram() {
        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec4 a_color;
            uniform vec2 u_resolution;
            uniform float u_time;
            varying vec4 v_color;

            void main() {
                vec2 clipSpace = ((a_position / u_resolution) * 2.0 - 1.0) * vec2(1, -1);
                gl_Position = vec4(clipSpace, 0, 1);
                v_color = a_color;
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;
            varying vec4 v_color;

            void main() {
                gl_FragColor = v_color;
            }
        `;

        const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            console.error('Error linking shader program:', this.gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    }

    createShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Error compiling shader:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    createEnvironment() {
        this.createBubbles();
        this.createKelp();
    }

    createBubbles() {
        this.bubbles = [];
        for (let i = 0; i < this.params.bubbleDensity; i++) {
            this.bubbles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: 2 + Math.random() * 6,
                speed: 0.5 + Math.random() * 1,
                life: Math.random()
            });
        }
    }

    createKelp() {
        this.kelp = [];
        for (let i = 0; i < this.params.kelpDensity; i++) {
            const x = Math.random() * this.canvas.width;
            const height = 100 + Math.random() * 200;
            
            this.kelp.push({
                x: x,
                y: this.canvas.height,
                height: height,
                segments: Math.floor(height / 20),
                sway: Math.random() * Math.PI * 2,
                swaySpeed: 0.5 + Math.random() * 0.5
            });
        }
    }

    createFish() {
        this.fish = [];
        this.sharks = [];

        // Create small schooling fish
        for (let i = 0; i < this.params.smallFishCount; i++) {
            this.fish.push(this.createSingleFish('small'));
        }

        // Create medium fish
        for (let i = 0; i < this.params.mediumFishCount; i++) {
            this.fish.push(this.createSingleFish('medium'));
        }

        // Create large fish
        for (let i = 0; i < this.params.largeFishCount; i++) {
            this.fish.push(this.createSingleFish('large'));
        }

        // Create sharks
        for (let i = 0; i < this.params.sharkCount; i++) {
            this.sharks.push(this.createSingleFish('shark'));
        }
    }

    createSingleFish(type) {
        const fishType = this.fishTypes[type];
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            angle: Math.random() * Math.PI * 2,
            type: type,
            size: fishType.size + (Math.random() - 0.5) * fishType.size * 0.3,
            speed: fishType.speed * (0.8 + Math.random() * 0.4),
            color: [...fishType.color],
            schoolId: type === 'small' ? Math.floor(Math.random() * 5) : -1,
            fearLevel: 0,
            huntCooldown: 0,
            trail: [],
            swimPhase: Math.random() * Math.PI * 2,
            depth: Math.random() * 0.8 + 0.1 // 0.1 to 0.9 (surface to deep)
        };
    }

    updateSimulation() {
        if (this.isPaused) return;

        this.currentTime += 0.016; // Assume 60fps

        // Update fish behavior
        this.updateFish();
        this.updateSharks();
        
        // Update environment
        this.updateBubbles();
        this.updateKelp();
        this.updateFood();
        
        // Calculate ecosystem health
        this.calculateEcosystemHealth();
    }

    updateFish() {
        let schoolsFormed = 0;
        const schoolCenters = new Map();

        for (const fish of this.fish) {
            // Update swimming animation
            fish.swimPhase += 0.1;
            
            // Calculate forces
            let forceX = 0;
            let forceY = 0;

            // Schooling behavior for small fish
            if (fish.type === 'small' && this.params.schoolingStrength > 0) {
                const schoolForce = this.calculateSchoolingForce(fish);
                forceX += schoolForce.x * this.params.schoolingStrength;
                forceY += schoolForce.y * this.params.schoolingStrength;

                // Track school centers
                if (!schoolCenters.has(fish.schoolId)) {
                    schoolCenters.set(fish.schoolId, { x: fish.x, y: fish.y, count: 1 });
                } else {
                    const center = schoolCenters.get(fish.schoolId);
                    center.x += fish.x;
                    center.y += fish.y;
                    center.count++;
                }
            }

            // Fear response to sharks
            const fearForce = this.calculateFearForce(fish);
            forceX += fearForce.x;
            forceY += fearForce.y;

            // Attraction to food
            const foodForce = this.calculateFoodAttraction(fish);
            forceX += foodForce.x;
            forceY += foodForce.y;

            // Mouse following
            if (this.params.followMouse) {
                const mouseForce = this.calculateMouseAttraction(fish);
                forceX += mouseForce.x * 0.5;
                forceY += mouseForce.y * 0.5;
            }

            // Current effects
            forceX += this.params.currentStrength * (Math.sin(this.currentTime * 0.5 + fish.x * 0.01) * 0.1);
            forceY += this.params.currentStrength * (Math.cos(this.currentTime * 0.3 + fish.y * 0.01) * 0.05);

            // Boundary avoidance
            const boundaryForce = this.calculateBoundaryForce(fish);
            forceX += boundaryForce.x;
            forceY += boundaryForce.y;

            // Apply forces
            fish.vx += forceX * 0.1;
            fish.vy += forceY * 0.1;

            // Limit speed
            const speed = Math.sqrt(fish.vx * fish.vx + fish.vy * fish.vy);
            const maxSpeed = fish.speed * this.params.swimmingSpeed;
            if (speed > maxSpeed) {
                fish.vx = (fish.vx / speed) * maxSpeed;
                fish.vy = (fish.vy / speed) * maxSpeed;
            }

            // Update position
            fish.x += fish.vx;
            fish.y += fish.vy;

            // Update angle
            if (Math.abs(fish.vx) > 0.1 || Math.abs(fish.vy) > 0.1) {
                fish.angle = Math.atan2(fish.vy, fish.vx);
            }

            // Update trail
            if (this.params.showTrails) {
                fish.trail.push({ x: fish.x, y: fish.y, time: this.currentTime });
                if (fish.trail.length > 20) {
                    fish.trail.shift();
                }
            }

            // Decay fear
            fish.fearLevel *= 0.95;
        }

        // Count schools formed
        for (const center of schoolCenters.values()) {
            if (center.count >= 3) schoolsFormed++;
        }
        this.stats.schoolsFormed = schoolsFormed;
    }

    updateSharks() {
        for (const shark of this.sharks) {
            shark.swimPhase += 0.08;
            
            let forceX = 0;
            let forceY = 0;

            // Hunt nearby fish
            if (shark.huntCooldown <= 0) {
                const huntForce = this.calculateHuntingForce(shark);
                forceX += huntForce.x * this.params.huntingAggression;
                forceY += huntForce.y * this.params.huntingAggression;
            } else {
                shark.huntCooldown--;
            }

            // Random exploration when not hunting
            forceX += (Math.random() - 0.5) * 0.1;
            forceY += (Math.random() - 0.5) * 0.1;

            // Boundary avoidance
            const boundaryForce = this.calculateBoundaryForce(shark);
            forceX += boundaryForce.x;
            forceY += boundaryForce.y;

            // Apply forces
            shark.vx += forceX * 0.1;
            shark.vy += forceY * 0.1;

            // Limit speed
            const speed = Math.sqrt(shark.vx * shark.vx + shark.vy * shark.vy);
            const maxSpeed = shark.speed * this.params.swimmingSpeed;
            if (speed > maxSpeed) {
                shark.vx = (shark.vx / speed) * maxSpeed;
                shark.vy = (shark.vy / speed) * maxSpeed;
            }

            // Update position
            shark.x += shark.vx;
            shark.y += shark.vy;

            // Update angle
            if (Math.abs(shark.vx) > 0.1 || Math.abs(shark.vy) > 0.1) {
                shark.angle = Math.atan2(shark.vy, shark.vx);
            }

            // Check for catches
            this.checkSharkCatches(shark);
        }
    }

    calculateSchoolingForce(fish) {
        let separationX = 0, separationY = 0;
        let alignmentX = 0, alignmentY = 0;
        let cohesionX = 0, cohesionY = 0;
        let neighbors = 0;

        for (const other of this.fish) {
            if (other === fish || other.schoolId !== fish.schoolId) continue;

            const dx = other.x - fish.x;
            const dy = other.y - fish.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 60) {
                neighbors++;

                // Separation
                if (distance < 20 && distance > 0) {
                    separationX -= dx / distance;
                    separationY -= dy / distance;
                }

                // Alignment
                alignmentX += other.vx;
                alignmentY += other.vy;

                // Cohesion
                cohesionX += dx;
                cohesionY += dy;
            }
        }

        let totalX = 0, totalY = 0;

        if (neighbors > 0) {
            // Normalize and combine forces
            separationX *= 2;
            separationY *= 2;

            alignmentX = (alignmentX / neighbors - fish.vx) * 0.5;
            alignmentY = (alignmentY / neighbors - fish.vy) * 0.5;

            cohesionX = (cohesionX / neighbors) * 0.01;
            cohesionY = (cohesionY / neighbors) * 0.01;

            totalX = separationX + alignmentX + cohesionX;
            totalY = separationY + alignmentY + cohesionY;
        }

        return { x: totalX, y: totalY };
    }

    calculateFearForce(fish) {
        let forceX = 0;
        let forceY = 0;
        const fearFactor = this.fishTypes[fish.type].fearFactor;

        for (const shark of this.sharks) {
            const dx = shark.x - fish.x;
            const dy = shark.y - fish.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < this.params.fearRadius && distance > 0) {
                const intensity = (this.params.fearRadius - distance) / this.params.fearRadius;
                const panicMultiplier = fish.fearLevel > 0.5 ? this.params.panicResponse : 1;
                
                forceX -= (dx / distance) * intensity * fearFactor * panicMultiplier;
                forceY -= (dy / distance) * intensity * fearFactor * panicMultiplier;
                
                fish.fearLevel = Math.min(fish.fearLevel + intensity * 0.1, 1);
            }
        }

        return { x: forceX, y: forceY };
    }

    calculateHuntingForce(shark) {
        let closestFish = null;
        let closestDistance = Infinity;

        for (const fish of this.fish) {
            const dx = fish.x - shark.x;
            const dy = fish.y - shark.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 150 && distance < closestDistance) {
                closestFish = fish;
                closestDistance = distance;
            }
        }

        if (closestFish) {
            const dx = closestFish.x - shark.x;
            const dy = closestFish.y - shark.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                return {
                    x: (dx / distance) * 2,
                    y: (dy / distance) * 2
                };
            }
        }

        return { x: 0, y: 0 };
    }

    calculateFoodAttraction(fish) {
        let forceX = 0;
        let forceY = 0;

        for (const food of this.foodParticles) {
            const dx = food.x - fish.x;
            const dy = food.y - fish.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 80 && distance > 0) {
                const intensity = (80 - distance) / 80;
                forceX += (dx / distance) * intensity * 0.5;
                forceY += (dy / distance) * intensity * 0.5;
            }
        }

        return { x: forceX, y: forceY };
    }

    calculateMouseAttraction(fish) {
        const dx = this.mousePos.x - fish.x;
        const dy = this.mousePos.y - fish.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0 && distance < 200) {
            const intensity = (200 - distance) / 200;
            return {
                x: (dx / distance) * intensity,
                y: (dy / distance) * intensity
            };
        }

        return { x: 0, y: 0 };
    }

    calculateBoundaryForce(entity) {
        let forceX = 0;
        let forceY = 0;
        const margin = 50;

        if (entity.x < margin) {
            forceX = (margin - entity.x) / margin;
        } else if (entity.x > this.canvas.width - margin) {
            forceX = -((entity.x - (this.canvas.width - margin)) / margin);
        }

        if (entity.y < margin) {
            forceY = (margin - entity.y) / margin;
        } else if (entity.y > this.canvas.height - margin) {
            forceY = -((entity.y - (this.canvas.height - margin)) / margin);
        }

        return { x: forceX, y: forceY };
    }

    checkSharkCatches(shark) {
        for (let i = this.fish.length - 1; i >= 0; i--) {
            const fish = this.fish[i];
            const dx = shark.x - fish.x;
            const dy = shark.y - fish.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < shark.size) {
                this.fish.splice(i, 1);
                shark.huntCooldown = 180; // 3 seconds at 60fps
                this.stats.fishEaten++;
            }
        }
    }

    updateBubbles() {
        for (const bubble of this.bubbles) {
            bubble.y -= bubble.speed;
            bubble.life += 0.01;
            
            // Add some horizontal drift
            bubble.x += Math.sin(bubble.life * 2) * 0.5;

            // Reset bubble when it reaches the top
            if (bubble.y < -bubble.size) {
                bubble.y = this.canvas.height + bubble.size;
                bubble.x = Math.random() * this.canvas.width;
                bubble.life = 0;
            }
        }
    }

    updateKelp() {
        for (const kelp of this.kelp) {
            kelp.sway += kelp.swaySpeed * 0.02;
        }
    }

    updateFood() {
        for (let i = this.foodParticles.length - 1; i >= 0; i--) {
            const food = this.foodParticles[i];
            food.y += food.fallSpeed;
            food.life--;

            // Remove food that hits bottom or expires
            if (food.y > this.canvas.height || food.life <= 0) {
                this.foodParticles.splice(i, 1);
            }

            // Check if fish eat the food
            for (let j = this.fish.length - 1; j >= 0; j--) {
                const fish = this.fish[j];
                const dx = food.x - fish.x;
                const dy = food.y - fish.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < fish.size) {
                    this.foodParticles.splice(i, 1);
                    break;
                }
            }
        }
    }

    dropFood(x, y) {
        for (let i = 0; i < 5; i++) {
            this.foodParticles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y,
                size: 3 + Math.random() * 3,
                fallSpeed: 0.5 + Math.random() * 0.5,
                life: 600 // 10 seconds at 60fps
            });
        }
        this.stats.foodDropped++;
    }

    scareNearbyFish(x, y) {
        for (const fish of this.fish) {
            const dx = x - fish.x;
            const dy = y - fish.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 100) {
                fish.fearLevel = 1;
                // Add escape velocity
                const escapeForce = 5;
                fish.vx -= (dx / distance) * escapeForce;
                fish.vy -= (dy / distance) * escapeForce;
            }
        }
    }

    calculateEcosystemHealth() {
        const totalCreatures = this.fish.length + this.sharks.length;
        const expectedTotal = this.params.smallFishCount + this.params.mediumFishCount + 
                             this.params.largeFishCount + this.params.sharkCount;
        
        this.stats.ecosystemHealth = Math.round((totalCreatures / expectedTotal) * 100);
        this.stats.totalFish = this.fish.length;
    }

    render() {
        // Clear canvas with depth gradient
        if (this.params.depthShading) {
            this.gl.clearColor(0.067, 0.145, 0.361, 1.0); // Deep blue
        } else {
            this.gl.clearColor(0.2, 0.4, 0.8, 1.0); // Lighter blue
        }
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Set uniforms
        this.gl.uniform2f(this.uniformLocations.resolution, this.canvas.width, this.canvas.height);
        this.gl.uniform1f(this.uniformLocations.time, this.currentTime);

        // Render environment layers (back to front)
        if (this.params.showKelp) this.renderKelp();
        if (this.params.showBubbles) this.renderBubbles();
        
        // Render trails
        if (this.params.showTrails) this.renderTrails();
        
        // Render creatures
        this.renderFish();
        this.renderSharks();
        
        // Render food
        this.renderFood();
    }

    renderKelp() {
        const positions = [];
        const colors = [];

        for (const kelp of this.kelp) {
            const segments = kelp.segments;
            const segmentHeight = kelp.height / segments;
            
            for (let i = 0; i < segments; i++) {
                const y1 = kelp.y - i * segmentHeight;
                const y2 = kelp.y - (i + 1) * segmentHeight;
                
                const sway1 = Math.sin(kelp.sway + i * 0.2) * (i * 2);
                const sway2 = Math.sin(kelp.sway + (i + 1) * 0.2) * ((i + 1) * 2);
                
                const x1 = kelp.x + sway1;
                const x2 = kelp.x + sway2;
                const width = 3;

                // Kelp segment quad
                positions.push(
                    x1 - width, y1,
                    x1 + width, y1,
                    x2 - width, y2,
                    x2 + width, y1,
                    x2 + width, y2,
                    x2 - width, y2
                );

                // Green kelp color with depth shading
                const depthFactor = this.params.depthShading ? (1 - i / segments) * 0.5 + 0.3 : 0.8;
                const r = 0.1 * depthFactor;
                const g = 0.6 * depthFactor;
                const b = 0.2 * depthFactor;
                const a = 0.7;

                for (let j = 0; j < 6; j++) {
                    colors.push(r, g, b, a);
                }
            }
        }

        if (positions.length > 0) {
            this.drawTriangles(positions, colors);
        }
    }

    renderBubbles() {
        const positions = [];
        const colors = [];

        for (const bubble of this.bubbles) {
            const segments = 8;
            
            for (let i = 0; i < segments; i++) {
                const angle1 = (i / segments) * Math.PI * 2;
                const angle2 = ((i + 1) / segments) * Math.PI * 2;
                
                positions.push(
                    bubble.x, bubble.y,
                    bubble.x + Math.cos(angle1) * bubble.size, bubble.y + Math.sin(angle1) * bubble.size,
                    bubble.x + Math.cos(angle2) * bubble.size, bubble.y + Math.sin(angle2) * bubble.size
                );
                
                // Light blue bubble with transparency
                const alpha = 0.3 + Math.sin(bubble.life) * 0.1;
                colors.push(
                    0.8, 0.95, 1.0, 1.0,
                    0.6, 0.8, 1.0, alpha,
                    0.6, 0.8, 1.0, alpha
                );
            }
        }

        if (positions.length > 0) {
            this.drawTriangles(positions, colors);
        }
    }

    renderTrails() {
        const positions = [];
        const colors = [];

        const allCreatures = [...this.fish, ...this.sharks];
        
        for (const creature of allCreatures) {
            if (!creature.trail || creature.trail.length < 2) continue;

            for (let i = 0; i < creature.trail.length - 1; i++) {
                const current = creature.trail[i];
                const next = creature.trail[i + 1];
                const age = (this.currentTime - current.time) / 2; // Trail fades over 2 seconds
                const alpha = Math.max(0, (1 - age) * 0.3);

                if (alpha > 0.01) {
                    positions.push(current.x, current.y, next.x, next.y);
                    
                    // Use creature's color for trail
                    const [r, g, b] = creature.color;
                    colors.push(r, g, b, alpha, r, g, b, alpha);
                }
            }
        }

        if (positions.length > 0) {
            this.drawLines(positions, colors);
        }
    }

    renderFish() {
        const positions = [];
        const colors = [];

        for (const fish of this.fish) {
            this.addFishGeometry(fish, positions, colors);
        }

        if (positions.length > 0) {
            this.drawTriangles(positions, colors);
        }
    }

    renderSharks() {
        const positions = [];
        const colors = [];

        for (const shark of this.sharks) {
            this.addFishGeometry(shark, positions, colors);
        }

        if (positions.length > 0) {
            this.drawTriangles(positions, colors);
        }
    }

    addFishGeometry(creature, positions, colors) {
        const size = creature.size;
        const bodyWave = Math.sin(creature.swimPhase) * 0.2;
        
        // Fish body (ellipse)
        const segments = 8;
        for (let i = 0; i < segments; i++) {
            const angle1 = (i / segments) * Math.PI * 2;
            const angle2 = ((i + 1) / segments) * Math.PI * 2;
            
            const cos1 = Math.cos(angle1);
            const sin1 = Math.sin(angle1);
            const cos2 = Math.cos(angle2);
            const sin2 = Math.sin(angle2);
            
            // Apply fish orientation and swimming animation
            const bodyX1 = cos1 * size * 0.8 + bodyWave * cos1 * 0.2;
            const bodyY1 = sin1 * size * 0.5 + bodyWave * sin1 * 0.1;
            const bodyX2 = cos2 * size * 0.8 + bodyWave * cos2 * 0.2;
            const bodyY2 = sin2 * size * 0.5 + bodyWave * sin2 * 0.1;
            
            // Rotate based on fish angle
            const rotCos = Math.cos(creature.angle);
            const rotSin = Math.sin(creature.angle);
            
            const x1 = creature.x + (bodyX1 * rotCos - bodyY1 * rotSin);
            const y1 = creature.y + (bodyX1 * rotSin + bodyY1 * rotCos);
            const x2 = creature.x + (bodyX2 * rotCos - bodyY2 * rotSin);
            const y2 = creature.y + (bodyX2 * rotSin + bodyY2 * rotCos);
            
            positions.push(creature.x, creature.y, x1, y1, x2, y2);
            
            // Color based on fish type and state
            let [r, g, b] = creature.color;
            
            // Apply depth shading
            if (this.params.depthShading) {
                const depthFactor = 1 - creature.depth * 0.5;
                r *= depthFactor;
                g *= depthFactor;
                b *= depthFactor;
            }
            
            // Apply fear coloring
            if (creature.fearLevel > 0) {
                r = Math.min(r + creature.fearLevel * 0.5, 1);
                g *= (1 - creature.fearLevel * 0.3);
                b *= (1 - creature.fearLevel * 0.3);
            }
            
            // School highlighting
            if (this.params.schoolHighlight && creature.schoolId >= 0) {
                const schoolColors = [
                    [1, 1, 0.3], [0.3, 1, 1], [1, 0.3, 1], [0.3, 1, 0.3], [1, 0.6, 0.3]
                ];
                const schoolColor = schoolColors[creature.schoolId % schoolColors.length];
                r = r * 0.7 + schoolColor[0] * 0.3;
                g = g * 0.7 + schoolColor[1] * 0.3;
                b = b * 0.7 + schoolColor[2] * 0.3;
            }
            
            colors.push(r, g, b, 1.0, r, g, b, 1.0, r, g, b, 1.0);
        }
        
        // Add tail
        const tailWave = Math.sin(creature.swimPhase + Math.PI) * 0.5;
        const tailSize = size * 0.6;
        const tailX = -size * 1.2;
        const tailY1 = tailSize * 0.5 + tailWave * tailSize * 0.3;
        const tailY2 = -tailSize * 0.5 + tailWave * tailSize * 0.3;
        
        // Rotate tail
        const rotCos = Math.cos(creature.angle);
        const rotSin = Math.sin(creature.angle);
        
        const tx1 = creature.x + (tailX * rotCos - tailY1 * rotSin);
        const ty1 = creature.y + (tailX * rotSin + tailY1 * rotCos);
        const tx2 = creature.x + (tailX * rotCos - tailY2 * rotSin);
        const ty2 = creature.y + (tailX * rotSin + tailY2 * rotCos);
        
        positions.push(creature.x, creature.y, tx1, ty1, tx2, ty2);
        
        // Tail uses same color as body
        let [r, g, b] = creature.color;
        if (this.params.depthShading) {
            const depthFactor = 1 - creature.depth * 0.5;
            r *= depthFactor; g *= depthFactor; b *= depthFactor;
        }
        colors.push(r, g, b, 0.8, r, g, b, 0.8, r, g, b, 0.8);
    }

    renderFood() {
        const positions = [];
        const colors = [];

        for (const food of this.foodParticles) {
            const segments = 6;
            
            for (let i = 0; i < segments; i++) {
                const angle1 = (i / segments) * Math.PI * 2;
                const angle2 = ((i + 1) / segments) * Math.PI * 2;
                
                positions.push(
                    food.x, food.y,
                    food.x + Math.cos(angle1) * food.size, food.y + Math.sin(angle1) * food.size,
                    food.x + Math.cos(angle2) * food.size, food.y + Math.sin(angle2) * food.size
                );
                
                // Orange/brown food color
                colors.push(
                    1.0, 0.7, 0.2, 1.0,
                    0.8, 0.5, 0.1, 0.9,
                    0.8, 0.5, 0.1, 0.9
                );
            }
        }

        if (positions.length > 0) {
            this.drawTriangles(positions, colors);
        }
    }

    drawTriangles(positions, colors) {
        // Upload position data
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.DYNAMIC_DRAW);
        this.gl.enableVertexAttribArray(this.attribLocations.position);
        this.gl.vertexAttribPointer(this.attribLocations.position, 2, this.gl.FLOAT, false, 0, 0);

        // Upload color data
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.DYNAMIC_DRAW);
        this.gl.enableVertexAttribArray(this.attribLocations.color);
        this.gl.vertexAttribPointer(this.attribLocations.color, 4, this.gl.FLOAT, false, 0, 0);

        // Draw triangles
        this.gl.drawArrays(this.gl.TRIANGLES, 0, positions.length / 2);
    }

    drawLines(positions, colors) {
        // Upload position data
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.DYNAMIC_DRAW);
        this.gl.enableVertexAttribArray(this.attribLocations.position);
        this.gl.vertexAttribPointer(this.attribLocations.position, 2, this.gl.FLOAT, false, 0, 0);

        // Upload color data
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(colors), this.gl.DYNAMIC_DRAW);
        this.gl.enableVertexAttribArray(this.attribLocations.color);
        this.gl.vertexAttribPointer(this.attribLocations.color, 4, this.gl.FLOAT, false, 0, 0);

        // Draw lines
        this.gl.drawArrays(this.gl.LINES, 0, positions.length / 2);
    }

    animate(currentTime = 0) {
        // Calculate FPS
        if (currentTime - this.lastTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
            this.frameCount = 0;
            this.lastTime = currentTime;
            this.updatePerformanceDisplay();
        }
        this.frameCount++;

        // Update simulation
        this.updateSimulation();
        
        // Render
        this.render();

        // Continue animation
        requestAnimationFrame((time) => this.animate(time));
    }

    setupEventListeners() {
        // Fish population controls
        document.getElementById('smallFishCount').addEventListener('input', (e) => {
            this.params.smallFishCount = parseInt(e.target.value);
            this.adjustFishPopulation();
            this.updateUI();
        });

        document.getElementById('mediumFishCount').addEventListener('input', (e) => {
            this.params.mediumFishCount = parseInt(e.target.value);
            this.adjustFishPopulation();
            this.updateUI();
        });

        document.getElementById('largeFishCount').addEventListener('input', (e) => {
            this.params.largeFishCount = parseInt(e.target.value);
            this.adjustFishPopulation();
            this.updateUI();
        });

        document.getElementById('sharkCount').addEventListener('input', (e) => {
            this.params.sharkCount = parseInt(e.target.value);
            this.adjustSharkPopulation();
            this.updateUI();
        });

        // Predator controls
        document.getElementById('huntingAggression').addEventListener('input', (e) => {
            this.params.huntingAggression = parseFloat(e.target.value);
            this.updateUI();
        });

        document.getElementById('fearRadius').addEventListener('input', (e) => {
            this.params.fearRadius = parseInt(e.target.value);
            this.updateUI();
        });

        // Behavior controls
        document.getElementById('schoolingStrength').addEventListener('input', (e) => {
            this.params.schoolingStrength = parseFloat(e.target.value);
            this.updateUI();
        });

        document.getElementById('swimmingSpeed').addEventListener('input', (e) => {
            this.params.swimmingSpeed = parseFloat(e.target.value);
            this.updateUI();
        });

        document.getElementById('panicResponse').addEventListener('input', (e) => {
            this.params.panicResponse = parseFloat(e.target.value);
            this.updateUI();
        });

        // Environment controls
        document.getElementById('currentStrength').addEventListener('input', (e) => {
            this.params.currentStrength = parseFloat(e.target.value);
            this.updateUI();
        });

        document.getElementById('bubbleDensity').addEventListener('input', (e) => {
            this.params.bubbleDensity = parseInt(e.target.value);
            this.adjustBubbleDensity();
            this.updateUI();
        });

        document.getElementById('kelpDensity').addEventListener('input', (e) => {
            this.params.kelpDensity = parseInt(e.target.value);
            this.createKelp();
            this.updateUI();
        });

        // Visual effects
        document.getElementById('showTrails').addEventListener('change', (e) => {
            this.params.showTrails = e.target.checked;
        });

        document.getElementById('showBubbles').addEventListener('change', (e) => {
            this.params.showBubbles = e.target.checked;
        });

        document.getElementById('showKelp').addEventListener('change', (e) => {
            this.params.showKelp = e.target.checked;
        });

        document.getElementById('depthShading').addEventListener('change', (e) => {
            this.params.depthShading = e.target.checked;
        });

        document.getElementById('schoolHighlight').addEventListener('change', (e) => {
            this.params.schoolHighlight = e.target.checked;
        });

        document.getElementById('followMouse').addEventListener('change', (e) => {
            this.params.followMouse = e.target.checked;
        });

        // Interaction buttons
        document.getElementById('feedFish').addEventListener('click', () => {
            this.interactionMode = 'feed';
            this.updateModeIndicator();
        });

        document.getElementById('scarefish').addEventListener('click', () => {
            this.interactionMode = 'scare';
            this.updateModeIndicator();
        });

        // Control buttons
        document.getElementById('resetAquarium').addEventListener('click', () => {
            this.resetAquarium();
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            document.getElementById('pauseBtn').textContent = this.isPaused ? 'Resume' : 'Pause';
        });
    }

    adjustFishPopulation() {
        // Filter fish by type
        const smallFish = this.fish.filter(f => f.type === 'small');
        const mediumFish = this.fish.filter(f => f.type === 'medium');
        const largeFish = this.fish.filter(f => f.type === 'large');

        // Adjust small fish
        while (smallFish.length < this.params.smallFishCount) {
            this.fish.push(this.createSingleFish('small'));
            smallFish.push(this.fish[this.fish.length - 1]);
        }
        while (smallFish.length > this.params.smallFishCount) {
            const index = this.fish.indexOf(smallFish.pop());
            this.fish.splice(index, 1);
        }

        // Adjust medium fish
        while (mediumFish.length < this.params.mediumFishCount) {
            this.fish.push(this.createSingleFish('medium'));
            mediumFish.push(this.fish[this.fish.length - 1]);
        }
        while (mediumFish.length > this.params.mediumFishCount) {
            const index = this.fish.indexOf(mediumFish.pop());
            this.fish.splice(index, 1);
        }

        // Adjust large fish
        while (largeFish.length < this.params.largeFishCount) {
            this.fish.push(this.createSingleFish('large'));
            largeFish.push(this.fish[this.fish.length - 1]);
        }
        while (largeFish.length > this.params.largeFishCount) {
            const index = this.fish.indexOf(largeFish.pop());
            this.fish.splice(index, 1);
        }
    }

    adjustSharkPopulation() {
        while (this.sharks.length < this.params.sharkCount) {
            this.sharks.push(this.createSingleFish('shark'));
        }
        while (this.sharks.length > this.params.sharkCount) {
            this.sharks.pop();
        }
    }

    adjustBubbleDensity() {
        while (this.bubbles.length < this.params.bubbleDensity) {
            this.bubbles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: 2 + Math.random() * 6,
                speed: 0.5 + Math.random() * 1,
                life: Math.random()
            });
        }
        while (this.bubbles.length > this.params.bubbleDensity) {
            this.bubbles.pop();
        }
    }

    resetAquarium() {
        this.createFish();
        this.createEnvironment();
        this.foodParticles = [];
        this.stats.fishEaten = 0;
        this.stats.foodDropped = 0;
        this.interactionMode = 'observe';
        this.updateModeIndicator();
    }

    updateModeIndicator() {
        const indicator = document.getElementById('modeIndicator');
        const canvas = this.canvas;
        
        switch (this.interactionMode) {
            case 'feed':
                indicator.textContent = 'Feed Fish';
                indicator.className = 'text-orange-400';
                canvas.className = 'w-full h-full cursor-pointer feeding-mode';
                break;
            case 'scare':
                indicator.textContent = 'Scare Fish';
                indicator.className = 'text-red-400';
                canvas.className = 'w-full h-full cursor-pointer scare-mode';
                break;
            default:
                indicator.textContent = 'Observe';
                indicator.className = 'text-green-400';
                canvas.className = 'w-full h-full cursor-pointer';
        }
    }

    updateUI() {
        document.getElementById('smallFishCountValue').textContent = this.params.smallFishCount;
        document.getElementById('mediumFishCountValue').textContent = this.params.mediumFishCount;
        document.getElementById('largeFishCountValue').textContent = this.params.largeFishCount;
        document.getElementById('sharkCountValue').textContent = this.params.sharkCount;
        document.getElementById('huntingAggressionValue').textContent = this.params.huntingAggression.toFixed(1);
        document.getElementById('fearRadiusValue').textContent = this.params.fearRadius;
        document.getElementById('schoolingStrengthValue').textContent = this.params.schoolingStrength.toFixed(1);
        document.getElementById('swimmingSpeedValue').textContent = this.params.swimmingSpeed.toFixed(1);
        document.getElementById('panicResponseValue').textContent = this.params.panicResponse.toFixed(1);
        document.getElementById('currentStrengthValue').textContent = this.params.currentStrength.toFixed(1);
        document.getElementById('bubbleDensityValue').textContent = this.params.bubbleDensity;
        document.getElementById('kelpDensityValue').textContent = this.params.kelpDensity;

        // Update statistics
        document.getElementById('totalFish').textContent = this.stats.totalFish;
        document.getElementById('schoolsFormed').textContent = this.stats.schoolsFormed;
        document.getElementById('fishEaten').textContent = this.stats.fishEaten;
        document.getElementById('foodDropped').textContent = this.stats.foodDropped;
        document.getElementById('ecosystemHealth').textContent = this.stats.ecosystemHealth + '%';
    }

    updatePerformanceDisplay() {
        document.getElementById('fpsCounter').textContent = this.fps;
        document.getElementById('entityCounter').textContent = 
            this.fish.length + this.sharks.length + this.bubbles.length + this.foodParticles.length;
    }
}

// Initialize aquarium when page loads
document.addEventListener('DOMContentLoaded', () => {
    new AquariumSimulation();
});