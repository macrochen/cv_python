// This script runs in the child iframe

// For handling confirm callbacks
const confirmCallbacks = {};

// Listen for results from the parent
window.addEventListener('message', (event) => {
    // In a real app, you should validate event.origin here for security
    const { type, result, id } = event.data;

    if (type === 'confirmResult' && id && confirmCallbacks[id]) {
        confirmCallbacks[id](result);
        delete confirmCallbacks[id]; // Clean up
    }
});

function showToast(message) {
    window.parent.postMessage({
        type: 'showToast',
        payload: { message }
    }, '*'); // Use a specific origin in production
}

function showAlert(title, text) {
    window.parent.postMessage({
        type: 'showAlert',
        payload: { title, text }
    }, '*');
}

function showConfirm(title, text, callback) {
    const id = Date.now() + Math.random(); // Simple unique ID
    confirmCallbacks[id] = callback;

    window.parent.postMessage({
        type: 'showConfirm',
        payload: { title, text, id }
    }, '*');
}