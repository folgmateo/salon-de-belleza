# Activar citas, recordatorios y cancelaciones (gratis, con tu cuenta de Google)

El backend corre en Google Apps Script: guarda las citas en una hoja de cálculo,
te avisa a tu correo por cada cita o cancelación, y envía el recordatorio al cliente un día antes.

1. Abre https://sheets.new (crea una hoja nueva).
2. Menú **Extensiones → Apps Script**. Borra lo que aparezca y pega todo el contenido de `backend/Code.gs`. Guarda.
3. En el editor, elige la función **instalar** y pulsa **Ejecutar**. Acepta los permisos (Gmail, Hojas y disparadores).
4. Pulsa **Implementar → Nueva implementación → Tipo: Aplicación web**.
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
   Copia la URL que termina en `/exec`.
5. Pega esa URL en `script.js`, dentro de `CONFIG.backend`, y sube el cambio a GitHub.

Notas:
- Los avisos llegan a `OWNER` en `Code.gs` (ya está configurado a mfolgar08@gmail.com).
- Si cambias el código, vuelve a implementar: **Implementar → Administrar implementaciones → Editar → Nueva versión**.
- Los recordatorios se revisan cada hora (disparador de `instalar`).
