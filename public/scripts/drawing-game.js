document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    const colorPalette = document.getElementById('colorPalette');
    const brushButtons = document.querySelectorAll('.brush-button');
    const stampButtons = document.querySelectorAll('.stamp-button');
    const clearButton = document.getElementById('clearButton');
    const saveButton = document.getElementById('saveButton');
    const galleryButton = document.getElementById('galleryButton');
    const galleryModal = document.getElementById('galleryModal');
    const galleryContainer = document.getElementById('galleryContainer');
    const closeGalleryButton = document.getElementById('closeGalleryButton');
    const newChallengeButton = document.getElementById('newChallengeButton');
    const challengeText = document.getElementById('challengeText');
    
    // Drawing state variables
    let isDrawing = false;
    let currentColor = '#000000';
    let brushSize = 10;
    let lastX = 0;
    let lastY = 0;
    let stampMode = false;
    let currentStamp = '';
    
    // Local storage key
    const localStorageKey = 'kidsDrawingGallery';
    
    // Drawing challenges
    const challenges = [
        "Can you draw a happy face?",
        "Draw your favorite animal!",
        "Draw a beautiful tree!",
        "Draw your family!",
        "Draw a sunny day!",
        "Draw a colorful rainbow!",
        "Draw a funny monster!",
        "Draw your favorite toy!",
        "Draw a space rocket!",
        "Draw a house with a garden!",
        "Draw a butterfly!",
        "Draw a castle with a princess or prince!",
        "Draw a dinosaur!",
        "Draw a magical unicorn!",
        "Draw your favorite food!",
        "Draw yourself doing your favorite activity!"
    ];
    
    // Set up the canvas
    function setupCanvas() {
        // Make canvas responsive to container size
        const container = canvas.parentElement;
        canvas.width = container.clientWidth - 20;  // Subtract some padding
        canvas.height = container.clientWidth * 0.6; // Aspect ratio
        
        // Set up initial canvas background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Draw a line from previous point to current point
    function drawLine(x1, y1, x2, y2) {
        ctx.beginPath();
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
    
    // Add a stamp to the canvas
    function addStamp(x, y, stamp) {
        ctx.font = `${brushSize * 3}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(stamp, x, y);
    }
    
    // Clear the canvas
    function clearCanvas() {
        if (confirm('Are you sure you want to clear your drawing?')) {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }
    
    // Save the canvas to gallery
    function saveDrawing() {
        // Convert canvas to data URL
        const dataURL = canvas.toDataURL('image/png');
        
        // Get existing gallery or create new one
        let gallery = JSON.parse(localStorage.getItem(localStorageKey)) || [];
        
        // Add new drawing with timestamp
        gallery.push({
            dataURL: dataURL,
            timestamp: new Date().toISOString(),
            challenge: challengeText.textContent
        });
        
        // Save back to localStorage
        localStorage.setItem(localStorageKey, JSON.stringify(gallery));
        
        // Show confirmation
        alert('Your masterpiece has been saved!');
        
        // Update gallery
        updateGallery();
    }
    
    // Update the gallery display
    function updateGallery() {
        // Clear existing gallery
        galleryContainer.innerHTML = '';
        
        // Get gallery items
        const gallery = JSON.parse(localStorage.getItem(localStorageKey)) || [];
        
        if (gallery.length === 0) {
            galleryContainer.innerHTML = '<p class="text-gray-500 text-center col-span-full">No drawings saved yet. Create some art!</p>';
            return;
        }
        
        // Add each drawing to the gallery
        gallery.forEach((item, index) => {
            const drawing = document.createElement('div');
            drawing.classList.add('drawing-item', 'border', 'border-gray-300', 'rounded', 'p-2');
            
            // Create thumbnail
            const img = document.createElement('img');
            img.src = item.dataURL;
            img.alt = `Drawing ${index + 1}`;
            img.classList.add('w-full', 'h-auto', 'mb-2');
            
            // Create delete button
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.classList.add('bg-red-500', 'text-white', 'text-xs', 'px-2', 'py-1', 'rounded');
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteDrawing(index);
            });
            
            // Add elements to drawing container
            drawing.appendChild(img);
            drawing.appendChild(deleteButton);
            
            // Add click handler to view full size
            img.addEventListener('click', () => {
                const fullImg = new Image();
                fullImg.src = item.dataURL;
                
                // Open in new window/tab
                const win = window.open("", "_blank");
                win.document.write(fullImg.outerHTML);
            });
            
            galleryContainer.appendChild(drawing);
        });
    }
    
    // Delete a drawing from gallery
    function deleteDrawing(index) {
        if (confirm('Delete this drawing?')) {
            let gallery = JSON.parse(localStorage.getItem(localStorageKey)) || [];
            gallery.splice(index, 1);
            localStorage.setItem(localStorageKey, JSON.stringify(gallery));
            updateGallery();
        }
    }
    
    // Get a new random drawing challenge
    function getNewChallenge() {
        const randomIndex = Math.floor(Math.random() * challenges.length);
        challengeText.textContent = challenges[randomIndex];
        
        // Add a little animation effect
        challengeText.classList.add('challenge-animation');
        setTimeout(() => {
            challengeText.classList.remove('challenge-animation');
        }, 500);
    }
    
    // EVENT LISTENERS
    
    // Canvas mouse events
    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        [lastX, lastY] = [e.offsetX, e.offsetY];
        
        // If in stamp mode, add stamp and return
        if (stampMode) {
            addStamp(e.offsetX, e.offsetY, currentStamp);
            return;
        }
        
        // Otherwise start a new path for drawing
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(e.offsetX, e.offsetY);
        ctx.stroke();
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing || stampMode) return;
        drawLine(lastX, lastY, e.offsetX, e.offsetY);
        [lastX, lastY] = [e.offsetX, e.offsetY];
    });
    
    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mouseout', () => isDrawing = false);
    
    // Touch events for mobile
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        [lastX, lastY] = [touch.clientX - rect.left, touch.clientY - rect.top];
        
        if (stampMode) {
            addStamp(lastX, lastY, currentStamp);
            return;
        }
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!isDrawing || stampMode) return;
        
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        drawLine(lastX, lastY, x, y);
        [lastX, lastY] = [x, y];
    });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        isDrawing = false;
    });
    
    // Color palette events
    colorPalette.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-button')) {
            // Remove active class from all colors
            document.querySelectorAll('.color-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to selected color
            e.target.classList.add('active');
            
            // Set current color
            currentColor = e.target.dataset.color;
            
            // Exit stamp mode when color is selected
            stampMode = false;
        }
    });
    
    // Brush size events
    brushButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all brush buttons
            brushButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to selected button
            button.classList.add('active');
            
            // Set brush size
            brushSize = parseInt(button.dataset.size);
            
            // Exit stamp mode when brush size is changed
            stampMode = false;
        });
    });
    
    // Stamp events
    stampButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all stamp buttons
            stampButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to selected stamp
            button.classList.add('active');
            
            // Enter stamp mode and set current stamp
            stampMode = true;
            currentStamp = button.dataset.stamp;
        });
    });
    
    // Clear button
    clearButton.addEventListener('click', clearCanvas);
    
    // Save button
    saveButton.addEventListener('click', saveDrawing);
    
    // Gallery button
    galleryButton.addEventListener('click', () => {
        updateGallery();
        galleryModal.classList.remove('hidden');
    });
    
    // Close gallery button
    closeGalleryButton.addEventListener('click', () => {
        galleryModal.classList.add('hidden');
    });
    
    // New challenge button
    newChallengeButton.addEventListener('click', getNewChallenge);
    
    // Window resize
    window.addEventListener('resize', setupCanvas);
    
    // Initialize
    setupCanvas();
    getNewChallenge();
    
    // Set default active buttons
    document.querySelector('.color-button[data-color="#000000"]').classList.add('active');
    document.querySelector('.brush-button[data-size="10"]').classList.add('active');
});
