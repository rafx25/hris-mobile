// base url of the project api, from .env
const API_URL = process.env.EXPO_PUBLIC_API_URL;

// token for POST requests after login, set from auth/routes
let csrfToken = "";

export function setCsrfToken(token) {
  csrfToken = token;
}

// Get request, returns json
export async function apiGet(path) {
  const res = await fetch(API_URL + path, { credentials: "include" });
  return res.json();
}

// POST request with json body, returns json
export async function apiPost(path, body) {
  const res = await fetch(API_URL + path, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// POST with a file, uses XMLHttpRequest because it can read the file from its uri
export function apiPostForm(path, form) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", API_URL + path);
    xhr.withCredentials = true;
    xhr.setRequestHeader("X-CSRF-Token", csrfToken);
    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch (e) {
        reject(e);
      }
    };
    xhr.onerror = () => reject(new Error("Network request failed"));
    xhr.send(form);
  });
}
