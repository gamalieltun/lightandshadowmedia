// Mobile Menu Toggle - Simple and Direct
function toggleMenu() {
    const navMenu = document.querySelector('nav ul');
    const menuToggle = document.querySelector('.menu-toggle');
    
    navMenu.classList.toggle('active');
    menuToggle.classList.toggle('active');
}

// Close menu when clicking a link
window.addEventListener('load', function() {
    const navLinks = document.querySelectorAll('nav ul li a');
    
    navLinks.forEach(function(link) {
        link.addEventListener('click', function() {
            const navMenu = document.querySelector('nav ul');
            const menuToggle = document.querySelector('.menu-toggle');
            
            navMenu.classList.remove('active');
            menuToggle.classList.remove('active');
        });
    });
});