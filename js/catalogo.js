// 1. REEMPLAZA CON TUS CLAVES DE SUPABASE
const SUPABASE_URL = 'https://uemhlhvrflmvlnsyhjmr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlbWhsaHZyZmxtdmxuc3loam1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMTUzMjMsImV4cCI6MjEwNzY5MTMyM30.72NWi0JDTjwi2OmB2ARz6fkPhEFZtW6TnNokYjfJ1jc';

// CAMBIO AQUÍ: Usamos supabaseClient
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables globales
let imagenesGaleria = [];
let indiceImagenActual = 0;
let todosLosProductos = []; // Aquí guardaremos el inventario para filtrar rápido

document.addEventListener('DOMContentLoaded', async () => {
    const contenedorProductos = document.getElementById('catalogo-productos');

    // Cargar productos desde Supabase
    const { data: productos, error } = await supabaseClient
        .from('productos')
        .select('*')
        .order('fecha_creacion', { ascending: false });

    if (error) {
        contenedorProductos.innerHTML = '<p class="text-red-500 text-center col-span-full">Hubo un error al cargar los productos.</p>';
        return;
    }

    if (productos.length === 0) {
        contenedorProductos.innerHTML = '<p class="text-gray-500 text-center col-span-full">Aún no hay productos disponibles en la tienda.</p>';
        return;
    }

    // Guardar en la variable global y dibujar todos por defecto
    todosLosProductos = productos;
    renderizarProductos(todosLosProductos);

    // --- LÓGICA DE FILTROS DE CATEGORÍA ---
    const botonesFiltro = document.querySelectorAll('.btn-filtro');
    
    botonesFiltro.forEach(boton => {
        boton.addEventListener('click', () => {
            // 1. Reiniciar los colores de todos los botones a gris (o rojo claro para ofertas)
            botonesFiltro.forEach(b => {
                b.className = b.dataset.categoria === 'Ofertas' 
                    ? 'btn-filtro whitespace-nowrap px-5 py-2.5 rounded-full bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 text-sm font-medium transition-colors'
                    : 'btn-filtro whitespace-nowrap px-5 py-2.5 rounded-full bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100 text-sm font-medium transition-colors';
            });
            
            // 2. Pintar el botón seleccionado (Azul, o Rojo fuerte si es ofertas)
            if(boton.dataset.categoria === 'Ofertas') {
                boton.className = 'btn-filtro whitespace-nowrap px-5 py-2.5 rounded-full bg-red-600 text-white text-sm font-medium transition-colors shadow-sm';
            } else {
                boton.className = 'btn-filtro whitespace-nowrap px-5 py-2.5 rounded-full bg-brand-900 text-white text-sm font-medium transition-colors shadow-sm';
            }

            // 3. Filtrar los productos
            const categoria = boton.dataset.categoria;
            if (categoria === 'Todos') {
                renderizarProductos(todosLosProductos);
            } else if (categoria === 'Ofertas') {
                // Filtramos los que tengan un precio_oferta mayor a 0
                const ofertas = todosLosProductos.filter(p => p.precio_oferta && p.precio_oferta > 0);
                renderizarProductos(ofertas);
            } else {
                // Filtramos por texto exacto de categoría
                const filtrados = todosLosProductos.filter(p => p.categoria === categoria);
                renderizarProductos(filtrados);
            }
        });
    });

    // --- LÓGICA DE BÚSQUEDA Y ORDENAMIENTO ---
    const inputBuscador = document.getElementById('input-buscador');
    const selectOrden = document.getElementById('sort');

    // Función unificada para filtrar y ordenar
    function aplicarFiltrosYOrden() {
        let resultados = [...todosLosProductos]; // Hacemos una copia de todos los productos

        // 1. Aplicar filtro de búsqueda si hay texto
        if (inputBuscador && inputBuscador.value.trim() !== '') {
            const termino = inputBuscador.value.toLowerCase();
            resultados = resultados.filter(p => 
                p.nombre.toLowerCase().includes(termino) || 
                p.marca.toLowerCase().includes(termino)
            );
        }

        // 2. Aplicar ordenamiento
        const orden = selectOrden ? selectOrden.value : 'destacados';
        
        if (orden === 'precio-menor') {
            resultados.sort((a, b) => {
                const precioA = a.precio_oferta || a.precio;
                const precioB = b.precio_oferta || b.precio;
                return precioA - precioB;
            });
        } else if (orden === 'precio-mayor') {
            resultados.sort((a, b) => {
                const precioA = a.precio_oferta || a.precio;
                const precioB = b.precio_oferta || b.precio;
                return precioB - precioA;
            });
        } else if (orden === 'a-z') {
            resultados.sort((a, b) => a.nombre.localeCompare(b.nombre));
        }

        // 3. Dibujar en pantalla
        renderizarProductos(resultados);
    }

    // Escuchar cuando el cliente escribe en el buscador
    if (inputBuscador) {
        inputBuscador.addEventListener('input', aplicarFiltrosYOrden);
    }

    // Escuchar cuando el cliente cambia el orden
    if (selectOrden) {
        selectOrden.addEventListener('change', aplicarFiltrosYOrden);
    }

    // --- LÓGICA DEL MODAL DE GALERÍA (Se mantiene igual) ---
    document.getElementById('btn-cerrar-galeria').addEventListener('click', () => {
        document.getElementById('modal-galeria').classList.add('hidden');
    });

    document.getElementById('btn-next-img').addEventListener('click', () => {
        indiceImagenActual = (indiceImagenActual + 1) % imagenesGaleria.length;
        actualizarVistaGaleria();
    });

    document.getElementById('btn-prev-img').addEventListener('click', () => {
        indiceImagenActual = (indiceImagenActual - 1 + imagenesGaleria.length) % imagenesGaleria.length;
        actualizarVistaGaleria();
    });

    const zoomContainer = document.getElementById('zoom-container');
    const imgGaleria = document.getElementById('img-galeria-actual');

    zoomContainer.addEventListener('mousemove', (e) => {
        const rect = zoomContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const xPercent = (x / rect.width) * 100;
        const yPercent = (y / rect.height) * 100;
        imgGaleria.style.transformOrigin = `${xPercent}% ${yPercent}%`;
        imgGaleria.style.transform = 'scale(2.5)';
    });

    zoomContainer.addEventListener('mouseleave', () => {
        imgGaleria.style.transformOrigin = 'center center';
        imgGaleria.style.transform = 'scale(1)';
    });
});

// FUNCIÓN PARA DIBUJAR LOS PRODUCTOS EN PANTALLA
function renderizarProductos(lista) {
    const contenedorProductos = document.getElementById('catalogo-productos');
    contenedorProductos.innerHTML = ''; // Limpiamos la grilla

    if (lista.length === 0) {
        contenedorProductos.innerHTML = '<p class="text-gray-500 text-center col-span-full py-8">No se encontraron productos en esta categoría.</p>';
        return;
    }

    lista.forEach(prod => {
        const precioNormal = new Intl.NumberFormat('es-PY').format(prod.precio);
        let htmlPrecio = '';

        // Lógica visual: Si tiene oferta, tachamos el precio original
        if (prod.precio_oferta && prod.precio_oferta > 0) {
            const precioOferta = new Intl.NumberFormat('es-PY').format(prod.precio_oferta);
            htmlPrecio = `
                <div class="flex flex-col">
                    <span class="text-xs text-gray-400 line-through">Gs. ${precioNormal}</span>
                    <span class="text-xl font-extrabold text-red-600">Gs. ${precioOferta}</span>
                </div>
            `;
        } else {
            htmlPrecio = `<span class="text-xl font-extrabold text-gray-900">Gs. ${precioNormal}</span>`;
        }
        
        const todasLasImagenes = prod.imagen_url ? prod.imagen_url : 'https://via.placeholder.com/300?text=Sin+Foto';
        let primeraImagen = todasLasImagenes.split(',')[0];

        const tarjetaHtml = `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all group">
                <div class="relative aspect-square overflow-hidden bg-gray-50 flex items-center justify-center p-4 cursor-pointer" onclick="abrirGaleria('${todasLasImagenes}')" title="Haz clic para ver la galería">
                    <img src="${primeraImagen}" alt="${prod.nombre}" class="object-contain w-full h-full group-hover:scale-105 transition-transform duration-300">
                    ${prod.precio_oferta ? '<span class="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md">¡OFERTA!</span>' : ''}
                </div>
                <div class="p-5">
                    <span class="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-1 rounded-md mb-2 inline-block">${prod.categoria}</span>
                    <h3 class="text-lg font-bold text-gray-900 mb-1 leading-tight truncate" title="${prod.nombre}">${prod.nombre}</h3>
                    <p class="text-sm text-gray-400 mb-4">${prod.marca}</p>
                    <div class="flex items-center justify-between">
                        ${htmlPrecio}
                        <a href="https://wa.me/595971571356?text=Hola,%20me%20interesa%20el%20${encodeURIComponent(prod.nombre)}" target="_blank" class="w-10 h-10 rounded-full bg-gray-50 text-gray-900 hover:bg-green-500 hover:text-white flex items-center justify-center transition-colors shadow-sm shrink-0 ml-2">
                            <i class="fa-brands fa-whatsapp text-lg"></i>
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        contenedorProductos.innerHTML += tarjetaHtml;
    });
}

// FUNCIONES DE GALERÍA
window.abrirGaleria = function(urlsString) {
    imagenesGaleria = urlsString.split(',');
    indiceImagenActual = 0; 
    actualizarVistaGaleria();
    document.getElementById('modal-galeria').classList.remove('hidden');
}

function actualizarVistaGaleria() {
    const imgGaleria = document.getElementById('img-galeria-actual');
    const btnNext = document.getElementById('btn-next-img');
    const btnPrev = document.getElementById('btn-prev-img');
    const contenedorMiniaturas = document.getElementById('miniaturas-galeria');

    imgGaleria.src = imagenesGaleria[indiceImagenActual];
    imgGaleria.style.transform = 'scale(1)';
    contenedorMiniaturas.innerHTML = '';
    
    if (imagenesGaleria.length > 1) {
        btnNext.classList.remove('hidden');
        btnPrev.classList.remove('hidden');

        imagenesGaleria.forEach((url, index) => {
            const miniatura = document.createElement('img');
            miniatura.src = url;
            const clasesActiva = index === indiceImagenActual 
                ? 'border-2 border-brand-500 opacity-100 scale-110' 
                : 'border-2 border-transparent opacity-50 hover:opacity-100';
            miniatura.className = `w-16 h-16 object-cover rounded-md cursor-pointer transition-all duration-200 ${clasesActiva}`;
            miniatura.onclick = () => {
                indiceImagenActual = index;
                actualizarVistaGaleria();
            };
            contenedorMiniaturas.appendChild(miniatura);
        });
    } else {
        btnNext.classList.add('hidden');
        btnPrev.classList.add('hidden');
    }
}