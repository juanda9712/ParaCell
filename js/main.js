// js/main.js
document.addEventListener('DOMContentLoaded', () => {
    // --- LÓGICA DEL MENÚ MÓVIL ---
    const btnMobileMenu = document.getElementById('btn-mobile-menu');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileLinks = document.querySelectorAll('.mobile-link');
    const iconoMenu = btnMobileMenu.querySelector('i');

    // Abrir/Cerrar menú al tocar el botón
    if (btnMobileMenu && mobileMenu) {
        btnMobileMenu.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            
            // Cambiar el ícono de hamburguesa a una "X" y viceversa
            if (mobileMenu.classList.contains('hidden')) {
                iconoMenu.classList.remove('fa-xmark');
                iconoMenu.classList.add('fa-bars');
            } else {
                iconoMenu.classList.remove('fa-bars');
                iconoMenu.classList.add('fa-xmark');
            }
        });

        // Cerrar el menú automáticamente al tocar cualquier enlace
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                iconoMenu.classList.remove('fa-xmark');
                iconoMenu.classList.add('fa-bars');
            });
        });
    }
});