/**
 * Boids Flocking Simulation using WebGL
 * Implements the classic boids algorithm with separation, alignment, and cohesion
 */

class BoidsSimulation {
    constructor() {
        this.canvas = document.getElementById('simulationCanvas');
        this.gl = this.canvas.getContext('webgl');
        
        if (!this.gl) {
            alert('WebGL not supported');
            return;
        }

        // Simulation parameters
        this.params = {
            boidCount: 150,
            maxSpeed: 2.0,
            maxForce: 0.03,
            separationWeight: 1.5,
            alignmentWeight: 1.0,
            cohesionWeight: 1.0,
            trailLength: 10,
            boidSize: 6,
            showTrails: true,
            colorByVelocity: true,
            neighborRadius: 50,
            separationRadius: 25
        };

        // Simulation state
        this.boids = [];
        this.trails = [];
        this.isPaused = false;
        this.mousePos = { x: 0, y: 0 };
        this.mouseDown = false;

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
        this.createBoids();
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
            this.mouseDown = true;
            this.updateMousePos(e);
        });

        this.canvas.addEventListener('mouseup', () => {
            this.mouseDown = false;
        });

        this.canvas.addEventListener('mousemove', (e) => {
            this.updateMousePos(e);
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mouseDown = false;
        });
    }

    updateMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mousePos.x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        this.mousePos.y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
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
            transform: this.gl.getUniformLocation(this.program, 'u_transform')
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
            uniform mat3 u_transform;
            varying vec4 v_color;

            void main() {
                vec3 position = u_transform * vec3(a_position, 1.0);
                vec2 clipSpace = ((position.xy / u_resolution) * 2.0 - 1.0) * vec2(1, -1);
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

    createBoids() {
        this.boids = [];
        this.trails = [];

        for (let i = 0; i < this.params.boidCount; i++) {
            const boid = {
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                ax: 0,
                ay: 0
            };

            this.boids.push(boid);
            this.trails.push([]);
        }
    }

    updateBoids() {
        if (this.isPaused) return;

        // Calculate forces for each boid
        for (let i = 0; i < this.boids.length; i++) {
            const boid = this.boids[i];
            
            // Reset acceleration
            boid.ax = 0;
            boid.ay = 0;

            // Find neighbors
            const neighbors = this.getNeighbors(boid, i);

            // Apply boid rules
            const separation = this.separate(boid, neighbors);
            const alignment = this.align(boid, neighbors);
            const cohesion = this.seek(boid, this.getCenterOfMass(neighbors));

            // Apply mouse attraction
            if (this.mouseDown) {
                const mouseAttraction = this.seek(boid, this.mousePos);
                boid.ax += mouseAttraction.x * 2;
                boid.ay += mouseAttraction.y * 2;
            }

            // Combine forces
            boid.ax += separation.x * this.params.separationWeight;
            boid.ay += separation.y * this.params.separationWeight;
            boid.ax += alignment.x * this.params.alignmentWeight;
            boid.ay += alignment.y * this.params.alignmentWeight;
            boid.ax += cohesion.x * this.params.cohesionWeight;
            boid.ay += cohesion.y * this.params.cohesionWeight;

            // Apply boundary forces
            const boundary = this.boundaryForce(boid);
            boid.ax += boundary.x;
            boid.ay += boundary.y;

            // Limit force
            const forceMag = Math.sqrt(boid.ax * boid.ax + boid.ay * boid.ay);
            if (forceMag > this.params.maxForce) {
                boid.ax = (boid.ax / forceMag) * this.params.maxForce;
                boid.ay = (boid.ay / forceMag) * this.params.maxForce;
            }
        }

        // Update positions
        for (let i = 0; i < this.boids.length; i++) {
            const boid = this.boids[i];

            // Update velocity
            boid.vx += boid.ax;
            boid.vy += boid.ay;

            // Limit speed
            const speed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy);
            if (speed > this.params.maxSpeed) {
                boid.vx = (boid.vx / speed) * this.params.maxSpeed;
                boid.vy = (boid.vy / speed) * this.params.maxSpeed;
            }

            // Update position
            boid.x += boid.vx;
            boid.y += boid.vy;

            // Update trail
            if (this.params.showTrails) {
                this.trails[i].push({ x: boid.x, y: boid.y });
                if (this.trails[i].length > this.params.trailLength) {
                    this.trails[i].shift();
                }
            } else {
                this.trails[i] = [];
            }

            // Wrap around edges
            if (boid.x < 0) boid.x = this.canvas.width;
            if (boid.x > this.canvas.width) boid.x = 0;
            if (boid.y < 0) boid.y = this.canvas.height;
            if (boid.y > this.canvas.height) boid.y = 0;
        }
    }

    getNeighbors(boid, index) {
        const neighbors = [];
        for (let i = 0; i < this.boids.length; i++) {
            if (i === index) continue;
            
            const other = this.boids[i];
            const distance = this.distance(boid, other);
            
            if (distance < this.params.neighborRadius) {
                neighbors.push(other);
            }
        }
        return neighbors;
    }

    separate(boid, neighbors) {
        const steer = { x: 0, y: 0 };
        let count = 0;

        for (const neighbor of neighbors) {
            const distance = this.distance(boid, neighbor);
            if (distance < this.params.separationRadius && distance > 0) {
                const diff = {
                    x: boid.x - neighbor.x,
                    y: boid.y - neighbor.y
                };
                
                // Weight by distance
                const mag = Math.sqrt(diff.x * diff.x + diff.y * diff.y);
                if (mag > 0) {
                    diff.x /= (mag * mag);
                    diff.y /= (mag * mag);
                }

                steer.x += diff.x;
                steer.y += diff.y;
                count++;
            }
        }

        if (count > 0) {
            steer.x /= count;
            steer.y /= count;
            
            // Normalize and scale
            const mag = Math.sqrt(steer.x * steer.x + steer.y * steer.y);
            if (mag > 0) {
                steer.x = (steer.x / mag) * this.params.maxSpeed;
                steer.y = (steer.y / mag) * this.params.maxSpeed;
                
                steer.x -= boid.vx;
                steer.y -= boid.vy;
            }
        }

        return steer;
    }

    align(boid, neighbors) {
        if (neighbors.length === 0) return { x: 0, y: 0 };

        const sum = { x: 0, y: 0 };
        for (const neighbor of neighbors) {
            sum.x += neighbor.vx;
            sum.y += neighbor.vy;
        }

        sum.x /= neighbors.length;
        sum.y /= neighbors.length;

        // Normalize and scale
        const mag = Math.sqrt(sum.x * sum.x + sum.y * sum.y);
        if (mag > 0) {
            sum.x = (sum.x / mag) * this.params.maxSpeed;
            sum.y = (sum.y / mag) * this.params.maxSpeed;
            
            sum.x -= boid.vx;
            sum.y -= boid.vy;
        }

        return sum;
    }

    seek(boid, target) {
        const desired = {
            x: target.x - boid.x,
            y: target.y - boid.y
        };

        const mag = Math.sqrt(desired.x * desired.x + desired.y * desired.y);
        if (mag > 0) {
            desired.x = (desired.x / mag) * this.params.maxSpeed;
            desired.y = (desired.y / mag) * this.params.maxSpeed;
        }

        const steer = {
            x: desired.x - boid.vx,
            y: desired.y - boid.vy
        };

        return steer;
    }

    getCenterOfMass(neighbors) {
        if (neighbors.length === 0) return { x: 0, y: 0 };

        const sum = { x: 0, y: 0 };
        for (const neighbor of neighbors) {
            sum.x += neighbor.x;
            sum.y += neighbor.y;
        }

        return {
            x: sum.x / neighbors.length,
            y: sum.y / neighbors.length
        };
    }

    boundaryForce(boid) {
        const force = { x: 0, y: 0 };
        const margin = 50;

        if (boid.x < margin) {
            force.x = (margin - boid.x) / margin * 0.5;
        } else if (boid.x > this.canvas.width - margin) {
            force.x = -((boid.x - (this.canvas.width - margin)) / margin * 0.5);
        }

        if (boid.y < margin) {
            force.y = (margin - boid.y) / margin * 0.5;
        } else if (boid.y > this.canvas.height - margin) {
            force.y = -((boid.y - (this.canvas.height - margin)) / margin * 0.5);
        }

        return force;
    }

    distance(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    render() {
        // Clear canvas
        this.gl.clearColor(0.059, 0.09, 0.165, 1.0); // Dark blue background
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Set resolution uniform
        this.gl.uniform2f(this.uniformLocations.resolution, this.canvas.width, this.canvas.height);
        
        // Render trails
        if (this.params.showTrails) {
            this.renderTrails();
        }

        // Render boids
        this.renderBoids();
    }

    renderTrails() {
        const positions = [];
        const colors = [];

        for (let i = 0; i < this.trails.length; i++) {
            const trail = this.trails[i];
            const boid = this.boids[i];
            
            for (let j = 0; j < trail.length - 1; j++) {
                const alpha = (j / trail.length) * 0.3;
                const color = this.getBoidColor(boid, alpha);

                // Line segment
                positions.push(trail[j].x, trail[j].y);
                positions.push(trail[j + 1].x, trail[j + 1].y);
                
                colors.push(...color, ...color);
            }
        }

        if (positions.length > 0) {
            this.drawLines(positions, colors);
        }
    }

    renderBoids() {
        const positions = [];
        const colors = [];

        for (const boid of this.boids) {
            const angle = Math.atan2(boid.vy, boid.vx);
            const size = this.params.boidSize;
            
            // Create triangle pointing in direction of movement
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            
            // Triangle vertices (pointing right initially)
            const vertices = [
                { x: size, y: 0 },      // Tip
                { x: -size, y: size/2 }, // Bottom left
                { x: -size, y: -size/2 } // Top left
            ];

            // Rotate and translate vertices
            for (const vertex of vertices) {
                const rotatedX = vertex.x * cos - vertex.y * sin;
                const rotatedY = vertex.x * sin + vertex.y * cos;
                
                positions.push(boid.x + rotatedX, boid.y + rotatedY);
            }

            // Color the boid
            const color = this.getBoidColor(boid, 1.0);
            colors.push(...color, ...color, ...color);
        }

        this.drawTriangles(positions, colors);
    }

    getBoidColor(boid, alpha = 1.0) {
        if (this.params.colorByVelocity) {
            const speed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy);
            const normalizedSpeed = Math.min(speed / this.params.maxSpeed, 1.0);
            
            // Color gradient from blue (slow) to red (fast)
            const r = normalizedSpeed;
            const g = 0.3 + normalizedSpeed * 0.5;
            const b = 1.0 - normalizedSpeed * 0.5;
            
            return [r, g, b, alpha];
        } else {
            return [0.3, 0.7, 1.0, alpha]; // Light blue
        }
    }

    drawTriangles(positions, colors) {
        // Set identity transform
        this.gl.uniformMatrix3fv(this.uniformLocations.transform, false, [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ]);

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
        // Set identity transform
        this.gl.uniformMatrix3fv(this.uniformLocations.transform, false, [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ]);

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
        this.updateBoids();
        
        // Render
        this.render();

        // Continue animation
        requestAnimationFrame((time) => this.animate(time));
    }

    setupEventListeners() {
        // Parameter controls
        document.getElementById('boidCount').addEventListener('input', (e) => {
            this.params.boidCount = parseInt(e.target.value);
            this.adjustBoidCount();
            this.updateUI();
        });

        document.getElementById('maxSpeed').addEventListener('input', (e) => {
            this.params.maxSpeed = parseFloat(e.target.value);
            this.updateUI();
        });

        document.getElementById('maxForce').addEventListener('input', (e) => {
            this.params.maxForce = parseFloat(e.target.value);
            this.updateUI();
        });

        document.getElementById('separationWeight').addEventListener('input', (e) => {
            this.params.separationWeight = parseFloat(e.target.value);
            this.updateUI();
        });

        document.getElementById('alignmentWeight').addEventListener('input', (e) => {
            this.params.alignmentWeight = parseFloat(e.target.value);
            this.updateUI();
        });

        document.getElementById('cohesionWeight').addEventListener('input', (e) => {
            this.params.cohesionWeight = parseFloat(e.target.value);
            this.updateUI();
        });

        document.getElementById('trailLength').addEventListener('input', (e) => {
            this.params.trailLength = parseInt(e.target.value);
            this.updateUI();
        });

        document.getElementById('boidSize').addEventListener('input', (e) => {
            this.params.boidSize = parseFloat(e.target.value);
            this.updateUI();
        });

        document.getElementById('showTrails').addEventListener('change', (e) => {
            this.params.showTrails = e.target.checked;
            if (!this.params.showTrails) {
                this.trails = this.trails.map(() => []);
            }
        });

        document.getElementById('colorByVelocity').addEventListener('change', (e) => {
            this.params.colorByVelocity = e.target.checked;
        });

        // Control buttons
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.createBoids();
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            document.getElementById('pauseBtn').textContent = this.isPaused ? 'Resume' : 'Pause';
        });
    }

    adjustBoidCount() {
        const currentCount = this.boids.length;
        const targetCount = this.params.boidCount;

        if (targetCount > currentCount) {
            // Add boids
            for (let i = currentCount; i < targetCount; i++) {
                const boid = {
                    x: Math.random() * this.canvas.width,
                    y: Math.random() * this.canvas.height,
                    vx: (Math.random() - 0.5) * 4,
                    vy: (Math.random() - 0.5) * 4,
                    ax: 0,
                    ay: 0
                };
                this.boids.push(boid);
                this.trails.push([]);
            }
        } else if (targetCount < currentCount) {
            // Remove boids
            this.boids = this.boids.slice(0, targetCount);
            this.trails = this.trails.slice(0, targetCount);
        }
    }

    updateUI() {
        document.getElementById('boidCountValue').textContent = this.params.boidCount;
        document.getElementById('maxSpeedValue').textContent = this.params.maxSpeed.toFixed(1);
        document.getElementById('maxForceValue').textContent = this.params.maxForce.toFixed(3);
        document.getElementById('separationWeightValue').textContent = this.params.separationWeight.toFixed(1);
        document.getElementById('alignmentWeightValue').textContent = this.params.alignmentWeight.toFixed(1);
        document.getElementById('cohesionWeightValue').textContent = this.params.cohesionWeight.toFixed(1);
        document.getElementById('trailLengthValue').textContent = this.params.trailLength;
        document.getElementById('boidSizeValue').textContent = this.params.boidSize;
    }

    updatePerformanceDisplay() {
        document.getElementById('fpsCounter').textContent = this.fps;
        document.getElementById('boidCounter').textContent = this.boids.length;
    }
}

// Initialize simulation when page loads
document.addEventListener('DOMContentLoaded', () => {
    new BoidsSimulation();
});
