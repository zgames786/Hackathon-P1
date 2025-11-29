// Photo and quote rotation for login page
const photos = [
    'images/photo1.jpg', // Awards photo
    'images/photo2.jpg', // School entrance
    'images/photo3.jpg', // Science lab
    'images/photo4.jpg', // Karate class
    'images/photo5.jpg'  // Art class
];

const quotes = [
    'An investment in knowledge pays the best interest.',
    'Education is the most powerful weapon which you can use to change the world.',
    'The roots of education are bitter, but the fruit is sweet.',
    'A focused mind grows stronger through steady discipline.',
    'Knowledge will bring you the opportunity to make a difference.'
];

let currentIndex = 0;

function updateRotator(index) {
    const photoElement = document.getElementById('rotatingPhoto');
    const quoteElement = document.getElementById('rotatingQuote');
    const dots = document.querySelectorAll('.dot');
    
    if (photoElement && quoteElement) {
        const targetIndex = index !== undefined ? index : currentIndex;
        
        // Update photo
        photoElement.style.opacity = '0';
        setTimeout(() => {
            photoElement.src = photos[targetIndex];
            photoElement.alt = ['Awards photo', 'School entrance', 'Science lab', 'Karate class', 'Art class'][targetIndex];
            photoElement.style.opacity = '1';
        }, 250);
        
        // Update quote
        quoteElement.style.opacity = '0';
        setTimeout(() => {
            quoteElement.textContent = quotes[targetIndex];
            quoteElement.style.opacity = '1';
        }, 250);
        
        // Update dots
        dots.forEach((dot, dotIndex) => {
            if (dotIndex === targetIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }
}

function rotateToNext() {
    currentIndex = (currentIndex + 1) % photos.length;
    updateRotator();
}

// Initialize rotation when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Set initial state
    updateRotator(0);
    
    // Rotate every 5 seconds
    setInterval(rotateToNext, 5000);
    
    // Add click handlers to dots
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        dot.addEventListener('click', function() {
            currentIndex = index;
            updateRotator(index);
        });
    });
});

