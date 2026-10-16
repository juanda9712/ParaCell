// 1. REEMPLAZA ESTAS DOS LÍNEAS CON TUS CLAVES DE SUPABASE
const SUPABASE_URL = 'https://uemhlhvrflmvlnsyhjmr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlbWhsaHZyZmxtdmxuc3loam1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMTUzMjMsImV4cCI6MjEwNzY5MTMyM30.72NWi0JDTjwi2OmB2ARz6fkPhEFZtW6TnNokYjfJ1jc';

// CAMBIO: Nombramos la variable como "supabaseClient" para evitar el conflicto
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables para la edición
let idProductoEditando = null;
let imagenesPrevias = ''; // Guardará las fotos viejas si decides no subir nuevas al editar
let listaProductosAdmin = []; // Para buscar rápidamente el producto a editar

document.addEventListener('DOMContentLoaded', async () => {
    const loginSection = document.getElementById('login-section');
    const adminPanel = document.getElementById('admin-panel');
    const loginForm = document.getElementById('login-form');
    const btnLogout = document.getElementById('btn-logout');

    // 2. VERIFICAR SI YA INICIASTE SESIÓN ANTES
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        mostrarPanel();
    } else {
        loginSection.classList.remove('hidden');
    }

    // 3. LÓGICA DE INICIO DE SESIÓN
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Cambiar texto del botón
        const btnSubmit = loginForm.querySelector('button');
        const originalText = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verificando...';
        btnSubmit.disabled = true;

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        // Intentar loguear con Supabase
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            alert('Acceso denegado: Correo o contraseña incorrectos.');
            btnSubmit.innerHTML = originalText;
            btnSubmit.disabled = false;
        } else {
            mostrarPanel();
        }
    });

    // 4. LÓGICA PARA CERRAR SESIÓN
    btnLogout.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.reload(); // Recarga la página para volver al login
    });

    // Función para ocultar el login y mostrar el panel de control
    function mostrarPanel() {
        loginSection.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        // Usamos flex para mantener el diseño del panel
        adminPanel.classList.add('flex'); 
        
        // Cargar los datos automáticamente
        cargarProductos();
    }

    // 5. FUNCIÓN PARA LEER LOS PRODUCTOS DE LA BASE DE DATOS
    async function cargarProductos() {
        const tbody = document.getElementById('tabla-productos');
        
        // Consulta a Supabase usando supabaseClient
        const { data: productos, error } = await supabaseClient
            .from('productos')
            .select('*')
            .order('fecha_creacion', { ascending: false });

        if (error) {
            console.error('Error al cargar productos:', error);
            tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-4 text-center text-red-500">Error al cargar datos de la nube.</td></tr>';
            return;
        }

        // Si la tabla está vacía
        if (productos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500">No hay productos cargados todavía.</td></tr>';
            return;
        }

        // Si hay productos, los dibujamos en la tabla
        tbody.innerHTML = ''; // Limpiar el mensaje de "Cargando..."

        listaProductosAdmin = productos; // Guardamos la lista completa en memoria
        
        productos.forEach(prod => {
            const tr = document.createElement('tr');
            
            // Formateamos el precio para Paraguay (Gs.)
            const precioFormateado = new Intl.NumberFormat('es-PY').format(prod.precio);
            
            // Extraer la primera imagen (separando por comas si hay varias)
            let primeraImagen = '';
            if (prod.imagen_url) {
                // El split(',') separa el texto en una lista, y el [0] agarra el primer link
                primeraImagen = prod.imagen_url.split(',')[0]; 
            } else {
                // Si por algún motivo no tiene foto, ponemos un cuadro gris
                primeraImagen = 'https://via.placeholder.com/150?text=Sin+Foto';
            }
            
            tr.innerHTML = `
                <td class="px-6 py-4 flex items-center gap-3">
                    <img src="${primeraImagen}" alt="${prod.nombre}" class="w-12 h-12 rounded-lg object-cover border border-gray-100 shadow-sm">
                    <div>
                        <div class="font-bold text-gray-900">${prod.nombre}</div>
                        <div class="text-xs text-gray-400">${prod.marca}</div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <span class="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-md font-medium">${prod.categoria}</span>
                </td>
                <td class="px-6 py-4 font-bold text-brand-600">Gs. ${precioFormateado}</td>
                <td class="px-6 py-4 text-right">
                    <!-- Botones con onclick para Editar y Eliminar -->
                    <button onclick="abrirModalEdicion('${prod.id}')" class="text-gray-400 hover:text-brand-600 mr-3 transition-colors" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="eliminarProducto('${prod.id}')" class="text-gray-400 hover:text-red-600 transition-colors" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // --- LÓGICA DEL MODAL DE PRODUCTOS ---
    
    // Variables del Modal
    const btnAbrirModal = document.getElementById('btn-abrir-modal');
    const modalProducto = document.getElementById('modal-producto');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');
    const btnCancelar = document.getElementById('btn-cancelar');
    const formProducto = document.getElementById('form-producto');
    
    // Variables para las múltiples fotos
    const inputProdImagen = document.getElementById('prod-imagen');
    const previewProdFotos = document.getElementById('preview-prod-fotos');
    let archivosProducto = []; // Aquí guardaremos las fotos válidas

    // 1. LÓGICA DE PREVISUALIZACIÓN Y FILTRADO (Igual que en form.js)
    inputProdImagen.addEventListener('change', function() {
        const archivosNuevos = Array.from(this.files);

        archivosNuevos.forEach(archivo => {
            const yaExiste = archivosProducto.some(f => f.name === archivo.name && f.size === archivo.size);
            // Máximo 3 fotos
            if (!yaExiste && archivosProducto.length < 3) {
                archivosProducto.push(archivo);
            }
        });

        actualizarMiniaturasAdmin();
        this.value = ''; // Resetear el input
    });

    function actualizarMiniaturasAdmin() {
        previewProdFotos.innerHTML = ''; 

        if (archivosProducto.length > 0) {
            previewProdFotos.classList.remove('hidden');
            
            archivosProducto.forEach((archivo, index) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const divWrapper = document.createElement('div');
                    divWrapper.className = 'relative inline-block mt-2';

                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'w-16 h-16 object-cover rounded-lg border border-gray-200 shadow-sm';
                    
                    const btnEliminar = document.createElement('button');
                    btnEliminar.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                    btnEliminar.className = 'absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-red-600 transition-colors shadow-md cursor-pointer z-10';
                    btnEliminar.type = 'button';

                    btnEliminar.addEventListener('click', () => {
                        archivosProducto.splice(index, 1); 
                        actualizarMiniaturasAdmin(); 
                    });

                    divWrapper.appendChild(img);
                    divWrapper.appendChild(btnEliminar);
                    previewProdFotos.appendChild(divWrapper);
                }
                reader.readAsDataURL(archivo);
            });
        } else {
            previewProdFotos.classList.add('hidden');
        }
    }

    // Abrir modal
    btnAbrirModal.addEventListener('click', () => {
        document.querySelector('#modal-producto h3').innerText = 'Agregar Nuevo Producto';
        idProductoEditando = null; // Reiniciamos el estado
        imagenesPrevias = '';
        modalProducto.classList.remove('hidden');
    });

    // Cerrar modal y limpiar
    const cerrarModal = () => {
        modalProducto.classList.add('hidden');
        formProducto.reset(); 
        archivosProducto = []; // Limpiar las fotos de la memoria
        actualizarMiniaturasAdmin(); // Borrar visualmente las fotos
    };
    
    btnCerrarModal.addEventListener('click', cerrarModal);
    btnCancelar.addEventListener('click', cerrarModal);

    // Guardar Producto
    formProducto.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validar que haya al menos una foto
        if (archivosProducto.length === 0) {
            alert('Por favor, selecciona al menos una foto para el producto.');
            return;
        }

        const btnGuardar = document.getElementById('btn-guardar-prod');
        const textoOriginal = btnGuardar.innerHTML;
        btnGuardar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
        btnGuardar.disabled = true;

        try {
            const nombre = document.getElementById('prod-nombre').value;
            const marca = document.getElementById('prod-marca').value;
            const categoria = document.getElementById('prod-categoria').value;
            const precio = parseFloat(document.getElementById('prod-precio').value);
            const precioOferta = document.getElementById('prod-oferta').value ? parseFloat(document.getElementById('prod-oferta').value) : null;

            let urlsImagenes = [];

            // 2. Subir TODAS las imágenes a Cloudinary
            // REEMPLAZA CON TU CLOUD NAME DE CLOUDINARY
            const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dtjub2iks/image/upload';
            const UPLOAD_PRESET = 'paracell_fotos'; 

            for (let i = 0; i < archivosProducto.length; i++) {
                const formData = new FormData();
                formData.append('file', archivosProducto[i]);
                formData.append('upload_preset', UPLOAD_PRESET);

                const respuestaCloudinary = await fetch(CLOUDINARY_URL, {
                    method: 'POST',
                    body: formData
                });
                const dataCloudinary = await respuestaCloudinary.json();
                
                if (dataCloudinary.secure_url) {
                    urlsImagenes.push(dataCloudinary.secure_url);
                }
            }

            // Unimos los links nuevos. Si no subiste fotos nuevas, dejamos las que ya tenía.
            const imagenUrlFinal = urlsImagenes.length > 0 ? urlsImagenes.join(',') : imagenesPrevias;

            // 3. Guardar o Actualizar en Supabase
            if (idProductoEditando) {
                // MODO EDICIÓN
                const { error } = await supabaseClient
                    .from('productos')
                    .update({ 
                        nombre: nombre, 
                        marca: marca, 
                        categoria: categoria, 
                        precio: precio, 
                        precio_oferta: precioOferta,
                        imagen_url: imagenUrlFinal 
                    })
                    .eq('id', idProductoEditando);
                
                if (error) throw error;
                alert('¡Producto actualizado exitosamente!');
            } else {
                // MODO CREACIÓN
                const { error } = await supabaseClient
                    .from('productos')
                    .insert([{ 
                        nombre: nombre, 
                        marca: marca, 
                        categoria: categoria, 
                        precio: precio, 
                        precio_oferta: precioOferta,
                        imagen_url: imagenUrlFinal 
                    }]);
                
                if (error) throw error;
                alert('¡Producto guardado exitosamente!');
            }

            cerrarModal();
            cargarProductos(); 

        } catch (error) {
            console.error('Error al guardar el producto:', error);
            alert('Hubo un error al guardar. Revisa la consola.');
        } finally {
            btnGuardar.innerHTML = textoOriginal;
            btnGuardar.disabled = false;
        }
    });

    // --- FUNCIÓN PARA ELIMINAR ---
    window.eliminarProducto = async function(id) {
        if (confirm('¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.')) {
            try {
                const { error } = await supabaseClient
                    .from('productos')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                
                alert('Producto eliminado con éxito.');
                cargarProductos(); // Recargar la tabla
            } catch (error) {
                console.error('Error al eliminar:', error);
                alert('Hubo un error al eliminar el producto.');
            }
        }
    };

    // --- FUNCIÓN PARA ABRIR EDICIÓN ---
    window.abrirModalEdicion = function(id) {
        // Buscar el producto en la lista que guardamos
        const producto = listaProductosAdmin.find(p => p.id === id);
        if (!producto) return;

        // Cambiar el título del modal y guardar el ID
        document.querySelector('#modal-producto h3').innerText = 'Editar Producto';
        idProductoEditando = producto.id;
        imagenesPrevias = producto.imagen_url || '';

        // Llenar el formulario con los datos actuales
        document.getElementById('prod-nombre').value = producto.nombre;
        document.getElementById('prod-marca').value = producto.marca;
        document.getElementById('prod-categoria').value = producto.categoria;
        document.getElementById('prod-precio').value = producto.precio;
        document.getElementById('prod-oferta').value = producto.precio_oferta || '';

        // Limpiar el input de imágenes por si quiere subir nuevas
        archivosProducto = [];
        actualizarMiniaturasAdmin();

        // Mostrar el modal
        modalProducto.classList.remove('hidden');
    };
});