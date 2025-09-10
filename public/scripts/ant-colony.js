/**
 * Ant Colony Optimization Simulation using WebGL
 * Demonstrates emergent pathfinding through pheromone trail following
 */

class AntColonySimulation {
    constructor() {
        this.canvas = document.getElementById('simulationCanvas');
        this.gl = this.canvas.getContext('webgl');
        
        if (!this.gl) {
            alert('WebGL not supported');
            return;
        }

        // Simulation parameters
        this.params = {
            antCount: 100,
            antSpeed: 1.5,
            pheromoneStrength: 1.0,
            evaporationRate: 0.005,
            trailOpacity: 0.8,
            explorationRate: 0.1,
            pheromoneSensitivity: 5.0,
            searchRadius: 40,
            showPheromones: true,
            showAnts: true
        };

        // Simulation state
        this.ants = [];
        this.foodSources = [];
        this.nest = { x: 0, y: 0 }; // Will be set to center
        this.pheromoneGrid = [];
        this.pheromoneGridWidth = 0;
        this.pheromoneGridHeight = 0;
        this.pheromoneGridResolution = 4; // Pixels per grid cell
        this.isPaused = false;
        this.addingFood = true;

        // Statistics
        this.stats = {
            foodCollected: 0,
            activeTrails: 0,
            exploringAnts: 0,
            returningAnts: 0
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
        this.setupPheromoneGrid();
        this.createNest();
        this.createAnts();
        this.addInitialFood();
        this.updateUI();
    }

    setupCanvas() {
        const resizeCanvas = () => {
            const rect = this.canvas.getBoundingClientRect();
            this.canvas.width = rect.width * window.devicePixelRatio;
            this.canvas.height = rect.height * window.devicePixelRatio;
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
            
            // Update nest position to center
            this.nest.x = this.canvas.width / 2;
            this.nest.y = this.canvas.height / 2;
            
            // Recreate pheromone grid for new size
            this.setupPheromoneGrid();
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Canvas interaction for food placement
        this.canvas.addEventListener('click', (e) => {
            if (this.addingFood) {
                this.addFoodAtPosition(e);
            }
        });
    }

    addFoodAtPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        
        // Don't place food too close to nest
        const distToNest = Math.sqrt((x - this.nest.x) ** 2 + (y - this.nest.y) ** 2);
        if (distToNest > 50) {
            this.foodSources.push({
                x: x,
                y: y,
                amount: 100,
                maxAmount: 100
            });
        }
    }

    setupPheromoneGrid() {
        this.pheromoneGridWidth = Math.ceil(this.canvas.width / this.pheromoneGridResolution);
        this.pheromoneGridHeight = Math.ceil(this.canvas.height / this.pheromoneGridResolution);
        
        this.pheromoneGrid = [];
        for (let i = 0; i < this.pheromoneGridWidth * this.pheromoneGridHeight; i++) {
            this.pheromoneGrid[i] = {
                toFood: 0,    // Pheromone leading to food
                toNest: 0     // Pheromone leading to nest
            };
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
            resolution: this.gl.getUniformLocation(this.program, 'u_resolution')
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

    createNest() {
        this.nest.x = this.canvas.width / 2;
        this.nest.y = this.canvas.height / 2;
    }

    createAnts() {
        this.ants = [];
        for (let i = 0; i < this.params.antCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 30;
            
            this.ants.push({
                x: this.nest.x + Math.cos(angle) * distance,
                y: this.nest.y + Math.sin(angle) * distance,
                angle: Math.random() * Math.PI * 2,
                hasFood: false,
                targetFood: null,
                lastPheromoneTime: 0
            });
        }
    }

    addInitialFood() {
        // Add some initial food sources
        const positions = [
            { x: 0.2, y: 0.3 },
            { x: 0.8, y: 0.7 },
            { x: 0.3, y: 0.8 }
        ];

        positions.forEach(pos => {
            this.foodSources.push({
                x: pos.x * this.canvas.width,
                y: pos.y * this.canvas.height,
                amount: 100,
                maxAmount: 100
            });
        });
    }

    updateAnts() {
        if (this.isPaused) return;

        // Reset statistics
        this.stats.exploringAnts = 0;
        this.stats.returningAnts = 0;

        for (const ant of this.ants) {
            if (ant.hasFood) {
                this.updateReturningAnt(ant);
                this.stats.returningAnts++;
            } else {
                this.updateExploringAnt(ant);
                this.stats.exploringAnts++;
            }

            // Move ant
            ant.x += Math.cos(ant.angle) * this.params.antSpeed;
            ant.y += Math.sin(ant.angle) * this.params.antSpeed;

            // Keep ant in bounds
            ant.x = Math.max(0, Math.min(this.canvas.width, ant.x));
            ant.y = Math.max(0, Math.min(this.canvas.height, ant.y));

            // Drop pheromones
            this.dropPheromone(ant);
        }
    }

    updateExploringAnt(ant) {
        // Look for food
        const nearbyFood = this.findNearbyFood(ant);
        if (nearbyFood) {
            ant.hasFood = true;
            ant.targetFood = nearbyFood;
            nearbyFood.amount -= 1;
            if (nearbyFood.amount <= 0) {
                this.removeFoodSource(nearbyFood);
            }
            // Turn towards nest
            ant.angle = Math.atan2(this.nest.y - ant.y, this.nest.x - ant.x) + (Math.random() - 0.5) * 0.5;
            return;
        }

        // Follow pheromone trail to food or explore randomly
        const pheromoneDirection = this.samplePheromone(ant, 'toFood');
        if (pheromoneDirection && Math.random() > this.params.explorationRate) {
            ant.angle = pheromoneDirection;
        } else {
            // Random exploration with slight bias towards current direction
            ant.angle += (Math.random() - 0.5) * 0.3;
        }
    }

    updateReturningAnt(ant) {
        // Check if reached nest
        const distToNest = Math.sqrt((ant.x - this.nest.x) ** 2 + (ant.y - this.nest.y) ** 2);
        if (distToNest < 20) {
            ant.hasFood = false;
            ant.targetFood = null;
            this.stats.foodCollected++;
            // Turn around to explore again
            ant.angle = Math.random() * Math.PI * 2;
            return;
        }

        // Follow pheromone trail to nest or head directly to nest
        const pheromoneDirection = this.samplePheromone(ant, 'toNest');
        if (pheromoneDirection && Math.random() > this.params.explorationRate) {
            ant.angle = pheromoneDirection;
        } else {
            // Head towards nest
            ant.angle = Math.atan2(this.nest.y - ant.y, this.nest.x - ant.x) + (Math.random() - 0.5) * 0.2;
        }
    }

    findNearbyFood(ant) {
        for (const food of this.foodSources) {
            const distance = Math.sqrt((ant.x - food.x) ** 2 + (ant.y - food.y) ** 2);
            if (distance < 15 && food.amount > 0) {
                return food;
            }
        }
        return null;
    }

    removeFoodSource(targetFood) {
        const index = this.foodSources.indexOf(targetFood);
        if (index > -1) {
            this.foodSources.splice(index, 1);
        }
    }

    dropPheromone(ant) {
        const gridX = Math.floor(ant.x / this.pheromoneGridResolution);
        const gridY = Math.floor(ant.y / this.pheromoneGridResolution);
        const index = gridY * this.pheromoneGridWidth + gridX;

        if (index >= 0 && index < this.pheromoneGrid.length) {
            const cell = this.pheromoneGrid[index];
            
            if (ant.hasFood) {
                // Drop "to food" pheromone when returning with food
                cell.toFood += this.params.pheromoneStrength;
            } else {
                // Drop "to nest" pheromone when exploring (helps others find their way back)
                cell.toNest += this.params.pheromoneStrength * 0.3;
            }
        }
    }

    samplePheromone(ant, type) {
        const radius = this.params.searchRadius;
        let maxPheromone = 0;
        let bestDirection = null;

        // Sample pheromone in a circle around the ant
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
            const checkX = ant.x + Math.cos(angle) * radius;
            const checkY = ant.y + Math.sin(angle) * radius;
            
            const gridX = Math.floor(checkX / this.pheromoneGridResolution);
            const gridY = Math.floor(checkY / this.pheromoneGridResolution);
            const index = gridY * this.pheromoneGridWidth + gridX;

            if (index >= 0 && index < this.pheromoneGrid.length) {
                const pheromoneLevel = this.pheromoneGrid[index][type];
                
                if (pheromoneLevel > maxPheromone) {
                    maxPheromone = pheromoneLevel;
                    bestDirection = angle;
                }
            }
        }

        // Apply sensitivity threshold
        if (maxPheromone > 1 / this.params.pheromoneSensitivity) {
            return bestDirection;
        }
        
        return null;
    }

    updatePheromones() {
        if (this.isPaused) return;

        let activeTrails = 0;
        
        for (const cell of this.pheromoneGrid) {
            // Evaporate pheromones
            cell.toFood *= (1 - this.params.evaporationRate);
            cell.toNest *= (1 - this.params.evaporationRate);
            
            // Count active trails
            if (cell.toFood > 0.1 || cell.toNest > 0.1) {
                activeTrails++;
            }
        }
        
        this.stats.activeTrails = activeTrails;
    }

    render() {
        // Clear canvas
        this.gl.clearColor(0.067, 0.145, 0.361, 1.0); // Dark blue background
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // Set resolution uniform
        this.gl.uniform2f(this.uniformLocations.resolution, this.canvas.width, this.canvas.height);

        // Render pheromone trails
        if (this.params.showPheromones) {
            this.renderPheromones();
        }

        // Render nest
        this.renderNest();

        // Render food sources
        this.renderFood();

        // Render ants
        if (this.params.showAnts) {
            this.renderAnts();
        }
    }

    renderPheromones() {
        const positions = [];
        const colors = [];

        for (let y = 0; y < this.pheromoneGridHeight; y++) {
            for (let x = 0; x < this.pheromoneGridWidth; x++) {
                const index = y * this.pheromoneGridWidth + x;
                const cell = this.pheromoneGrid[index];
                
                const foodPheromone = Math.min(cell.toFood, 10) / 10;
                const nestPheromone = Math.min(cell.toNest, 10) / 10;
                
                if (foodPheromone > 0.01 || nestPheromone > 0.01) {
                    const worldX = x * this.pheromoneGridResolution;
                    const worldY = y * this.pheromoneGridResolution;
                    const size = this.pheromoneGridResolution;
                    
                    // Create quad for this pheromone cell
                    positions.push(
                        worldX, worldY,
                        worldX + size, worldY,
                        worldX, worldY + size,
                        worldX + size, worldY,
                        worldX + size, worldY + size,
                        worldX, worldY + size
                    );
                    
                    // Color based on pheromone type and strength
                    const alpha = Math.max(foodPheromone, nestPheromone) * this.params.trailOpacity;
                    let r, g, b;
                    
                    if (foodPheromone > nestPheromone) {
                        // Food pheromone - green
                        r = 0.2;
                        g = 0.8;
                        b = 0.3;
                    } else {
                        // Nest pheromone - blue
                        r = 0.3;
                        g = 0.6;
                        b = 1.0;
                    }
                    
                    // Add color for each vertex of the quad
                    for (let i = 0; i < 6; i++) {
                        colors.push(r, g, b, alpha);
                    }
                }
            }
        }

        if (positions.length > 0) {
            this.drawTriangles(positions, colors);
        }
    }

    renderNest() {
        const positions = [];
        const colors = [];
        
        const nestSize = 25;
        const segments = 16;
        
        // Create circle for nest
        for (let i = 0; i < segments; i++) {
            const angle1 = (i / segments) * Math.PI * 2;
            const angle2 = ((i + 1) / segments) * Math.PI * 2;
            
            // Triangle from center
            positions.push(
                this.nest.x, this.nest.y,
                this.nest.x + Math.cos(angle1) * nestSize, this.nest.y + Math.sin(angle1) * nestSize,
                this.nest.x + Math.cos(angle2) * nestSize, this.nest.y + Math.sin(angle2) * nestSize
            );
            
            // Orange color for nest
            colors.push(
                1.0, 0.6, 0.0, 1.0,
                1.0, 0.4, 0.0, 0.8,
                1.0, 0.4, 0.0, 0.8
            );
        }
        
        this.drawTriangles(positions, colors);
    }

    renderFood() {
        const positions = [];
        const colors = [];
        
        for (const food of this.foodSources) {
            const size = 8 + (food.amount / food.maxAmount) * 12;
            const segments = 8;
            
            // Create circle for food
            for (let i = 0; i < segments; i++) {
                const angle1 = (i / segments) * Math.PI * 2;
                const angle2 = ((i + 1) / segments) * Math.PI * 2;
                
                positions.push(
                    food.x, food.y,
                    food.x + Math.cos(angle1) * size, food.y + Math.sin(angle1) * size,
                    food.x + Math.cos(angle2) * size, food.y + Math.sin(angle2) * size
                );
                
                // Green color for food, alpha based on amount
                const alpha = 0.5 + (food.amount / food.maxAmount) * 0.5;
                colors.push(
                    0.2, 1.0, 0.3, 1.0,
                    0.0, 0.8, 0.2, alpha,
                    0.0, 0.8, 0.2, alpha
                );
            }
        }
        
        if (positions.length > 0) {
            this.drawTriangles(positions, colors);
        }
    }

    renderAnts() {
        const positions = [];
        const colors = [];
        
        for (const ant of this.ants) {
            const size = 3;
            
            // Create triangle pointing in direction of movement
            const cos = Math.cos(ant.angle);
            const sin = Math.sin(ant.angle);
            
            // Triangle vertices
            const vertices = [
                { x: size * 1.5, y: 0 },      // Tip
                { x: -size, y: size },         // Bottom left
                { x: -size, y: -size }         // Top left
            ];

            // Rotate and translate vertices
            for (const vertex of vertices) {
                const rotatedX = vertex.x * cos - vertex.y * sin;
                const rotatedY = vertex.x * sin + vertex.y * cos;
                
                positions.push(ant.x + rotatedX, ant.y + rotatedY);
            }

            // Color based on ant state
            if (ant.hasFood) {
                // Red for ants carrying food
                colors.push(1.0, 0.3, 0.3, 1.0, 1.0, 0.3, 0.3, 1.0, 1.0, 0.3, 0.3, 1.0);
            } else {
                // Blue for exploring ants
                colors.push(0.3, 0.6, 1.0, 1.0, 0.3, 0.6, 1.0, 1.0, 0.3, 0.6, 1.0, 1.0);
            }
        }
        
        this.drawTriangles(positions, colors);
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
        this.updateAnts();
        this.updatePheromones();
        
        // Render
        this.render();

        // Continue animation
        requestAnimationFrame((time) => this.animate(time));
    }

    setupEventListeners() {
        // Parameter controls
        document.getElementById('antCount').addEventListener('input', (e) => {
            this.params.antCount = parseInt(e.target.value);
            this.adjustAntCount();
            this.updateUI();
        });

        document.getElementById('antSpeed').addEventListener('input', (e) => {
            this.params.antSpeed = parseFloat(e.target.value);
            this.updateUI();
        });

        document.getElementById('pheromoneStrength').addEventListener('input', (e) => {
            this.params.pheromoneStrength = parseFloat(e.target.value);
            this.updateUI();
        });

        document.getElementById('evaporationRate').addEventListener('input', (e) => {
            this.params.evaporationRate = parseFloat(e.target.value);
            this.updateUI();
        });

        document.getElementById('trailOpacity').addEventListener('input', (e) => {
            this.params.trailOpacity = parseFloat(e.target.value);
            this.updateUI();
        });

        document.getElementById('explorationRate').addEventListener('input', (e) => {
            this.params.explorationRate = parseFloat(e.target.value);
            this.updateUI();
        });

        document.getElementById('pheromoneSensitivity').addEventListener('input', (e) => {
            this.params.pheromoneSensitivity = parseFloat(e.target.value);
            this.updateUI();
        });

        document.getElementById('searchRadius').addEventListener('input', (e) => {
            this.params.searchRadius = parseInt(e.target.value);
            this.updateUI();
        });

        document.getElementById('showPheromones').addEventListener('change', (e) => {
            this.params.showPheromones = e.target.checked;
        });

        document.getElementById('showAnts').addEventListener('change', (e) => {
            this.params.showAnts = e.target.checked;
        });

        // Food management
        document.getElementById('addFoodBtn').addEventListener('click', () => {
            this.addingFood = true;
            this.updateModeIndicator();
        });

        document.getElementById('clearFoodBtn').addEventListener('click', () => {
            this.foodSources = [];
        });

        // Control buttons
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetColony();
        });

        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            document.getElementById('pauseBtn').textContent = this.isPaused ? 'Resume' : 'Pause';
        });
    }

    adjustAntCount() {
        const currentCount = this.ants.length;
        const targetCount = this.params.antCount;

        if (targetCount > currentCount) {
            // Add ants
            for (let i = currentCount; i < targetCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 30;
                
                this.ants.push({
                    x: this.nest.x + Math.cos(angle) * distance,
                    y: this.nest.y + Math.sin(angle) * distance,
                    angle: Math.random() * Math.PI * 2,
                    hasFood: false,
                    targetFood: null,
                    lastPheromoneTime: 0
                });
            }
        } else if (targetCount < currentCount) {
            // Remove ants
            this.ants = this.ants.slice(0, targetCount);
        }
    }

    resetColony() {
        this.setupPheromoneGrid();
        this.createAnts();
        this.stats.foodCollected = 0;
        this.addInitialFood();
    }

    updateModeIndicator() {
        const indicator = document.getElementById('modeIndicator');
        if (this.addingFood) {
            indicator.textContent = 'Add Food';
            indicator.className = 'text-green-400';
        }
    }

    updateUI() {
        document.getElementById('antCountValue').textContent = this.params.antCount;
        document.getElementById('antSpeedValue').textContent = this.params.antSpeed.toFixed(1);
        document.getElementById('pheromoneStrengthValue').textContent = this.params.pheromoneStrength.toFixed(1);
        document.getElementById('evaporationRateValue').textContent = this.params.evaporationRate.toFixed(3);
        document.getElementById('trailOpacityValue').textContent = this.params.trailOpacity.toFixed(1);
        document.getElementById('explorationRateValue').textContent = this.params.explorationRate.toFixed(2);
        document.getElementById('pheromoneSensitivityValue').textContent = this.params.pheromoneSensitivity.toFixed(1);
        document.getElementById('searchRadiusValue').textContent = this.params.searchRadius;

        // Update statistics
        document.getElementById('foodCollected').textContent = this.stats.foodCollected;
        document.getElementById('activeTrails').textContent = this.stats.activeTrails;
        document.getElementById('exploringAnts').textContent = this.stats.exploringAnts;
        document.getElementById('returningAnts').textContent = this.stats.returningAnts;
    }

    updatePerformanceDisplay() {
        document.getElementById('fpsCounter').textContent = this.fps;
        document.getElementById('antCounter').textContent = this.ants.length;
        document.getElementById('foodCounter').textContent = this.foodSources.length;
        this.updateUI();
    }
}

// Initialize simulation when page loads
document.addEventListener('DOMContentLoaded', () => {
    new AntColonySimulation();
});
