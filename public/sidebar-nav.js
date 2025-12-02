// ======= SIDEBAR NAVIGATION HELPER =======
// Prevents navigating to the same page and handles sidebar links intelligently

function navigateTo(page, tab = null) {
    // Get current page name
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    // If navigating to admin.html with a tab, use query parameter
    if (page === 'admin.html' && tab) {
        const currentTab = new URLSearchParams(window.location.search).get('tab');
        if (currentPage === 'admin.html' && currentTab === tab) {
            console.log('Already on', page, 'tab', tab, '- not navigating');
            return;
        }
        window.location.href = `admin.html?tab=${tab}`;
        return;
    }
    
    // Don't navigate if already on that page
    if (currentPage === page) {
        console.log('Already on', page, '- not navigating');
        return;
    }
    
    // Navigate to the page
    window.location.href = page;
}

// Navigate to admin tab (used for tabs within admin.html)
function navigateToAdminTab(tabName) {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const currentTab = new URLSearchParams(window.location.search).get('tab');
    
    if (currentPage === 'admin.html') {
        // Already on admin.html
        if (currentTab === tabName) {
            // Already on this tab, don't do anything
            console.log('Already on tab', tabName);
            return;
        }
        // Switch tabs using the showAdminTab function
        if (typeof window.showAdminTab === 'function') {
            // Update URL without reload
            window.history.pushState({}, '', `admin.html?tab=${tabName}`);
            window.showAdminTab(tabName);
        } else {
            // Fallback: reload with parameter
            window.location.href = `admin.html?tab=${tabName}`;
        }
    } else {
        // Navigate to admin.html with tab parameter
        window.location.href = `admin.html?tab=${tabName}`;
    }
}

// Make it globally available
window.navigateTo = navigateTo;
window.navigateToAdminTab = navigateToAdminTab;

