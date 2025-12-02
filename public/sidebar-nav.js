// ======= SIDEBAR NAVIGATION HELPER =======
// Prevents navigating to the same page and handles sidebar links intelligently

function navigateTo(page) {
    // Get current page name
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // Don't navigate if already on that page
    if (currentPage === page) {
        console.log('Already on', page, '- not navigating');
        return;
    }
    
    // Navigate to the page
    window.location.href = page;
}

// Make it globally available
window.navigateTo = navigateTo;

