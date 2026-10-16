document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-reparacion');
    const inputFotos = document.getElementById('fotos');
    const previewContenedor = document.getElementById('preview-fotos');

   // Variable global para guardar los archivos válidos
    let archivosValidos = [];

    // LÓGICA PARA DRAG & DROP (Arrastrar y soltar)
    const dropZone = document.querySelector('.border-dashed');

    // Prevenir el comportamiento por defecto del navegador al arrastrar
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Efectos visuales al pasar el archivo por encima
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('bg-brand-50', 'border-brand-500');
        });
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('bg-brand-50', 'border-brand-500');
        });
    });

    // Manejar los archivos al soltarlos
    dropZone.addEventListener('drop', (e) => {
        const archivosSoltados = Array.from(e.dataTransfer.files);
        
        // Solo procesamos si son imágenes (por si arrastra desde la web por error)
        const imagenesSoltadas = archivosSoltados.filter(file => file.type.startsWith('image/'));

        if (imagenesSoltadas.length > 0) {
            procesarNuevosArchivos(imagenesSoltadas);
        }
    });

    // 1. LÓGICA PARA MOSTRAR MINIATURAS, ACUMULAR Y FILTRAR DUPLICADOS
    inputFotos.addEventListener('change', function() {
        procesarNuevosArchivos(Array.from(this.files));
        this.value = ''; // Resetear el input
    });

    // Función unificada para procesar archivos (desde clic o desde drop)
    function procesarNuevosArchivos(archivosNuevos) {
        archivosNuevos.forEach(archivo => {
            const yaExiste = archivosValidos.some(f => f.name === archivo.name && f.size === archivo.size);

            if (!yaExiste && archivosValidos.length < 3) {
                archivosValidos.push(archivo);
            }
        });
        actualizarMiniaturas();
    }

    // Función que se encarga de dibujar las fotos en pantalla y añadir el botón de eliminar
    function actualizarMiniaturas() {
        previewContenedor.innerHTML = ''; // Limpiamos la vista previa

        if (archivosValidos.length > 0) {
            previewContenedor.classList.remove('hidden');
            
            // Usamos 'index' para saber exactamente qué foto borrar
            archivosValidos.forEach((archivo, index) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    
                    // 1. Creamos un contenedor (relative) para la imagen y el botón
                    const divWrapper = document.createElement('div');
                    divWrapper.className = 'relative inline-block mr-3 mt-2';

                    // 2. Creamos la imagen
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'w-16 h-16 object-cover rounded-lg border border-gray-200 shadow-sm';
                    
                    // 3. Creamos el botón de eliminar (X)
                    const btnEliminar = document.createElement('button');
                    // Usamos el ícono de X de FontAwesome
                    btnEliminar.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                    btnEliminar.className = 'absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-red-600 transition-colors shadow-md cursor-pointer';
                    btnEliminar.type = 'button'; // Muy importante para que no intente enviar el formulario al hacer clic

                    // 4. Lógica para borrar la foto al hacer clic en la X
                    btnEliminar.addEventListener('click', () => {
                        // Quitamos 1 elemento del array en la posición 'index'
                        archivosValidos.splice(index, 1); 
                        
                        // Volvemos a ejecutar la función para que se redibujen las miniaturas sin la foto borrada
                        actualizarMiniaturas(); 
                    });

                    // 5. Metemos la imagen y el botón dentro del contenedor, y el contenedor a la vista previa
                    divWrapper.appendChild(img);
                    divWrapper.appendChild(btnEliminar);
                    previewContenedor.appendChild(divWrapper);
                }
                reader.readAsDataURL(archivo);
            });
        } else {
            // Si borramos todas las fotos, ocultamos el contenedor
            previewContenedor.classList.add('hidden');
        }
    }

    // 2. LÓGICA DE ENVÍO Y GENERACIÓN DEL MENSAJE DE WHATSAPP
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Evita que la página se recargue

        // Cambiar el texto del botón a "Cargando..."
        const btnSubmit = form.querySelector('button[type="submit"]');
        const originalBtnHTML = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xl"></i> Procesando...';
        btnSubmit.disabled = true;

        // Capturar los datos del formulario
        const nombre = document.getElementById('nombre').value;
        const whatsapp = document.getElementById('whatsapp').value;
        const marca = document.getElementById('marca').value;
        const modelo = document.getElementById('modelo').value;
        const problema = document.getElementById('problema').value;
        const descripcion = document.getElementById('descripcion').value;
        const archivos = inputFotos.files;

        let linksDeFotos = [];

        // 3. SUBIR FOTOS A LA NUBE (Cloudinary)
        // Nota: Para que esto funcione real, debes crearte una cuenta gratuita en Cloudinary
        // y obtener tu 'cloud_name' y un 'upload_preset' (sin firma).
        const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dtjub2iks/image/upload';
        const UPLOAD_PRESET = 'paracell_fotos';

        try {
            // CAMBIAR AQUÍ: Usar 'archivosValidos' en lugar de 'archivos'
            if (archivosValidos.length > 0) {
                
                // CAMBIAR AQUÍ TAMBIÉN: 'archivosValidos.length' y 'archivosValidos[i]'
                for (let i = 0; i < archivosValidos.length; i++) {
                    const formData = new FormData();
                    formData.append('file', archivosValidos[i]);
                    formData.append('upload_preset', UPLOAD_PRESET);

                    const respuesta = await fetch(CLOUDINARY_URL, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await respuesta.json();
                    
                    if (data.secure_url) {
                        linksDeFotos.push(data.secure_url);
                    }
                }
            }

            // 4. CONSTRUIR EL MENSAJE DE WHATSAPP
            let mensaje = `*NUEVA SOLICITUD DE PRESUPUESTO* 🛠️\n\n`;
            mensaje += `*Nombre:* ${nombre}\n`;
            mensaje += `*WhatsApp:* ${whatsapp}\n`;
            mensaje += `*Equipo:* ${marca} ${modelo}\n`;
            mensaje += `*Problema:* ${problema}\n`;
            
            if (descripcion) {
                mensaje += `*Descripción:* ${descripcion}\n`;
            }

            if (linksDeFotos.length > 0) {
                mensaje += `\n*Fotos adjuntas:*\n`;
                linksDeFotos.forEach((link, index) => {
                    mensaje += `📷 Foto ${index + 1}: ${link}\n`;
                });
            }

            // Codificar el mensaje para la URL
            const mensajeCodificado = encodeURIComponent(mensaje);
            
            // Reemplaza esto con el número de WhatsApp de tu negocio
            const numeroDestino = '595971107048'; // Formato: código de país + número sin espacios ni símbolos
            
            // Redirigir al WhatsApp
            window.open(`https://wa.me/${numeroDestino}?text=${mensajeCodificado}`, '_blank');

            // 5. LIMPIAR EL FORMULARIO Y LAS FOTOS DESPUÉS DEL ENVÍO
            form.reset(); // Borra todos los campos de texto y selects
            archivosValidos = []; // Vacía nuestra lista de fotos en la memoria
            actualizarMiniaturas(); // Borra las miniaturas de la pantalla

        } catch (error) {
            console.error('Error al subir las imágenes:', error);
            alert('Hubo un error al procesar las imágenes. Por favor, intentá de nuevo.');
        } finally {
            // Restaurar el botón
            btnSubmit.innerHTML = originalBtnHTML;
            btnSubmit.disabled = false;
        }
    });
});